import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { LangfuseCredentials, LangfusePromptResponse } from './types';
import { extractVariablesFromPrompt } from './helpers';
import { fetchPrompts, parsePromptName, getDefaultLabels, createAuthObject } from './api';
import {
	resourceProperty,
	operationProperty,
	promptNameProperty,
	promptNameResourceProperty,
	labelProperty,
	labelResourceProperty,
	promptVariablesProperty,
} from './descriptions';
import { executeCompilePrompt } from './execute';

export class Langfuse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Langfuse',
		name: 'langfuse',
		icon: 'file:langfuse.svg',
		group: ['transform'],
		version: 1,
		description: 'Fetches a prompt from Langfuse Prompt Management',
		defaults: {
			name: 'Get Prompt (Langfuse)',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'langfuseApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.host}}',
		},
		properties: [
			resourceProperty,
			operationProperty,
			promptNameProperty,
			promptNameResourceProperty,
			labelProperty,
			labelResourceProperty,
			promptVariablesProperty,
		],
	};

	methods = {
		loadOptions: {
			async loadPromptLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const promptNameRaw = this.getNodeParameter('promptNameResource') as
						| string
						| { mode: string; value: string };

					const promptName = parsePromptName(promptNameRaw);

					if (!promptName) {
						return getDefaultLabels();
					}

					const credentials = (await this.getCredentials('langfuseApi')) as LangfuseCredentials;
					const prompts = await fetchPrompts(this, credentials);
					const selectedPrompt = prompts.find((p) => p.name === promptName);

					if (!selectedPrompt || !selectedPrompt.labels || selectedPrompt.labels.length === 0) {
						return getDefaultLabels();
					}

					return selectedPrompt.labels.map((label) => ({
						name: label,
						value: label,
					}));
				} catch (error) {
					return getDefaultLabels();
				}
			},
		},
		listSearch: {
			async searchPrompts(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				try {
					const credentials = (await this.getCredentials('langfuseApi')) as LangfuseCredentials;
					const prompts = await fetchPrompts(this, credentials);

					const results = prompts
						.filter((p) => !filter || p.name.toLowerCase().includes(filter.toLowerCase()))
						.map((p) => {
							const latestVersion = p.versions ? Math.max(...p.versions) : 1;
							return {
								name: `${p.name} (v${latestVersion})`,
								value: p.name,
							};
						});

					return { results };
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Failed to fetch prompts: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			},
		},
		resourceMapping: {
			async getMappingVariables(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
				try {
					const promptNameRaw = this.getNodeParameter('promptNameResource') as
						| string
						| { mode: string; value: string };
					const promptName = parsePromptName(promptNameRaw);
					const promptLabel = this.getNodeParameter('labelResource') as string;

					if (!promptName || !promptLabel) {
						return { fields: [] };
					}

					const credentials = (await this.getCredentials('langfuseApi')) as LangfuseCredentials;

					const promptResponse = (await this.helpers.httpRequest({
						method: 'GET',
						url: `${credentials.host}/api/public/v2/prompts/${encodeURIComponent(promptName)}?label=${encodeURIComponent(promptLabel)}`,
						auth: createAuthObject(credentials),
					})) as LangfusePromptResponse;

					const variables = extractVariablesFromPrompt(promptResponse.prompt);

					const fields: ResourceMapperField[] = variables.map((variable) => ({
						id: variable,
						displayName: variable,
						required: false,
						defaultMatch: false,
						display: true,
						type: 'string',
						canBeUsedToMatch: false,
					}));

					return { fields };
				} catch (error) {
					return { fields: [] };
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'compilePrompt') {
			const returnData = await executeCompilePrompt.call(this, items);
			return [returnData];
		}

		// For 'get' operation, the declarative routing handles it
		return [items];
	}
}
