import type { INodeProperties } from 'n8n-workflow';

/** Read-only reference lists. `path` is the listing endpoint; `method` POST ones take a JSON body. */
export const LOOKUPS: Record<string, { path: string; method: 'GET' | 'POST' }> = {
	account: { path: '/account/listing', method: 'POST' },
	area: { path: '/area/listing', method: 'GET' },
	department: { path: '/department/listing', method: 'GET' },
	docNoFormat: { path: '/docnoformat/listing', method: 'GET' },
	location: { path: '/location/listing', method: 'GET' },
	paymentMethod: { path: '/paymentmethod/listing', method: 'GET' },
	salesAgent: { path: '/salesagent/listing', method: 'GET' },
	taxEntity: { path: '/taxentity/listing', method: 'GET' },
};

const resource = ['lookup'];
const show = (extra: Record<string, Array<string | boolean>> = {}) => ({
	show: { resource, operation: ['getAll'], ...extra },
});

export const companyDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['company'] } },
		options: [
			{
				name: 'Get Profile',
				value: 'getProfile',
				action: 'Get the company profile',
				description: 'Get the company name, registration numbers, address and home currency of the account book',
			},
		],
		default: 'getProfile',
	},
];

export const lookupDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [{ name: 'Get Many', value: 'getAll', action: 'Get many lookup values', description: 'List a reference list' }],
		default: 'getAll',
	},
	{
		displayName: 'List',
		name: 'list',
		type: 'options',
		required: true,
		default: 'account',
		displayOptions: show(),
		options: [
			{ name: 'Area', value: 'area' },
			{ name: 'Chart of Accounts', value: 'account' },
			{ name: 'Department', value: 'department' },
			{ name: 'Location', value: 'location' },
			{ name: 'Numbering Format', value: 'docNoFormat' },
			{ name: 'Payment Method', value: 'paymentMethod' },
			{ name: 'Sales Agent', value: 'salesAgent' },
			{ name: 'Tax Entity', value: 'taxEntity', description: 'E-Invoice tax entities (TIN records)' },
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: show(),
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: show({ returnAll: [false] }),
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show({ list: ['account'] }),
		options: [
			{
				displayName: 'Postable Accounts Only',
				name: 'leafOnly',
				type: 'boolean',
				default: true,
				description: 'Whether to return only accounts you can post to, without their parent (group) accounts',
			},
			{
				displayName: 'Search',
				name: 'searchText',
				type: 'string',
				default: '',
				description: 'Only return accounts whose code or description contains this text',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show({ list: ['docNoFormat'] }),
		options: [
			{
				displayName: 'Document Type',
				name: 'docType',
				type: 'string',
				default: '',
				description: 'Only formats for this document type code, e.g. IV, CN, PI, PV, OR, JE',
			},
		],
	},
];
