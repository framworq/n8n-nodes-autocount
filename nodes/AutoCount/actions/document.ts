import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { DocumentType } from '../documents';
import {
	autoCountApiRequest,
	autoCountApiRequestAllItems,
	compact,
	getCreatedKey,
	parseJsonParameter,
	pick,
	toAutoCountDateTime,
	todayInBookTime,
} from '../GenericFunctions';
import { DETAIL_INPUT_FIELDS, PAYMENT_DETAIL_INPUT_FIELDS } from '../models';
import type { ExecutionCache } from './cache';
import { getDefaultLocation, getHomeCurrency, getParty, getPaymentMethod } from './cache';

const DATE_HEADER_FIELDS = ['docDate', 'taxDate', 'orgDocDate'];

/** Header keys that live somewhere other than `master.<key>` */
function headerApiKey(doc: DocumentType, key: string): string | undefined {
	if (key === 'location') return doc.locationField;
	if (key === 'partyName') return doc.party === 'creditor' ? 'creditorName' : 'debtorName';
	if (key === 'partyCode') return doc.party === 'creditor' ? 'creditorCode' : 'debtorCode';
	if (key === 'chequeNo' || key === 'headerJson') return undefined;
	return key;
}

function buildHeader(this: IExecuteFunctions, doc: DocumentType, fields: IDataObject, i: number): IDataObject {
	const master: IDataObject = {};
	for (const [key, value] of Object.entries(fields)) {
		const apiKey = headerApiKey(doc, key);
		if (!apiKey || value === '' || value === undefined || value === null) continue;
		master[apiKey] = DATE_HEADER_FIELDS.includes(key) ? toAutoCountDateTime(value) : value;
	}
	if (fields.headerJson !== undefined) {
		let extra: unknown;
		try {
			extra = parseJsonParameter(fields.headerJson);
		} catch {
			throw new NodeOperationError(this.getNode(), 'Other Header Fields (JSON) is not valid JSON', { itemIndex: i });
		}
		if (extra !== undefined && (typeof extra !== 'object' || Array.isArray(extra) || extra === null)) {
			throw new NodeOperationError(this.getNode(), 'Other Header Fields (JSON) must be a JSON object', { itemIndex: i });
		}
		Object.assign(master, extra);
	}
	return master;
}

function getLines(this: IExecuteFunctions, doc: DocumentType, i: number): IDataObject[] {
	const mode = this.getNodeParameter('linesMode', i) as string;
	let lines: IDataObject[];
	if (mode === 'json') {
		let parsed: unknown;
		try {
			parsed = parseJsonParameter(this.getNodeParameter('linesJson', i));
		} catch {
			throw new NodeOperationError(this.getNode(), 'Lines (JSON) is not valid JSON', { itemIndex: i });
		}
		if (!Array.isArray(parsed) || parsed.some((line) => typeof line !== 'object' || line === null)) {
			throw new NodeOperationError(this.getNode(), 'Lines (JSON) must be an array of objects', { itemIndex: i });
		}
		lines = parsed as IDataObject[];
	} else {
		const collection = this.getNodeParameter('lines', i, {}) as { line?: IDataObject[] };
		lines = (collection.line ?? []).map((line) => compact(line));
	}

	if (lines.length === 0) {
		throw new NodeOperationError(this.getNode(), 'Add at least one line', { itemIndex: i });
	}
	if (doc.lineAccountRequired) {
		const missing = lines.findIndex((line) => !line.accNo);
		if (missing !== -1) {
			throw new NodeOperationError(this.getNode(), `Line ${missing + 1} has no account`, {
				itemIndex: i,
				description: `Every ${doc.name.toLowerCase()} line needs a GL account (accNo), e.g. 500-0000 for sales.`,
			});
		}
	}
	if (doc.lineKind === 'stockAdjustment' || doc.lineKind === 'stockTransfer') {
		const missing = lines.findIndex((line) => !line.stockCode);
		if (missing !== -1) {
			throw new NodeOperationError(this.getNode(), `Line ${missing + 1} has no product`, { itemIndex: i });
		}
	}
	return lines;
}

function lineTotal(lines: IDataObject[]): number {
	const total = lines.reduce((sum, line) => sum + Number(line.amount ?? 0), 0);
	return Math.round(total * 100) / 100;
}

/** Copy name, credit term and contact details from the customer / supplier record when not given. */
async function fillParty(
	this: IExecuteFunctions,
	doc: DocumentType,
	master: IDataObject,
	cache: ExecutionCache,
	i: number,
): Promise<void> {
	if (!doc.party) return;
	const codeKey = doc.party === 'creditor' ? 'creditorCode' : 'debtorCode';
	const nameKey = doc.party === 'creditor' ? 'creditorName' : 'debtorName';
	const code = master[codeKey] as string | undefined;
	if (code && (!master[nameKey] || !master.creditTerm)) {
		const party = await getParty.call(this, cache, doc.party, code);
		master[nameKey] ??= party.companyName;
		master.creditTerm ??= party.creditTerm;
		for (const key of ['address', 'attention', 'phone1']) {
			if (master[key] === undefined && party[key]) master[key] = party[key];
		}
		if (doc.party === 'debtor' && master.email === undefined && party.emailAddress) master.email = party.emailAddress;
	}
	if (!master[nameKey]) {
		throw new NodeOperationError(this.getNode(), `Choose a ${doc.party === 'creditor' ? 'supplier' : 'customer'}`, {
			itemIndex: i,
			description: 'Give a code, or for a quotation to a prospect, a name under Additional Fields.',
		});
	}
	master.creditTerm ??= 'C.O.D.';
}

/** Fill in what AutoCount requires on create but can be derived: party details, location, currency, e-Invoice flags. */
async function completeMaster(
	this: IExecuteFunctions,
	doc: DocumentType,
	master: IDataObject,
	lines: IDataObject[],
	cache: ExecutionCache,
	i: number,
): Promise<void> {
	await fillParty.call(this, doc, master, cache, i);

	if (doc.locationField && !master[doc.locationField]) {
		master[doc.locationField] = await getDefaultLocation.call(this, cache);
	}
	if (doc.lineKind === 'stockAdjustment') {
		const location = await getDefaultLocation.call(this, cache);
		for (const line of lines) line.location ??= location;
	}

	if (doc.lineKind === 'journal' || doc.lineKind === 'cashBook') {
		// Unlike trade documents, these are rejected unless the rates are given.
		const homeCurrency = await getHomeCurrency.call(this, cache);
		master.currencyCode ??= homeCurrency;
		if (master.currencyCode === homeCurrency) master.currencyRate ??= 1;
		if (master.currencyRate === undefined) {
			throw new NodeOperationError(this.getNode(), `Add a Currency Rate for ${String(master.currencyCode)}`, {
				itemIndex: i,
				description: `The rate converts ${String(master.currencyCode)} to ${homeCurrency}.`,
			});
		}
		master.toTaxCurrencyRate ??= master.currencyRate;
	}
	if (doc.eInvoice) {
		// Always explicit, so an omitted option can never trigger a MyInvois submission.
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		master.submitEInvoice = options.submitEInvoice === true;
		master.submitConsolidatedEInvoice = options.submitConsolidatedEInvoice === true;
	}
}

function simplifyDocument(response: IDataObject): IDataObject {
	if (!response || typeof response.master !== 'object') return response;
	const { master, ...rest } = response;
	return { ...(master as IDataObject), ...rest };
}

async function getDocument(this: IExecuteFunctions, doc: DocumentType, docNo: string): Promise<IDataObject> {
	return (await autoCountApiRequest.call(this, 'GET', `/${doc.path}`, undefined, { docNo })) as IDataObject;
}

function buildListingFilter(doc: DocumentType, filters: IDataObject): IDataObject {
	const filter: IDataObject = {};
	const range = (key: string, from: unknown, to: unknown) => {
		const value = compact({ from: toAutoCountDateTime(from), to: toAutoCountDateTime(to) });
		if (Object.keys(value).length) filter[key] = value;
	};
	const list = (key: string, value: unknown) => {
		const values = String(value ?? '')
			.split(',')
			.map((entry) => entry.trim())
			.filter(Boolean);
		if (values.length) filter[key] = { multiSelect: values };
	};

	range('date', filters.dateFrom, filters.dateTo);
	range('createdDate', filters.createdFrom, filters.createdTo);
	range('lastModifiedDate', filters.lastModifiedFrom, filters.lastModifiedTo);
	list('docNo', filters.docNos);
	if (doc.party) list(doc.party === 'creditor' ? 'creditorCode' : 'debtorCode', filters.partyCodes);
	if (doc.filterSalesAgent) list('salesAgent', filters.salesAgents);
	return filter;
}

export async function executeDocument(
	this: IExecuteFunctions,
	doc: DocumentType,
	operation: string,
	i: number,
	cache: ExecutionCache,
): Promise<IDataObject | IDataObject[]> {
	const endpoint = `/${doc.path}`;
	const simplify = ['create', 'get', 'getAll', 'update'].includes(operation)
		? (this.getNodeParameter('simplify', i, true) as boolean)
		: false;
	const output = (response: IDataObject) => (simplify ? simplifyDocument(response) : response);

	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const limit = returnAll ? undefined : (this.getNodeParameter('limit', i) as number);
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const body: IDataObject = { filter: buildListingFilter(doc, filters) };
		if (doc.lineKind === 'cashBook' && filters.cashBookType) body.docType = filters.cashBookType;
		const rows = await autoCountApiRequestAllItems.call(this, 'POST', `${endpoint}/listing`, { body, pageIn: 'body', limit });
		return rows.map(output);
	}

	if (operation === 'create') {
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const lines = getLines.call(this, doc, i);

		const master = buildHeader.call(this, doc, additionalFields, i);
		master.docDate = toAutoCountDateTime(this.getNodeParameter('docDate', i, '')) ?? `${todayInBookTime()}T00:00:00`;
		if (doc.party) {
			const partyCode = this.getNodeParameter('partyCode', i, '') as string;
			if (partyCode) master[headerApiKey(doc, 'partyCode') as string] = partyCode;
		}
		if (doc.lineKind === 'journal') master.journalType = this.getNodeParameter('journalType', i);
		if (doc.lineKind === 'stockTransfer') {
			master.fromLocation = this.getNodeParameter('fromLocation', i);
			master.toLocation = this.getNodeParameter('toLocation', i);
		}

		const body: IDataObject = { master, details: lines, saveApprove: options.saveApprove ?? true };
		if (doc.lineKind === 'cashBook') {
			const paymentMethod = this.getNodeParameter('paymentMethod', i) as string;
			master.docType = this.getNodeParameter('cashBookType', i);
			master.journalType ??= (await getPaymentMethod.call(this, cache, paymentMethod)).journalType;
			body.paymentDetails = [
				compact({ paymentMethod, paymentAmt: lineTotal(lines), chequeNo: additionalFields.chequeNo as string }),
			];
		}
		await completeMaster.call(this, doc, master, lines, cache, i);

		const response = (await autoCountApiRequest.call(this, 'POST', endpoint, body, {}, { returnFullResponse: true })) as {
			headers?: IDataObject;
		};
		const docNo = getCreatedKey(response.headers);
		if (!docNo) return { success: true };
		return output(await getDocument.call(this, doc, docNo));
	}

	const docNo = String(this.getNodeParameter('docNo', i)).trim();

	if (operation === 'get') {
		return output(await getDocument.call(this, doc, docNo));
	}

	if (operation === 'update') {
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		const existing = await getDocument.call(this, doc, docNo);
		const master = buildHeader.call(this, doc, updateFields, i);

		const linesMode = this.getNodeParameter('linesMode', i) as string;
		const existingLines = (existing.details as IDataObject[] | undefined) ?? [];
		const lines =
			linesMode === 'keep'
				? existingLines.map((line) => pick(line, DETAIL_INPUT_FIELDS[doc.value] ?? []))
				: getLines.call(this, doc, i);

		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const body: IDataObject = { master, details: lines };
		if (options.saveApprove !== undefined) body.saveApprove = options.saveApprove;
		if (doc.eInvoice) {
			if (options.submitEInvoice !== undefined) master.submitEInvoice = options.submitEInvoice;
			if (options.submitConsolidatedEInvoice !== undefined) {
				master.submitConsolidatedEInvoice = options.submitConsolidatedEInvoice;
			}
		}
		if (doc.lineKind === 'cashBook') {
			const payments = ((existing.paymentDetails as IDataObject[] | undefined) ?? []).map((payment) =>
				pick(payment, PAYMENT_DETAIL_INPUT_FIELDS),
			);
			if (linesMode !== 'keep' && payments.length === 1) payments[0].paymentAmt = lineTotal(lines);
			if (updateFields.chequeNo && payments.length === 1) payments[0].chequeNo = updateFields.chequeNo;
			body.paymentDetails = payments;
		}
		if (doc.party && master[headerApiKey(doc, 'partyCode') as string]) {
			await fillParty.call(this, doc, master, cache, i);
		}

		await autoCountApiRequest.call(this, 'PUT', endpoint, body, { docNo });
		return output(await getDocument.call(this, doc, docNo));
	}

	if (operation === 'delete') {
		await autoCountApiRequest.call(this, 'DELETE', endpoint, undefined, { docNo });
		return { deleted: true, docNo };
	}

	if (operation === 'void') {
		const voidReason = this.getNodeParameter('voidReason', i) as string;
		await autoCountApiRequest.call(this, 'POST', `${endpoint}/void`, { voidReason }, { docNo });
		return simplifyDocument(await getDocument.call(this, doc, docNo));
	}

	if (operation === 'getKnockOff') {
		const response = await autoCountApiRequest.call(this, 'GET', `${endpoint}/knockoffdetails`, undefined, { docNo });
		return Array.isArray(response) ? (response as IDataObject[]) : (response as IDataObject);
	}

	if (operation === 'updateStatus') {
		const documentStatus = this.getNodeParameter('documentStatus', i) as number;
		const body: IDataObject = { documentStatus };
		if (doc.value === 'quotation' && documentStatus === 2) {
			body.lostReason = this.getNodeParameter('lostReason', i, '') as string;
		}
		await autoCountApiRequest.call(this, 'PUT', `${endpoint}/updatestatus`, body, { docNo });
		return simplifyDocument(await getDocument.call(this, doc, docNo));
	}

	throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported for ${doc.name}`, {
		itemIndex: i,
	});
}
