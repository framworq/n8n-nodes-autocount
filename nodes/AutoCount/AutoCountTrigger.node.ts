import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { getDocumentType, DOCUMENT_TYPES } from './documents';
import { autoCountApiRequest, autoCountApiRequestAllItems, nowInBookTime } from './GenericFunctions';

interface PollState {
	/** Latest AutoCount timestamp seen (book time, as returned by the API) */
	cursor?: string;
	/** Documents already emitted at exactly `cursor`, since the API filter is inclusive */
	seenAtCursor?: string[];
}

function flatten(row: IDataObject): IDataObject {
	if (typeof row.master !== 'object' || row.master === null) return row;
	const { master, ...rest } = row;
	return { ...(master as IDataObject), ...rest };
}

export class AutoCountTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AutoCount Trigger',
		name: 'autoCountTrigger',
		icon: { light: 'file:autocount.svg', dark: 'file:autocount.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"] + ": " + $parameter["documentType"]}}',
		description: 'Starts the workflow when documents are created or changed in AutoCount Cloud Accounting',
		defaults: {
			name: 'AutoCount Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'autoCountApi', required: true }],
		properties: [
			{
				displayName: 'Document Type',
				name: 'documentType',
				type: 'options',
				required: true,
				default: 'invoice',
				options: DOCUMENT_TYPES.map((doc) => ({ name: doc.name, value: doc.value })).sort((a, b) =>
					a.name.localeCompare(b.name),
				),
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: 'created',
				options: [
					{ name: 'Created', value: 'created', description: 'Only new documents' },
					{
						name: 'Created or Updated',
						value: 'updated',
						description: 'New documents, and documents that were edited, voided or approved',
					},
				],
			},
			{
				displayName: 'Type',
				name: 'cashBookType',
				type: 'options',
				default: '',
				displayOptions: { show: { documentType: ['cashBookEntry'] } },
				options: [
					{ name: 'All', value: '' },
					{ name: 'Payment Voucher (Money Out)', value: 'PV' },
					{ name: 'Official Receipt (Money In)', value: 'OR' },
				],
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const doc = getDocumentType(this.getNodeParameter('documentType') as string);
		if (!doc) return null;
		const event = this.getNodeParameter('event') as string;
		const cashBookType = doc.lineKind === 'cashBook' ? (this.getNodeParameter('cashBookType', '') as string) : '';
		const filterKey = event === 'created' ? 'createdDate' : 'lastModifiedDate';
		const timestampKey = event === 'created' ? 'createdTimeStamp' : 'lastModified';
		const endpoint = `/${doc.path}/listing`;
		const docTypeFilter = cashBookType ? { docType: cashBookType } : {};

		const state = this.getWorkflowStaticData('node') as PollState;

		if (this.getMode() === 'manual') {
			// Test run: show the most recent document so the user can map its fields.
			const response = (await autoCountApiRequest.call(this, 'POST', endpoint, {
				page: 1,
				filter: {},
				...docTypeFilter,
			})) as { data?: IDataObject[] };
			const rows = (response.data ?? []).map(flatten);
			rows.sort((a, b) => String(b[timestampKey] ?? '').localeCompare(String(a[timestampKey] ?? '')));
			return rows.length ? [this.helpers.returnJsonArray(rows.slice(0, 1))] : null;
		}

		if (!state.cursor) {
			// First activation: start from now, so existing documents do not all fire at once.
			state.cursor = nowInBookTime();
			state.seenAtCursor = [];
			return null;
		}

		const cursor = state.cursor;
		const seen = new Set(state.seenAtCursor ?? []);
		const rows = (
			await autoCountApiRequestAllItems.call(this, 'POST', endpoint, {
				body: { filter: { [filterKey]: { from: cursor.slice(0, 19) } }, ...docTypeFilter },
				pageIn: 'body',
			})
		).map(flatten);

		const keyOf = (row: IDataObject) => `${String(row.docKey ?? row.docNo)}@${String(row[timestampKey])}`;
		const fresh = rows.filter((row) => {
			const timestamp = String(row[timestampKey] ?? '');
			return timestamp > cursor || (timestamp === cursor && !seen.has(keyOf(row)));
		});
		if (fresh.length === 0) return null;

		fresh.sort((a, b) => String(a[timestampKey]).localeCompare(String(b[timestampKey])));
		const latest = String(fresh[fresh.length - 1][timestampKey]);
		const atLatest = rows.filter((row) => String(row[timestampKey]) === latest).map(keyOf);
		state.seenAtCursor = latest === cursor ? [...seen, ...atLatest] : atLatest;
		state.cursor = latest;

		return [this.helpers.returnJsonArray(fresh)];
	}
}
