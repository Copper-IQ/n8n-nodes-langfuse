import type { ILoadOptionsFunctions, IExecuteFunctions } from 'n8n-workflow';
import type { LangfuseCredentials } from './types';

/**
 * Creates authentication object for Langfuse API requests
 */
export function createAuthObject(credentials: LangfuseCredentials) {
	return {
		username: credentials.publicKey,
		password: credentials.secretKey,
	};
}

/**
 * Fetches all prompts from Langfuse API
 */
export async function fetchPrompts(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	credentials: LangfuseCredentials,
) {
	const response = (await context.helpers.httpRequest({
		method: 'GET',
		url: `${credentials.host}/api/public/v2/prompts`,
		auth: createAuthObject(credentials),
	})) as { data?: Array<{ name: string; labels?: string[]; versions?: number[] }> };

	return response.data || [];
}

/**
 * Parses promptNameResource parameter which can be string or object
 */
export function parsePromptName(
	promptNameRaw: string | { mode: string; value: string } | undefined,
): string {
	if (!promptNameRaw) return '';
	return typeof promptNameRaw === 'string' ? promptNameRaw : promptNameRaw?.value || '';
}

/**
 * Returns default label options
 */
export function getDefaultLabels() {
	return [
		{ name: 'Production', value: 'production' },
		{ name: 'Latest', value: 'latest' },
	];
}
