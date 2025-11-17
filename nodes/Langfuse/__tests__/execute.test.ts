import { executeCompilePrompt } from '../execute';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { LangfuseCredentials, LangfusePromptResponse } from '../types';

describe('executeCompilePrompt', () => {
	let mockExecuteFunctions: Partial<IExecuteFunctions>;
	let mockGetCredentials: jest.Mock;
	let mockHttpRequest: jest.Mock;
	let mockGetNodeParameter: jest.Mock;
	let mockGetNode: jest.Mock;
	let mockContinueOnFail: jest.Mock;

	beforeEach(() => {
		mockGetCredentials = jest.fn();
		mockHttpRequest = jest.fn();
		mockGetNodeParameter = jest.fn();
		mockGetNode = jest.fn(() => ({ name: 'Langfuse' }));
		mockContinueOnFail = jest.fn(() => false);

		mockExecuteFunctions = {
			getCredentials: mockGetCredentials,
			helpers: {
				httpRequest: mockHttpRequest,
			} as any,
			getNodeParameter: mockGetNodeParameter,
			getNode: mockGetNode,
			continueOnFail: mockContinueOnFail,
		};
	});

	const mockCredentials: LangfuseCredentials = {
		host: 'https://cloud.langfuse.com',
		publicKey: 'pk-lf-123',
		secretKey: 'sk-lf-456',
	};

	it('should compile text prompt successfully', async () => {
		const items: INodeExecutionData[] = [{ json: {} }];

		mockGetCredentials.mockResolvedValue(mockCredentials);
		mockGetNodeParameter
			.mockReturnValueOnce({ mode: 'list', value: 'test-prompt' })
			.mockReturnValueOnce('production')
			.mockReturnValueOnce({ value: { name: 'Alice', topic: 'AI' } });

		const mockPromptResponse: LangfusePromptResponse = {
			id: 'prompt-123',
			name: 'test-prompt',
			version: 1,
			prompt: 'Hello {{name}}! Tell me about {{topic}}.',
			type: 'text',
			labels: ['production'],
			tags: [],
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z',
		};

		mockHttpRequest.mockResolvedValue(mockPromptResponse);

		const result = await executeCompilePrompt.call(
			mockExecuteFunctions as IExecuteFunctions,
			items,
		);

		expect(result).toHaveLength(1);
		expect(result[0].json).toMatchObject({
			id: 'prompt-123',
			name: 'test-prompt',
			version: 1,
			type: 'text',
			compiledPrompt: 'Hello Alice! Tell me about AI.',
			variables: { name: 'Alice', topic: 'AI' },
		});
		expect(mockHttpRequest).toHaveBeenCalledWith({
			method: 'GET',
			url: 'https://cloud.langfuse.com/api/public/v2/prompts/test-prompt?label=production',
			auth: {
				username: 'pk-lf-123',
				password: 'sk-lf-456',
			},
		});
	});

	it('should compile chat prompt successfully', async () => {
		const items: INodeExecutionData[] = [{ json: {} }];

		mockGetCredentials.mockResolvedValue(mockCredentials);
		mockGetNodeParameter
			.mockReturnValueOnce('chat-prompt')
			.mockReturnValueOnce('staging')
			.mockReturnValueOnce({ value: { role: 'assistant' } });

		const mockPromptResponse: LangfusePromptResponse = {
			id: 'prompt-456',
			name: 'chat-prompt',
			version: 2,
			prompt: [
				{ role: 'system', content: 'You are {{role}}' },
				{ role: 'user', content: 'Hello' },
			],
			type: 'chat',
			labels: ['staging'],
			tags: ['test'],
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z',
		};

		mockHttpRequest.mockResolvedValue(mockPromptResponse);

		const result = await executeCompilePrompt.call(
			mockExecuteFunctions as IExecuteFunctions,
			items,
		);

		expect(result).toHaveLength(1);
		const compiledPrompt = result[0].json.compiledPrompt as Array<{
			role: string;
			content: string;
		}>;
		expect(compiledPrompt[0].content).toBe('You are assistant');
		expect(compiledPrompt[1].content).toBe('Hello');
	});

	it('should handle string prompt name', async () => {
		const items: INodeExecutionData[] = [{ json: {} }];

		mockGetCredentials.mockResolvedValue(mockCredentials);
		mockGetNodeParameter
			.mockReturnValueOnce('string-prompt')
			.mockReturnValueOnce('production')
			.mockReturnValueOnce({ value: {} });

		const mockPromptResponse: LangfusePromptResponse = {
			id: 'prompt-789',
			name: 'string-prompt',
			version: 1,
			prompt: 'Simple prompt',
			type: 'text',
			labels: ['production'],
			tags: [],
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z',
		};

		mockHttpRequest.mockResolvedValue(mockPromptResponse);

		const result = await executeCompilePrompt.call(
			mockExecuteFunctions as IExecuteFunctions,
			items,
		);

		expect(result).toHaveLength(1);
		expect(result[0].json.compiledPrompt).toBe('Simple prompt');
	});

	it('should handle multiple items', async () => {
		const items: INodeExecutionData[] = [{ json: {} }, { json: {} }];

		mockGetCredentials.mockResolvedValue(mockCredentials);
		mockGetNodeParameter
			.mockReturnValueOnce({ mode: 'list', value: 'test-prompt' })
			.mockReturnValueOnce('production')
			.mockReturnValueOnce({ value: { name: 'Alice' } })
			.mockReturnValueOnce({ mode: 'list', value: 'test-prompt' })
			.mockReturnValueOnce('production')
			.mockReturnValueOnce({ value: { name: 'Bob' } });

		const mockPromptResponse: LangfusePromptResponse = {
			id: 'prompt-123',
			name: 'test-prompt',
			version: 1,
			prompt: 'Hello {{name}}!',
			type: 'text',
			labels: ['production'],
			tags: [],
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z',
		};

		mockHttpRequest.mockResolvedValue(mockPromptResponse);

		const result = await executeCompilePrompt.call(
			mockExecuteFunctions as IExecuteFunctions,
			items,
		);

		expect(result).toHaveLength(2);
		expect(result[0].json.compiledPrompt).toBe('Hello Alice!');
		expect(result[1].json.compiledPrompt).toBe('Hello Bob!');
	});

	it('should throw NodeOperationError when prompt name is missing', async () => {
		const items: INodeExecutionData[] = [{ json: {} }];

		mockGetCredentials.mockResolvedValue(mockCredentials);
		mockGetNodeParameter
			.mockReturnValueOnce({ mode: 'list', value: '' })
			.mockReturnValueOnce('production');

		await expect(
			executeCompilePrompt.call(mockExecuteFunctions as IExecuteFunctions, items),
		).rejects.toThrow(NodeOperationError);

		expect(mockGetNode).toHaveBeenCalled();
	});

	it('should throw NodeOperationError when label is missing', async () => {
		const items: INodeExecutionData[] = [{ json: {} }];

		mockGetCredentials.mockResolvedValue(mockCredentials);
		mockGetNodeParameter
			.mockReturnValueOnce({ mode: 'list', value: 'test-prompt' })
			.mockReturnValueOnce('');

		await expect(
			executeCompilePrompt.call(mockExecuteFunctions as IExecuteFunctions, items),
		).rejects.toThrow(NodeOperationError);
	});

	it('should return error object when continueOnFail is true', async () => {
		const items: INodeExecutionData[] = [{ json: {} }];

		mockGetCredentials.mockResolvedValue(mockCredentials);
		mockGetNodeParameter
			.mockReturnValueOnce({ mode: 'list', value: 'test-prompt' })
			.mockReturnValueOnce('production')
			.mockReturnValueOnce({ value: {} });

		mockHttpRequest.mockRejectedValue(new Error('API Error'));
		mockContinueOnFail.mockReturnValue(true);

		const result = await executeCompilePrompt.call(
			mockExecuteFunctions as IExecuteFunctions,
			items,
		);

		expect(result).toHaveLength(1);
		expect(result[0].json).toEqual({
			error: 'API Error',
		});
		expect(result[0].pairedItem).toEqual({ item: 0 });
	});

	it('should handle empty variables', async () => {
		const items: INodeExecutionData[] = [{ json: {} }];

		mockGetCredentials.mockResolvedValue(mockCredentials);
		mockGetNodeParameter
			.mockReturnValueOnce('test-prompt')
			.mockReturnValueOnce('production')
			.mockReturnValueOnce({});

		const mockPromptResponse: LangfusePromptResponse = {
			id: 'prompt-123',
			name: 'test-prompt',
			version: 1,
			prompt: 'Hello World!',
			type: 'text',
			labels: ['production'],
			tags: [],
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z',
		};

		mockHttpRequest.mockResolvedValue(mockPromptResponse);

		const result = await executeCompilePrompt.call(
			mockExecuteFunctions as IExecuteFunctions,
			items,
		);

		expect(result[0].json.variables).toEqual({});
		expect(result[0].json.compiledPrompt).toBe('Hello World!');
	});

	it('should preserve paired item index', async () => {
		const items: INodeExecutionData[] = [{ json: { id: 1 } }, { json: { id: 2 } }];

		mockGetCredentials.mockResolvedValue(mockCredentials);
		mockGetNodeParameter
			.mockReturnValue('test-prompt')
			.mockReturnValue('production')
			.mockReturnValue({ value: {} });

		const mockPromptResponse: LangfusePromptResponse = {
			id: 'prompt-123',
			name: 'test-prompt',
			version: 1,
			prompt: 'Test',
			type: 'text',
			labels: ['production'],
			tags: [],
			createdAt: '2025-01-01T00:00:00Z',
			updatedAt: '2025-01-01T00:00:00Z',
		};

		mockHttpRequest.mockResolvedValue(mockPromptResponse);

		const result = await executeCompilePrompt.call(
			mockExecuteFunctions as IExecuteFunctions,
			items,
		);

		expect(result[0].pairedItem).toEqual({ item: 0 });
		expect(result[1].pairedItem).toEqual({ item: 1 });
	});
});
