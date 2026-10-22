import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { autoCountApiRequest, autoCountApiRequestAllItems } from '../GenericFunctions';

/**
 * Lookups reused across the items of one execution, so a batch of 100 invoices does not
 * fetch the same customer, location list or company profile 100 times.
 */
export interface ExecutionCache {
	homeCurrency?: string;
	defaultLocation?: string;
	paymentMethods?: IDataObject[];
	parties: Map<string, IDataObject>;
}

export function createCache(): ExecutionCache {
	return { parties: new Map() };
}

export async function getParty(
	this: IExecuteFunctions,
	cache: ExecutionCache,
	kind: 'debtor' | 'creditor',
	code: string,
): Promise<IDataObject> {
	const key = `${kind}:${code}`;
	if (!cache.parties.has(key)) {
		cache.parties.set(key, (await autoCountApiRequest.call(this, 'GET', `/${kind}`, undefined, { code })) as IDataObject);
	}
	return cache.parties.get(key) as IDataObject;
}

export async function getHomeCurrency(this: IExecuteFunctions, cache: ExecutionCache): Promise<string> {
	if (cache.homeCurrency === undefined) {
		const profile = (await autoCountApiRequest.call(this, 'GET', '/companyprofile')) as IDataObject;
		cache.homeCurrency = (profile.homeCurrency as string) || 'MYR';
	}
	return cache.homeCurrency;
}

export async function getDefaultLocation(this: IExecuteFunctions, cache: ExecutionCache): Promise<string> {
	if (cache.defaultLocation === undefined) {
		const locations = await autoCountApiRequestAllItems.call(this, 'GET', '/location/listing', {
			qs: { activeOnly: true },
		});
		const preferred = locations.find((location) => location.isDefault) ?? locations[0];
		cache.defaultLocation = (preferred?.location as string) || 'HQ';
	}
	return cache.defaultLocation;
}

export async function getPaymentMethod(
	this: IExecuteFunctions,
	cache: ExecutionCache,
	paymentMethod: string,
): Promise<IDataObject> {
	cache.paymentMethods ??= await autoCountApiRequestAllItems.call(this, 'GET', '/paymentmethod/listing');
	const found = cache.paymentMethods.find((method) => method.paymentMethod === paymentMethod);
	if (!found) {
		throw new NodeOperationError(this.getNode(), `Payment method "${paymentMethod}" was not found in AutoCount`, {
			description: `Available: ${cache.paymentMethods.map((method) => method.paymentMethod).join(', ')}`,
		});
	}
	return found;
}
