import type { INodeProperties } from 'n8n-workflow';

/** Customers (debtors) and suppliers (creditors) share one API shape, keyed by account code. */
export type ContactKind = 'debtor' | 'creditor';

const LABEL: Record<ContactKind, { name: string; example: string; parent: string }> = {
	debtor: { name: 'customer', example: '300-A001', parent: '300-0000' },
	creditor: { name: 'supplier', example: '400-A001', parent: '400-0000' },
};

const text = (name: string, displayName: string, description?: string): INodeProperties => ({
	displayName,
	name,
	type: 'string',
	default: '',
	...(description ? { description } : {}),
});

function contactFields(kind: ContactKind): INodeProperties[] {
	const { name, example, parent } = LABEL[kind];
	const fields: INodeProperties[] = [
		text('accNo', 'Account Code', `Leave empty to let AutoCount assign the next code, e.g. ${example}`),
		text('parentAccNo', 'Control Account', `Parent ${name} control account, e.g. ${parent}`),
		text('desc2', 'Second Name', 'Name in a second language'),
		text('registerNo', 'Business Registration No.', 'SSM or company registration number'),
		text('address', 'Address'),
		text('postCode', 'Post Code'),
		text('phone1', 'Phone'),
		text('phone2', 'Phone 2'),
		text('fax1', 'Fax'),
		text('emailAddress', 'Email'),
		text('webURL', 'Website'),
		text('attention', 'Attention', 'Contact person'),
		text('natureOfBusiness', 'Nature of Business'),
		text('areaCode', 'Area Code'),
		text('taxCode', 'Default Tax Code'),
		text('taxRegisterNo', 'SST Registration No.'),
		text('taxEntity', 'Tax Entity', 'E-Invoice tax entity (TIN record)'),
		text('note', 'Note'),
		{
			displayName: 'Active',
			name: 'isActive',
			type: 'boolean',
			default: true,
			description: `Whether the ${name} is active`,
		},
	];
	if (kind === 'debtor') {
		fields.push(
			text('deliverAddress', 'Delivery Address'),
			text('deliverPostCode', 'Delivery Post Code'),
			text('salesAgent', 'Sales Agent'),
			text('taxExemptionNo', 'Tax Exemption No.'),
			{
				displayName: 'Credit Limit',
				name: 'creditLimit',
				type: 'number',
				typeOptions: { numberPrecision: 2 },
				default: 0,
			},
		);
	}
	return fields.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

const LISTING_FIELDS: Record<ContactKind, string[]> = {
	debtor: [
		'AccNo', 'CompanyName', 'Desc2', 'RegisterNo', 'IsActive', 'Address', 'PostCode', 'Phone1', 'Phone2', 'Fax1',
		'DeliverAddress', 'DeliverPostCode', 'AreaCode', 'EmailAddress', 'WebURL', 'Attention', 'NatureOfBusiness',
		'SalesAgent', 'CurrencyCode', 'CreditTerm', 'TaxCode', 'TaxRegisterNo', 'TaxEntity', 'CreditLimit', 'Note',
	],
	creditor: [
		'AccNo', 'CompanyName', 'Desc2', 'RegisterNo', 'IsActive', 'Address', 'PostCode', 'Phone1', 'Phone2', 'Fax1',
		'AreaCode', 'EmailAddress', 'WebURL', 'Attention', 'NatureOfBusiness', 'CurrencyCode', 'CreditTerm', 'TaxCode',
		'TaxRegisterNo', 'TaxEntity', 'Note',
	],
};

export function contactDescription(kind: ContactKind): INodeProperties[] {
	const { name, example } = LABEL[kind];
	const resource = [kind];
	const show = (operation: string[], extra: Record<string, Array<string | boolean>> = {}) => ({
		show: { resource, operation, ...extra },
	});

	return [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource } },
			options: [
				{ name: 'Create', value: 'create', action: `Create a ${name}`, description: `Create a ${name}` },
				{ name: 'Delete', value: 'delete', action: `Delete a ${name}`, description: `Delete a ${name}` },
				{ name: 'Get', value: 'get', action: `Get a ${name}`, description: `Get a ${name} by account code` },
				{ name: 'Get Many', value: 'getAll', action: `Get many ${name}s`, description: `List ${name}s` },
				{ name: 'Update', value: 'update', action: `Update a ${name}`, description: `Update a ${name}` },
			],
			default: 'create',
		},
		{
			displayName: 'Account Code',
			name: 'code',
			type: 'string',
			required: true,
			default: '',
			placeholder: example,
			displayOptions: show(['get', 'update', 'delete']),
			description: `The ${name} account code`,
		},
		{
			displayName: 'Company Name',
			name: 'companyName',
			type: 'string',
			required: true,
			default: '',
			displayOptions: show(['create']),
		},
		{
			displayName: 'Credit Term',
			name: 'creditTerm',
			type: 'string',
			required: true,
			default: 'C.O.D.',
			displayOptions: show(['create']),
			description: 'A credit term that exists in AutoCount under Maintain Credit Term (C.O.D. by default).',
		},
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: show(['create']),
			options: [
				...contactFields(kind),
				text('currencyCode', 'Currency Code', 'Defaults to the account book home currency'),
			].sort((a, b) => a.displayName.localeCompare(b.displayName)),
		},
		{
			displayName: 'Update Fields',
			name: 'updateFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: show(['update']),
			options: [
				...contactFields(kind).filter((field) => field.name !== 'accNo'),
				text('companyName', 'Company Name'),
				text('creditTerm', 'Credit Term'),
				text('currencyCode', 'Currency Code'),
			].sort((a, b) => a.displayName.localeCompare(b.displayName)),
		},
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
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			displayOptions: show(['getAll']),
			options: [
				{
					displayName: 'Active Only',
					name: 'activeOnly',
					type: 'boolean',
					default: true,
					description: `Whether to return only active ${name}s`,
				},
				{
					displayName: 'Fields',
					name: 'fields',
					type: 'multiOptions',
					options: LISTING_FIELDS[kind].map((field) => ({ name: field, value: field })),
					default: [],
					description: 'Fields to return. By default AutoCount returns the code, name and currency.',
				},
			],
		},
	];
}
