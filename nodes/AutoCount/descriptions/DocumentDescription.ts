import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import type { DocumentType } from '../documents';
import { DOCUMENT_TYPES } from '../documents';
import { DETAIL_INPUT_FIELDS } from '../models';

type FieldDef = Omit<INodeProperties, 'displayOptions'>;

const byDisplayName = (a: { displayName: string }, b: { displayName: string }) =>
	a.displayName.localeCompare(b.displayName);

// ----------------------------------------------------------------------------------------------
// Header (master) fields offered under "Additional Fields" / "Update Fields"
// ----------------------------------------------------------------------------------------------

const text = (name: string, displayName: string, description: string): FieldDef => ({
	displayName,
	name,
	type: 'string',
	default: '',
	description,
});

export const HEADER_FIELDS: Record<string, FieldDef> = {
	address: text('address', 'Address', 'Billing address printed on the document. Defaults to the address on the customer or supplier record.'),
	attention: text('attention', 'Attention', 'Contact person printed on the document'),
	authorisedBy: text('authorisedBy', 'Authorised By', 'Who authorised the transfer'),
	cc: text('cc', 'CC', 'People to copy on the quotation'),
	chequeNo: text('chequeNo', 'Cheque No.', 'Cheque or bank reference number for the payment'),
	creditTerm: text('creditTerm', 'Credit Term', 'Must match a credit term set up in AutoCount, e.g. C.O.D. Defaults to the credit term on the customer or supplier record.'),
	currencyCode: text('currencyCode', 'Currency Code', 'Defaults to the account book home currency'),
	currencyRate: {
		displayName: 'Currency Rate',
		name: 'currencyRate',
		type: 'number',
		typeOptions: { numberPrecision: 6 },
		default: 1,
		description: 'Exchange rate to the home currency, for foreign-currency documents',
	},
	dealWith: text('dealWith', 'Deal With', 'The payee (payment) or payer (receipt) name'),
	deliverAddress: text('deliverAddress', 'Delivery Address', 'Delivery address printed on the document'),
	deliverContact: text('deliverContact', 'Delivery Contact', 'Contact person at the delivery address'),
	deliverPhone1: text('deliverPhone1', 'Delivery Phone', 'Phone number at the delivery address'),
	deliveryTerm: text('deliveryTerm', 'Delivery Term', 'Delivery terms printed on the quotation'),
	description: text('description', 'Description', 'Short description of the document (up to 80 characters)'),
	docNo: text('docNo', 'Document No.', 'Leave empty to use the next number from the numbering format'),
	docNo2: text('docNo2', 'Document No. 2', 'Secondary reference number'),
	docNoFormatName: {
		displayName: 'Numbering Format Name or ID',
		name: 'docNoFormatName',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getDocNoFormats' },
		default: '',
		description:
			'Numbering format used when Document No. is empty. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	email: text('email', 'Email', 'Email address for the document'),
	inclusiveTax: {
		displayName: 'Prices Include Tax',
		name: 'inclusiveTax',
		type: 'boolean',
		default: false,
		description: 'Whether line prices already include tax',
	},
	isRoundAdj: {
		displayName: 'Rounding Adjustment',
		name: 'isRoundAdj',
		type: 'boolean',
		default: false,
		description: 'Whether to round the total to the nearest 5 sen',
	},
	location: {
		displayName: 'Location Name or ID',
		name: 'location',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getLocations' },
		default: '',
		description:
			'Stock location. Defaults to the default location of the account book. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	note: text('note', 'Note', 'Internal note'),
	orgDocDate: {
		displayName: 'Supplier Document Date',
		name: 'orgDocDate',
		type: 'dateTime',
		default: '',
		description: "Date on the supplier's own invoice",
	},
	ourInvoiceNo: text('ourInvoiceNo', 'Original Invoice No.', 'The sales invoice this credit note is for'),
	partyName: text('partyName', 'Customer Name', 'Name printed on the quotation. Required when no customer code is given.'),
	paymentTerm: text('paymentTerm', 'Payment Term', 'Payment terms printed on the quotation'),
	phone1: text('phone1', 'Phone', 'Phone number printed on the document'),
	reason: text('reason', 'Reason', 'Reason for the credit note, return or transfer'),
	ref: text('ref', 'Reference', 'Your reference, e.g. an order number from another system'),
	remark1: text('remark1', 'Remark 1', 'Free-text remark'),
	remark2: text('remark2', 'Remark 2', 'Free-text remark'),
	remark3: text('remark3', 'Remark 3', 'Free-text remark'),
	remark4: text('remark4', 'Remark 4', 'Free-text remark'),
	salesAgent: {
		displayName: 'Sales Agent Name or ID',
		name: 'salesAgent',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getSalesAgents' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	supplierCNNo: text('supplierCNNo', 'Supplier Credit Note No.', "The supplier's credit note number"),
	supplierInvoiceNo: text('supplierInvoiceNo', 'Supplier Invoice No.', "The supplier's own invoice number"),
	taxDate: {
		displayName: 'Tax Date',
		name: 'taxDate',
		type: 'dateTime',
		default: '',
		description: 'Date used for tax reporting, if different from the document date',
	},
	taxEntity: text('taxEntity', 'Tax Entity', 'E-Invoice tax entity (TIN record) for this document'),
	taxExemptionNo: text('taxExemptionNo', 'Tax Exemption No.', 'Sales tax exemption certificate number'),
	validity: text('validity', 'Validity', 'How long the quotation is valid, e.g. 30 days'),
	yourRef: text('yourRef', 'Your Reference', "The customer's reference for this quotation"),
};

// ----------------------------------------------------------------------------------------------
// Line (detail) fields, filtered per document by the fields its API accepts
// ----------------------------------------------------------------------------------------------

const LINE_FIELDS: FieldDef[] = [
	{
		displayName: 'Account Name or ID',
		name: 'accNo',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getAccounts' },
		default: '',
		description:
			'GL account for the line, e.g. 500-0000 Sales. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Product Name or ID',
		name: 'productCode',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getProducts' },
		default: '',
		description:
			'Optional. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Product Name or ID',
		name: 'stockCode',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getProducts' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Location Name or ID',
		name: 'location',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getLocations' },
		default: '',
		description:
			'Defaults to the default location. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{ displayName: 'Description', name: 'description', type: 'string', default: '' },
	{
		displayName: 'Further Description',
		name: 'furtherDescription',
		type: 'string',
		typeOptions: { rows: 2 },
		default: '',
		description: 'Longer text printed under the line',
	},
	{
		displayName: 'Quantity',
		name: 'qty',
		type: 'number',
		typeOptions: { numberPrecision: 4 },
		default: 1,
		description: 'For stock adjustments, use a negative number to reduce stock',
	},
	{ displayName: 'Unit', name: 'unit', type: 'string', default: '', description: 'E.g. UNIT, PCS, KG.' },
	{
		displayName: 'Unit Price',
		name: 'unitPrice',
		type: 'number',
		typeOptions: { numberPrecision: 4 },
		default: 0,
	},
	{
		displayName: 'Unit Cost',
		name: 'unitCost',
		type: 'number',
		typeOptions: { numberPrecision: 4 },
		default: 0,
	},
	{
		displayName: 'Discount',
		name: 'discount',
		type: 'string',
		default: '',
		description: 'An amount (e.g. 5) or a percentage (e.g. 10%).',
	},
	{
		displayName: 'Debit',
		name: 'dr',
		type: 'number',
		typeOptions: { numberPrecision: 2 },
		default: 0,
	},
	{
		displayName: 'Credit',
		name: 'cr',
		type: 'number',
		typeOptions: { numberPrecision: 2 },
		default: 0,
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		typeOptions: { numberPrecision: 2 },
		default: 0,
	},
	{ displayName: 'Reference', name: 'ref', type: 'string', default: '' },
	{ displayName: 'Tax Code', name: 'taxCode', type: 'string', default: '', description: 'E.g. SR-8 or ST-10. Leave empty for no tax.' },
	{
		displayName: 'Department Name or ID',
		name: 'deptNo',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getDepartments' },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Classification Code',
		name: 'classificationCode',
		type: 'string',
		default: '',
		description: 'E-Invoice classification code, e.g. 022 (others)',
	},
];

export function getLineFieldNames(doc: DocumentType): string[] {
	const accepted = DETAIL_INPUT_FIELDS[doc.value] ?? [];
	return LINE_FIELDS.map((field) => field.name).filter((name) => accepted.includes(name));
}

function lineFieldsFor(doc: DocumentType): INodeProperties[] {
	const accepted = getLineFieldNames(doc);
	return LINE_FIELDS.filter((field) => accepted.includes(field.name));
}

const headerJsonField: INodeProperties = {
	displayName: 'Other Header Fields (JSON)',
	name: 'headerJson',
	type: 'json',
	default: '{}',
	description: 'Any other header field the AutoCount API accepts, as a JSON object. Overrides the fields above.',
};

// ----------------------------------------------------------------------------------------------
// Per-document properties
// ----------------------------------------------------------------------------------------------

function operationsFor(doc: DocumentType): INodePropertyOptions[] {
	const lower = doc.name.toLowerCase();
	const article = /^[aeiou]/i.test(doc.name) ? 'an' : 'a';
	const options: INodePropertyOptions[] = [
		{ name: 'Create', value: 'create', action: `Create ${article} ${lower}`, description: `Create ${article} ${lower}` },
		{
			name: 'Delete',
			value: 'delete',
			action: `Delete ${article} ${lower}`,
			description: `Permanently delete ${article} ${lower}. Consider Void instead, which keeps an audit trail.`,
		},
		{ name: 'Get', value: 'get', action: `Get ${article} ${lower}`, description: `Get ${article} ${lower} by document number` },
		{ name: 'Get Many', value: 'getAll', action: `Get many ${lower}s`, description: `List ${lower}s, with optional filters` },
		{ name: 'Update', value: 'update', action: `Update ${article} ${lower}`, description: `Update ${article} ${lower}` },
		{ name: 'Void', value: 'void', action: `Void ${article} ${lower}`, description: `Cancel ${article} ${lower} and keep it on record` },
	];
	if (doc.knockOff) {
		options.push({
			name: 'Get Knock-Off Details',
			value: 'getKnockOff',
			action: `Get knock-off details of ${article} ${lower}`,
			description: 'See which payments or documents this one has been knocked off against',
		});
	}
	if (doc.statuses) {
		options.push({
			name: 'Update Status',
			value: 'updateStatus',
			action: `Update the status of ${article} ${lower}`,
			description: `Mark ${article} ${lower} as ${doc.statuses.map((status) => status.name).join(', ')}`,
		});
	}
	return options.sort((a, b) => a.name.localeCompare(b.name));
}

function propertiesFor(doc: DocumentType): INodeProperties[] {
	const resource = [doc.value];
	const show = (operation: string[], extra: Record<string, Array<string | number | boolean>> = {}) => ({
		show: { resource, operation, ...extra },
	});
	const partyLabel = doc.party === 'debtor' ? 'Customer' : 'Supplier';
	const lineFields = lineFieldsFor(doc);
	const headerFields: INodeProperties[] = doc.headerFields
		.map((key) => HEADER_FIELDS[key])
		.map((field) => (field.name === 'partyName' ? { ...field, displayName: `${partyLabel} Name` } : field));

	const properties: INodeProperties[] = [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource } },
			options: operationsFor(doc),
			default: 'create',
		},
		{
			displayName: 'Document No.',
			name: 'docNo',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'I-000001',
			displayOptions: show(['get', 'update', 'delete', 'void', 'getKnockOff', 'updateStatus']),
			description: `The ${doc.name.toLowerCase()} number`,
		},
	];

	// ---- create: required header values ----
	if (doc.party) {
		properties.push({
			displayName: `${partyLabel} Name or ID`,
			name: 'partyCode',
			type: 'options',
			typeOptions: { loadOptionsMethod: doc.party === 'debtor' ? 'getDebtors' : 'getCreditors' },
			required: doc.partyRequired,
			default: '',
			displayOptions: show(['create']),
			description: `The ${partyLabel.toLowerCase()} account code, e.g. ${doc.party === 'debtor' ? '300-A001' : '400-A001'}. Name, credit term and address are filled in from the ${partyLabel.toLowerCase()} record. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.`,
		});
	}
	if (doc.lineKind === 'cashBook') {
		properties.push(
			{
				displayName: 'Type',
				name: 'cashBookType',
				type: 'options',
				required: true,
				default: 'PV',
				displayOptions: show(['create']),
				options: [
					{ name: 'Payment Voucher (Money Out)', value: 'PV' },
					{ name: 'Official Receipt (Money In)', value: 'OR' },
				],
			},
			{
				displayName: 'Payment Method Name or ID',
				name: 'paymentMethod',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getPaymentMethods' },
				required: true,
				default: '',
				displayOptions: show(['create']),
				description:
					'Bank or cash account the money moves through, e.g. BANK or CASH. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		);
	}
	if (doc.lineKind === 'journal') {
		properties.push({
			displayName: 'Journal Type',
			name: 'journalType',
			type: 'string',
			required: true,
			default: 'GENERAL',
			displayOptions: show(['create']),
			description: 'Journal type code as set up in AutoCount, e.g. GENERAL',
		});
	}
	if (doc.lineKind === 'stockTransfer') {
		for (const [name, displayName] of [
			['fromLocation', 'From Location Name or ID'],
			['toLocation', 'To Location Name or ID'],
		]) {
			properties.push({
				displayName,
				name,
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getLocations' },
				required: true,
				default: '',
				displayOptions: show(['create']),
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			});
		}
	}
	properties.push({
		displayName: 'Document Date',
		name: 'docDate',
		type: 'dateTime',
		default: '',
		displayOptions: show(['create']),
		description: 'Defaults to today (Malaysia time)',
	});

	// ---- create / update: lines ----
	properties.push(
		{
			displayName: 'Lines',
			name: 'linesMode',
			type: 'options',
			noDataExpression: true,
			default: 'define',
			displayOptions: show(['create']),
			options: [
				{ name: 'Define Below', value: 'define', description: 'Add each line in the node' },
				{ name: 'From JSON', value: 'json', description: 'Pass an array of lines, e.g. mapped from a previous node' },
			],
		},
		{
			displayName: 'Lines',
			name: 'linesMode',
			type: 'options',
			noDataExpression: true,
			default: 'keep',
			displayOptions: show(['update']),
			options: [
				{ name: 'Keep Existing Lines', value: 'keep', description: 'Only change header fields' },
				{ name: 'Replace With Lines Defined Below', value: 'define' },
				{ name: 'Replace With Lines From JSON', value: 'json' },
			],
			description: 'AutoCount replaces all lines on update, so existing lines are re-sent unless you replace them',
		},
		{
			displayName: 'Line Items',
			name: 'lines',
			type: 'fixedCollection',
			typeOptions: { multipleValues: true, sortable: true },
			placeholder: 'Add Line',
			default: {},
			displayOptions: show(['create', 'update'], { linesMode: ['define'] }),
			options: [{ displayName: 'Line', name: 'line', values: lineFields }],
		},
		{
			displayName: 'Lines (JSON)',
			name: 'linesJson',
			type: 'json',
			default: `[\n  ${JSON.stringify(
				Object.fromEntries(lineFields.slice(0, 4).map((field) => [field.name, field.default])),
			)}\n]`,
			displayOptions: show(['create', 'update'], { linesMode: ['json'] }),
			description: `Array of line objects using AutoCount field names: ${getLineFieldNames(doc).join(', ')}, or any other field the API accepts`,
		},
	);

	// ---- create / update: header fields ----
	const updateOptions: INodeProperties[] = [
		{ displayName: 'Document Date', name: 'docDate', type: 'dateTime', default: '' },
		...headerFields.filter((field) => !['docNo', 'docNoFormatName', 'partyName'].includes(field.name)),
		headerJsonField,
	];
	if (doc.party) {
		updateOptions.push(
			{
				displayName: `${partyLabel} Code`,
				name: 'partyCode',
				type: 'string',
				default: '',
				description: `Move the document to another ${partyLabel.toLowerCase()}`,
			},
			{ ...HEADER_FIELDS.partyName, displayName: `${partyLabel} Name` },
		);
	}
	properties.push(
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: show(['create']),
			options: [
				...headerFields,
				headerJsonField,
			].sort(byDisplayName),
		},
		{
			displayName: 'Update Fields',
			name: 'updateFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: show(['update']),
			options: updateOptions.sort(byDisplayName),
		},
	);

	// ---- create / update: options ----
	const createOptions: INodeProperties[] = [
		{
			displayName: 'Save and Approve',
			name: 'saveApprove',
			type: 'boolean',
			default: true,
			description:
				'Whether to approve the document on save. Turn off to leave it for approval, if approval is enabled in the account book.',
		},
	];
	if (doc.eInvoice) {
		createOptions.push(
			{
				displayName: 'Submit e-Invoice',
				name: 'submitEInvoice',
				type: 'boolean',
				default: false,
				description: 'Whether to submit this document to MyInvois (LHDN) as an e-Invoice',
			},
			{
				displayName: 'Submit as Consolidated e-Invoice',
				name: 'submitConsolidatedEInvoice',
				type: 'boolean',
				default: false,
				description: 'Whether to include this document in the monthly consolidated e-Invoice instead',
			},
		);
	}
	properties.push({
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(['create', 'update']),
		options: createOptions.sort(byDisplayName),
	});

	// ---- void ----
	properties.push({
		displayName: 'Void Reason',
		name: 'voidReason',
		type: 'string',
		required: true,
		default: '',
		displayOptions: show(['void']),
		description: 'Why the document is being voided (kept on record)',
	});

	// ---- update status ----
	if (doc.statuses) {
		properties.push({
			displayName: 'Status',
			name: 'documentStatus',
			type: 'options',
			required: true,
			default: 0,
			displayOptions: show(['updateStatus']),
			options: doc.statuses.map((status) => ({ name: status.name, value: status.value, description: status.description })),
		});
		if (doc.value === 'quotation') {
			properties.push({
				displayName: 'Lost Reason',
				name: 'lostReason',
				type: 'string',
				default: '',
				displayOptions: show(['updateStatus'], { documentStatus: [2] }),
			});
		}
	}

	// ---- get many ----
	const filters: INodeProperties[] = [
		{ displayName: 'Document Date From', name: 'dateFrom', type: 'dateTime', default: '' },
		{ displayName: 'Document Date To', name: 'dateTo', type: 'dateTime', default: '' },
		{ displayName: 'Created From', name: 'createdFrom', type: 'dateTime', default: '' },
		{ displayName: 'Created To', name: 'createdTo', type: 'dateTime', default: '' },
		{ displayName: 'Last Modified From', name: 'lastModifiedFrom', type: 'dateTime', default: '' },
		{ displayName: 'Last Modified To', name: 'lastModifiedTo', type: 'dateTime', default: '' },
		{
			displayName: 'Document Numbers',
			name: 'docNos',
			type: 'string',
			default: '',
			description: 'Comma-separated list of document numbers',
		},
	];
	if (doc.party) {
		filters.push({
			displayName: `${partyLabel} Codes`,
			name: 'partyCodes',
			type: 'string',
			default: '',
			description: `Comma-separated list of ${partyLabel.toLowerCase()} codes`,
		});
	}
	if (doc.filterSalesAgent) {
		filters.push({
			displayName: 'Sales Agents',
			name: 'salesAgents',
			type: 'string',
			default: '',
			description: 'Comma-separated list of sales agent codes',
		});
	}
	if (doc.lineKind === 'cashBook') {
		filters.push({
			displayName: 'Type',
			name: 'cashBookType',
			type: 'options',
			default: '',
			options: [
				{ name: 'All', value: '' },
				{ name: 'Payment Voucher (Money Out)', value: 'PV' },
				{ name: 'Official Receipt (Money In)', value: 'OR' },
			],
		});
	}
	properties.push(
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			displayOptions: show(['getAll']),
			description: 'Whether to return all results or only up to a given limit',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 50,
			displayOptions: show(['getAll'], { returnAll: [false] }),
			description: 'Max number of results to return',
		},
		{
			displayName: 'Filters',
			name: 'filters',
			type: 'collection',
			placeholder: 'Add Filter',
			default: {},
			displayOptions: show(['getAll']),
			options: filters.sort(byDisplayName),
		},
		{
			displayName: 'Simplify',
			name: 'simplify',
			type: 'boolean',
			default: true,
			displayOptions: show(['create', 'get', 'getAll', 'update']),
			description: 'Whether to return the header fields at the top level with the lines under "details", instead of the raw { master, details } response',
		},
	);

	return properties;
}

export const documentResourceOptions: INodePropertyOptions[] = DOCUMENT_TYPES.map((doc) => ({
	name: doc.name,
	value: doc.value,
}));

export const documentProperties: INodeProperties[] = DOCUMENT_TYPES.flatMap(propertiesFor);
