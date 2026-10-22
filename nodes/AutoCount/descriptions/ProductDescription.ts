import type { INodeProperties } from 'n8n-workflow';

const resource = ['product'];
const show = (operation: string[], extra: Record<string, Array<string | boolean>> = {}) => ({
	show: { resource, operation, ...extra },
});

const text = (name: string, displayName: string, description?: string): INodeProperties => ({
	displayName,
	name,
	type: 'string',
	default: '',
	...(description ? { description } : {}),
});

const money = (name: string, displayName: string): INodeProperties => ({
	displayName,
	name,
	type: 'number',
	typeOptions: { numberPrecision: 4 },
	default: 0,
});

const productTypeOptions = [
	{ name: 'Inventory', value: 'I', description: 'Stock item; quantities are tracked' },
	{ name: 'Non-Inventory', value: 'N', description: 'Goods whose quantity is not tracked' },
	{ name: 'Service', value: 'S', description: 'Services, e.g. labour or subscriptions' },
];

const statusOptions = [
	{ name: 'Active', value: 'A' },
	{ name: 'Inactive', value: 'I' },
	{ name: 'Discontinued', value: 'D' },
];

const productFields = (
	[
	text('productName2', 'Second Name', 'Name in a second language'),
	text('unit', 'Unit', 'Base unit, e.g. UNIT, PCS, KG'),
	money('price', 'Selling Price'),
	money('minPrice', 'Minimum Selling Price'),
	money('cost', 'Cost'),
	text('productCategoryName', 'Category'),
	text('postingGroup', 'Posting Group', 'Decides which GL accounts sales and purchases of this product post to'),
	text('supplyTaxCode', 'Sales Tax Code'),
	text('purchaseTaxCode', 'Purchase Tax Code'),
	text('tariffCode', 'Tariff Code'),
	text('classificationCode', 'Classification Code', 'E-Invoice classification code'),
	text('unitType', 'Unit Type', 'E-Invoice unit of measurement code'),
	text('barCode', 'Barcode'),
	text('supplier', 'Main Supplier'),
	text('furtherDescription', 'Further Description'),
	text('note', 'Note'),
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: statusOptions,
		default: 'A',
	},
	] as INodeProperties[]
).sort((a, b) => a.displayName.localeCompare(b.displayName));

export const productDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource } },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a product', description: 'Create a product' },
			{ name: 'Delete', value: 'delete', action: 'Delete a product', description: 'Delete a product' },
			{ name: 'Get', value: 'get', action: 'Get a product', description: 'Get a product by code' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many products', description: 'List products' },
			{
				name: 'Get Stock Balance',
				value: 'getStockBalance',
				action: 'Get the stock balance of a product',
				description: 'Get the balance quantity of a product at each location',
			},
			{ name: 'Update', value: 'update', action: 'Update a product', description: 'Update a product' },
		],
		default: 'create',
	},
	{
		displayName: 'Product Code',
		name: 'code',
		type: 'string',
		required: true,
		default: '',
		displayOptions: show(['create', 'get', 'update', 'delete', 'getStockBalance']),
	},
	{
		displayName: 'Product Name',
		name: 'productName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: show(['create']),
	},
	{
		displayName: 'Product Type',
		name: 'productType',
		type: 'options',
		required: true,
		options: productTypeOptions,
		default: 'I',
		displayOptions: show(['create']),
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['create']),
		options: productFields,
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show(['update']),
		options: [...productFields, text('productName', 'Product Name')].sort((a, b) =>
			a.displayName.localeCompare(b.displayName),
		),
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show(['getAll']),
		options: [
			text('categories', 'Categories', 'Comma-separated list of product category names'),
			{
				displayName: 'Product Types',
				name: 'productTypes',
				type: 'multiOptions',
				options: [
					{ name: 'Inventory', value: 'inventoryProduct' },
					{ name: 'Non-Inventory', value: 'nonInventoryProduct' },
					{ name: 'Service', value: 'serviceProduct' },
				],
				default: [],
			},
			{
				displayName: 'Statuses',
				name: 'statuses',
				type: 'multiOptions',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Inactive', value: 'inactive' },
					{ name: 'Discontinued', value: 'discontinued' },
				],
				default: [],
			},
		],
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: show(['create', 'get', 'getAll', 'update']),
		description:
			'Whether to return the product fields at the top level, instead of the raw { product, productVariants, … } response',
	},
];
