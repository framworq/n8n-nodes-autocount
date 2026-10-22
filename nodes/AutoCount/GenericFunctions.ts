import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, sleep } from 'n8n-workflow';

export const BASE_URL = 'https://accounting-api.autocountcloud.com';

/** AutoCount Cloud stores and filters timestamps in Malaysia / Singapore local time (UTC+8), without an offset. */
const BOOK_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

type Context = IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions;

export interface ListingPage {
	data?: IDataObject[];
	totalCount?: number;
}

interface RequestExtras {
	/** Return `{ headers, body, statusCode }` instead of the body. Needed to read the `Location` of created records. */
	returnFullResponse?: boolean;
}

async function getAccountBookId(this: Context): Promise<string> {
	const credentials = await this.getCredentials('autoCountApi');
	return encodeURIComponent(String(credentials.accountBookId).trim());
}

function describeError(error: JsonObject): { message?: string; description?: string; httpCode?: string } {
	const response = (error.response ?? (error.cause as JsonObject | undefined)?.response) as JsonObject | undefined;
	const body = (response?.data ?? response?.body) as JsonObject | string | undefined;
	const status = String(response?.status ?? response?.statusCode ?? error.httpCode ?? '');
	const apiMessage = typeof body === 'object' && body !== null ? (body.message as string | undefined) : body;

	if (status === '401') {
		return {
			httpCode: status,
			message: 'AutoCount rejected the Key ID or API Key',
			description: 'Check the credential, and that the key belongs to this account book.',
		};
	}
	if (status === '429') {
		return {
			httpCode: status,
			message: 'AutoCount rate limit reached',
			description: 'The API allows a limited number of requests per minute. Add a Wait node or reduce the batch size.',
		};
	}
	if (status === '404') {
		return { httpCode: status, message: 'The record was not found in AutoCount', description: apiMessage };
	}
	return { httpCode: status || undefined, message: apiMessage || undefined };
}

export async function autoCountApiRequest(
	this: Context,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject | IDataObject[],
	qs: IDataObject = {},
	extras: RequestExtras = {},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	const accountBookId = await getAccountBookId.call(this);
	const options: IHttpRequestOptions = {
		method,
		baseURL: BASE_URL,
		url: `/${accountBookId}${endpoint}`,
		qs,
		arrayFormat: 'repeat',
		headers: { Accept: 'application/json' },
		json: true,
		returnFullResponse: extras.returnFullResponse,
	};
	if (body !== undefined) {
		options.body = body;
	}

	for (let attempt = 0; ; attempt++) {
		try {
			return await this.helpers.httpRequestWithAuthentication.call(this, 'autoCountApi', options);
		} catch (error) {
			const waitMs = rateLimitWait(error as JsonObject);
			if (waitMs !== undefined && attempt < MAX_RATE_LIMIT_RETRIES) {
				await sleep(waitMs);
				continue;
			}
			throw new NodeApiError(this.getNode(), error as JsonObject, describeError(error as JsonObject));
		}
	}
}

const MAX_RATE_LIMIT_RETRIES = 3;

/** For a 429, how long to wait before retrying: until AutoCount's `x-rate-limit-reset`, within 2–65 s. */
function rateLimitWait(error: JsonObject): number | undefined {
	const response = (error.response ?? (error.cause as JsonObject | undefined)?.response) as JsonObject | undefined;
	const status = String(response?.status ?? response?.statusCode ?? error.httpCode ?? '');
	if (status !== '429') return undefined;
	const headers = (response?.headers ?? {}) as IDataObject;
	const reset = Date.parse(String(headers['x-rate-limit-reset'] ?? ''));
	const wait = Number.isNaN(reset) ? 20_000 : reset - Date.now() + 1_000;
	return Math.min(Math.max(wait, 2_000), 65_000);
}

/**
 * Fetch every page of an AutoCount listing endpoint (they return `{ data, totalCount }`, one page per call).
 * `pageIn` says whether the page number goes in the query string or the JSON body.
 */
export async function autoCountApiRequestAllItems(
	this: Context,
	method: IHttpRequestMethods,
	endpoint: string,
	options: { body?: IDataObject; qs?: IDataObject; pageIn?: 'qs' | 'body'; limit?: number } = {},
): Promise<IDataObject[]> {
	const { body, qs = {}, pageIn = 'qs', limit } = options;
	const results: IDataObject[] = [];
	let page = 1;

	while (true) {
		const pageQs = pageIn === 'qs' ? { ...qs, page } : qs;
		const pageBody = pageIn === 'body' ? { ...(body ?? {}), page } : body;
		const response = (await autoCountApiRequest.call(this, method, endpoint, pageBody, pageQs)) as ListingPage;
		const data = response.data ?? [];
		results.push(...data);

		const total = response.totalCount ?? 0;
		if (data.length === 0 || results.length >= total || (limit !== undefined && results.length >= limit)) {
			break;
		}
		page++;
	}

	return limit === undefined ? results : results.slice(0, limit);
}

/** AutoCount answers a create with 201 and `Location: …/debtor?code=300-A001`. Returns that code / docNo. */
export function getCreatedKey(headers: IDataObject | undefined): string | undefined {
	const location = headers?.location ?? headers?.Location;
	if (typeof location !== 'string') return undefined;
	const query = location.split('?')[1] ?? '';
	for (const pair of query.split('&')) {
		const [key, value] = pair.split('=');
		if (value !== undefined && ['code', 'docNo', 'taxEntityId'].includes(key)) {
			return decodeURIComponent(value.replace(/\+/g, ' '));
		}
	}
	return undefined;
}

function toBookLocal(date: Date): string {
	return new Date(date.getTime() + BOOK_UTC_OFFSET_MS).toISOString().slice(0, 19);
}

/** Today's date in AutoCount book time (UTC+8), as YYYY-MM-DD. */
export function todayInBookTime(): string {
	return toBookLocal(new Date()).slice(0, 10);
}

/** Current time in AutoCount book time (UTC+8), as YYYY-MM-DDTHH:mm:ss. */
export function nowInBookTime(): string {
	return toBookLocal(new Date());
}

/**
 * Normalise a date from n8n into what AutoCount expects. Values with an explicit offset or `Z`
 * are converted to book time; values without one are taken to already be in book time.
 */
export function toAutoCountDateTime(value: unknown): string | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	const text = String(value).trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T00:00:00`;
	if (/(Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
		const parsed = new Date(text);
		if (!Number.isNaN(parsed.getTime())) return toBookLocal(parsed);
	}
	return text.replace(' ', 'T').slice(0, 19);
}

/** Drop keys whose value is undefined, null or an empty string, so AutoCount keeps its own defaults. */
export function compact(object: IDataObject): IDataObject {
	const result: IDataObject = {};
	for (const [key, value] of Object.entries(object)) {
		if (value === undefined || value === null || value === '') continue;
		result[key] = value;
	}
	return result;
}

export function pick(object: IDataObject, keys: string[]): IDataObject {
	const result: IDataObject = {};
	for (const key of keys) {
		if (object[key] !== undefined && object[key] !== null) result[key] = object[key];
	}
	return result;
}

/** Parse a JSON parameter that may arrive as a string or as an already-parsed value. */
export function parseJsonParameter(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	const text = value.trim();
	if (text === '') return undefined;
	return JSON.parse(text);
}
