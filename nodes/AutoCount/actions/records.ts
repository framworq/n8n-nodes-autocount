import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { ContactKind } from '../descriptions/ContactDescription';
import { LOOKUPS } from '../descriptions/LookupDescription';
import { autoCountApiRequest, autoCountApiRequestAllItems, compact, getCreatedKey } from '../GenericFunctions';
import type { ExecutionCache } from './cache';
import { getHomeCurrency } from './cache';

function unsupported(this: IExecuteFunctions, operation: string, resource: string, i: number): never {
	throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported for ${resource}`, {
		itemIndex: i,
	});
}

function getLimit(this: IExecuteFunctions, i: number): number | undefined {
	const returnAll = this.getNodeParameter('returnAll', i) as boolean;
	return returnAll ? undefined : (this.getNodeParameter('limit', i) as number);
}

// ---------------------------------------------------------------------------------------------
// Customers (debtors) and suppliers (creditors)
// ---------------------------------------------------------------------------------------------

export async function executeContact(
	this: IExecuteFunctions,
	kind: ContactKind,
	operation: string,
	i: number,
	cache: ExecutionCache,
): Promise<IDataObject | IDataObject[]> {
	const endpoint = `/${kind}`;

	if (operation === 'getAll') {
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const qs: IDataObject = { activeOnly: options.activeOnly ?? true };
		const fields = (options.fields as string[] | undefined) ?? [];
		if (fields.length) qs.field = fields;
		return await autoCountApiRequestAllItems.call(this, 'GET', `${endpoint}/listing`, {
			qs,
			limit: getLimit.call(this, i),
		});
	}

	if (operation === 'create') {
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const body = compact({
			companyName: this.getNodeParameter('companyName', i) as string,
			creditTerm: this.getNodeParameter('creditTerm', i) as string,
			// AutoCount creates records as inactive unless told otherwise
			isActive: true,
			...additionalFields,
		});
		body.currencyCode ??= await getHomeCurrency.call(this, cache);
		const response = (await autoCountApiRequest.call(this, 'POST', endpoint, body, {}, { returnFullResponse: true })) as {
			headers?: IDataObject;
		};
		const code = getCreatedKey(response.headers);
		if (!code) return { success: true };
		return (await autoCountApiRequest.call(this, 'GET', endpoint, undefined, { code })) as IDataObject;
	}

	const code = String(this.getNodeParameter('code', i)).trim();

	if (operation === 'get') {
		return (await autoCountApiRequest.call(this, 'GET', endpoint, undefined, { code })) as IDataObject;
	}
	if (operation === 'update') {
		const updateFields = compact(this.getNodeParameter('updateFields', i, {}) as IDataObject);
		if (Object.keys(updateFields).length === 0) {
			throw new NodeOperationError(this.getNode(), 'Add at least one field to update', { itemIndex: i });
		}
		await autoCountApiRequest.call(this, 'PUT', endpoint, updateFields, { code });
		return (await autoCountApiRequest.call(this, 'GET', endpoint, undefined, { code })) as IDataObject;
	}
	if (operation === 'delete') {
		await autoCountApiRequest.call(this, 'DELETE', endpoint, undefined, { code });
		return { deleted: true, code };
	}
	return unsupported.call(this, operation, kind, i);
}

// ---------------------------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------------------------

function simplifyProduct(response: IDataObject): IDataObject {
	if (!response || typeof response.product !== 'object') return response;
	const { product, ...rest } = response;
	return { ...(product as IDataObject), ...rest };
}

export async function executeProduct(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const endpoint = '/product';
	const simplify = ['create', 'get', 'getAll', 'update'].includes(operation)
		? (this.getNodeParameter('simplify', i, true) as boolean)
		: false;
	const output = (response: IDataObject) => (simplify ? simplifyProduct(response) : response);

	if (operation === 'getAll') {
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const filter: IDataObject = {};
		const categories = String(filters.categories ?? '')
			.split(',')
			.map((category) => category.trim())
			.filter(Boolean);
		if (categories.length) filter.productCategories = { multiSelect: categories };
		const asFlags = (values: unknown) =>
			Object.fromEntries(((values as string[] | undefined) ?? []).map((value) => [value, true]));
		if ((filters.productTypes as string[] | undefined)?.length) filter.productTypes = asFlags(filters.productTypes);
		if ((filters.statuses as string[] | undefined)?.length) filter.statuses = asFlags(filters.statuses);
		const rows = await autoCountApiRequestAllItems.call(this, 'POST', `${endpoint}/listing`, {
			body: { filter },
			pageIn: 'body',
			limit: getLimit.call(this, i),
		});
		return rows.map(output);
	}

	const code = String(this.getNodeParameter('code', i)).trim();

	if (operation === 'create') {
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const product = compact({
			productCode: code,
			productName: this.getNodeParameter('productName', i) as string,
			productType: this.getNodeParameter('productType', i) as string,
			status: 'A',
			...additionalFields,
		});
		await autoCountApiRequest.call(this, 'POST', endpoint, { product });
		return output((await autoCountApiRequest.call(this, 'GET', endpoint, undefined, { code })) as IDataObject);
	}
	if (operation === 'get') {
		return output((await autoCountApiRequest.call(this, 'GET', endpoint, undefined, { code })) as IDataObject);
	}
	if (operation === 'update') {
		const updateFields = compact(this.getNodeParameter('updateFields', i, {}) as IDataObject);
		if (Object.keys(updateFields).length === 0) {
			throw new NodeOperationError(this.getNode(), 'Add at least one field to update', { itemIndex: i });
		}
		await autoCountApiRequest.call(this, 'PUT', endpoint, { product: updateFields }, { code });
		return output((await autoCountApiRequest.call(this, 'GET', endpoint, undefined, { code })) as IDataObject);
	}
	if (operation === 'delete') {
		await autoCountApiRequest.call(this, 'DELETE', endpoint, undefined, { code });
		return { deleted: true, code };
	}
	if (operation === 'getStockBalance') {
		const response = await autoCountApiRequest.call(this, 'GET', `${endpoint}/balancequantity`, undefined, { code });
		const rows = Array.isArray(response) ? (response as IDataObject[]) : [response as IDataObject];
		return rows.map((row) => ({ productCode: code, ...row }));
	}
	return unsupported.call(this, operation, 'product', i);
}

// ---------------------------------------------------------------------------------------------
// Lookups and company
// ---------------------------------------------------------------------------------------------

export async function executeLookup(this: IExecuteFunctions, i: number): Promise<IDataObject[]> {
	const list = this.getNodeParameter('list', i) as string;
	const lookup = LOOKUPS[list];
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	const qs: IDataObject = {};
	if (list === 'account') {
		qs.leafOnly = options.leafOnly ?? true;
		if (options.searchText) qs.searchText = options.searchText;
	}
	if (list === 'docNoFormat' && options.docType) qs.docType = options.docType;
	return await autoCountApiRequestAllItems.call(this, lookup.method, lookup.path, {
		qs,
		body: lookup.method === 'POST' ? {} : undefined,
		limit: getLimit.call(this, i),
	});
}

export async function executeCompany(this: IExecuteFunctions): Promise<IDataObject> {
	return (await autoCountApiRequest.call(this, 'GET', '/companyprofile')) as IDataObject;
}
