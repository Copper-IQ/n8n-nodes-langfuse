import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { LangfuseCredentials, LangfusePromptResponse, CompiledPromptOutput } from './types';
import { compilePrompt } from './helpers';

export async function executeCompilePrompt(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const credentials = (await this.getCredentials('langfuseApi')) as LangfuseCredentials;

			const promptNameRaw = this.getNodeParameter('promptNameResource', i) as
				| string
				| { mode: string; value: string };
			const promptName =
				typeof promptNameRaw === 'string' ? promptNameRaw : promptNameRaw?.value || '';
			const promptLabel = this.getNodeParameter('labelResource', i) as string;

			if (!promptName || !promptLabel) {
				throw new NodeOperationError(
					this.getNode(),
					'Prompt name and label are required',
					{ itemIndex: i },
				);
			}

			const promptResponse = (await this.helpers.httpRequest({
				method: 'GET',
				url: `${credentials.host}/api/public/v2/prompts/${encodeURIComponent(promptName)}?label=${encodeURIComponent(promptLabel)}`,
				auth: {
					username: credentials.publicKey,
					password: credentials.secretKey,
				},
			})) as LangfusePromptResponse;

			const promptVariablesRaw = this.getNodeParameter('promptVariables', i, {}) as {
				mappingMode?: string;
				value?: Record<string, string>;
			};
			const promptVariables = promptVariablesRaw.value || {};

			const compiledPromptContent = compilePrompt(promptResponse.prompt, promptVariables);

			const output: CompiledPromptOutput = {
				id: promptResponse.id,
				name: promptResponse.name,
				version: promptResponse.version,
				type: promptResponse.type,
				labels: promptResponse.labels,
				tags: promptResponse.tags,
				config: promptResponse.config,
				compiledPrompt: compiledPromptContent,
				variables: promptVariables,
			};

			returnData.push({
				json: output as IDataObject,
				pairedItem: { item: i },
			});
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: {
						error: error instanceof Error ? error.message : 'Unknown error',
					},
					pairedItem: { item: i },
				});
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
