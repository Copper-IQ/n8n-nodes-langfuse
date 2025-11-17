import { createAuthObject, parsePromptName, getDefaultLabels } from '../api';
import type { LangfuseCredentials } from '../types';

describe('createAuthObject', () => {
	it('should create auth object with username and password', () => {
		const credentials: LangfuseCredentials = {
			host: 'https://cloud.langfuse.com',
			publicKey: 'pk-lf-123',
			secretKey: 'sk-lf-456',
		};

		const auth = createAuthObject(credentials);

		expect(auth).toEqual({
			username: 'pk-lf-123',
			password: 'sk-lf-456',
		});
	});
});

describe('parsePromptName', () => {
	it('should return string value as-is', () => {
		const result = parsePromptName('my-prompt');
		expect(result).toBe('my-prompt');
	});

	it('should extract value from object mode', () => {
		const result = parsePromptName({ mode: 'list', value: 'my-prompt' });
		expect(result).toBe('my-prompt');
	});

	it('should return empty string for undefined', () => {
		const result = parsePromptName(undefined);
		expect(result).toBe('');
	});

	it('should return empty string for object with empty value', () => {
		const result = parsePromptName({ mode: 'list', value: '' });
		expect(result).toBe('');
	});

	it('should handle object with null value', () => {
		const result = parsePromptName({ mode: 'list', value: null as any });
		expect(result).toBe('');
	});
});

describe('getDefaultLabels', () => {
	it('should return production and latest labels', () => {
		const labels = getDefaultLabels();
		expect(labels).toEqual([
			{ name: 'Production', value: 'production' },
			{ name: 'Latest', value: 'latest' },
		]);
	});

	it('should return new array each time', () => {
		const labels1 = getDefaultLabels();
		const labels2 = getDefaultLabels();
		expect(labels1).not.toBe(labels2);
		expect(labels1).toEqual(labels2);
	});
});
