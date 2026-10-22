import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { createCache } from './actions/cache';
import { executeDocument } from './actions/document';
import { executeCompany, executeContact, executeLookup, executeProduct } from './actions/records';
import { contactDescription } from './descriptions/ContactDescription';
import { documentProperties, documentResourceOptions } from './descriptions/DocumentDescription';
import { companyDescription, lookupDescription } from './descriptions/LookupDescription';
import { productDescription } from './descriptions/ProductDescription';
import { getDocumentType } from './documents';
import { autoCountApiRequestAllItems } from './GenericFunctions';

function toOptions(rows: IDataObject[], valueKey: string, labelKey: string): INodePropertyOptions[] {
	return rows
		.filter((row) => row[valueKey] !== undefined && row[valueKey] !== null)
		.map((row) => {
			const value = String(row[valueKey]);
			const label = row[labelKey] ? `${value} – ${String(row[labelKey])}` : value;
			return { name: label, value };
		})
		.sort((a, b) => a.name.localeCompare(b.name));
}

export class AutoCount implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AutoCount',
		name: 'autoCount',
		icon: { light: 'file:autocount.svg', dark: 'file:autocount.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with customers, products, invoices, payments and journals in AutoCount Cloud Accounting',
		defaults: {
			name: 'AutoCount',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'autoCountApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					...documentResourceOptions,
					{ name: 'Company', value: 'company' },
					{ name: 'Customer', value: 'debtor', description: 'Debtor accounts' },
					{ name: 'Lookup', value: 'lookup', description: 'Accounts, locations, payment methods and other reference lists' },
					{ name: 'Product', value: 'product' },
					{ name: 'Supplier', value: 'creditor', description: 'Creditor accounts' },
				].sort((a, b) => a.name.localeCompare(b.name)),
				default: 'invoice',
			},
			...documentProperties,
			...contactDescription('debtor'),
			...contactDescription('creditor'),
			...productDescription,
			...lookupDescription,
			...companyDescription,
		],
	};

	methods = {
		loadOptions: {
			async getDebtors(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rows = await autoCountApiRequestAllItems.call(this, 'GET', '/debtor/listing', { qs: { activeOnly: true } });
				return toOptions(rows, 'AccNo', 'CompanyName');
			},
			async getCreditors(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rows = await autoCountApiRequestAllItems.call(this, 'GET', '/creditor/listing', { qs: { activeOnly: true } });
				return toOptions(rows, 'AccNo', 'CompanyName');
			},
			async getAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rows = await autoCountApiRequestAllItems.call(this, 'POST', '/account/listing', {
					qs: { leafOnly: true },
					body: {},
				});
				return toOptions(rows, 'AccNo', 'Description');
			},
			async getProducts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rows = await autoCountApiRequestAllItems.call(this, 'POST', '/product/listing', {
					body: { filter: { statuses: { active: true } } },
					pageIn: 'body',
				});
				return toOptions(
					rows.map((row) => (row.product as IDataObject) ?? row),
					'productCode',
					'productName',
				);
			},
			async getLocations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rows = await autoCountApiRequestAllItems.call(this, 'GET', '/location/listing', { qs: { activeOnly: true } });
				return toOptions(rows, 'location', 'description');
			},
			async getSalesAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rows = await autoCountApiRequestAllItems.call(this, 'GET', '/salesagent/listing', { qs: { activeOnly: true } });
				return toOptions(rows, 'salesAgent', 'description');
			},
			async getDepartments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rows = await autoCountApiRequestAllItems.call(this, 'GET', '/department/listing', {
					qs: { activeOnly: true, leafOnly: true },
				});
				return toOptions(rows, 'deptNo', 'description');
			},
			async getPaymentMethods(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rows = await autoCountApiRequestAllItems.call(this, 'GET', '/paymentmethod/listing', {
					qs: { activeOnly: true },
				});
				return toOptions(rows, 'paymentMethod', 'bankAccount');
			},
			async getDocNoFormats(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const resource = this.getCurrentNodeParameter('resource') as string;
				const doc = getDocumentType(resource);
				let docType = doc?.docType;
				if (doc?.lineKind === 'cashBook') {
					docType = (this.getCurrentNodeParameter('cashBookType') as string | undefined) ?? 'PV';
				}
				const rows = await autoCountApiRequestAllItems.call(this, 'GET', '/docnoformat/listing', {
					qs: docType ? { docType } : {},
				});
				return toOptions(rows, 'name', 'sample');
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const cache = createCache();

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const doc = getDocumentType(resource);

				let result: IDataObject | IDataObject[];
				if (doc) {
					result = await executeDocument.call(this, doc, operation, i, cache);
				} else if (resource === 'debtor' || resource === 'creditor') {
					result = await executeContact.call(this, resource, operation, i, cache);
				} else if (resource === 'product') {
					result = await executeProduct.call(this, operation, i);
				} else if (resource === 'lookup') {
					result = await executeLookup.call(this, i);
				} else if (resource === 'company') {
					result = await executeCompany.call(this);
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not supported`, { itemIndex: i });
				}

				const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(result), {
					itemData: { item: i },
				});
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				if (error instanceof NodeApiError) {
					// Already wrapped by the request helper; this returns the same error with its HTTP details.
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
