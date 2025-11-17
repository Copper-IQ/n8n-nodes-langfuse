import type {
	IDataObject,
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
import { NodeOperationError } from 'n8n-workflow';
import type { LangfuseCredentials, LangfusePromptResponse, CompiledPromptOutput } from './types';
import { extractVariablesFromPrompt, compilePrompt } from './helpers';

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
		inputs: ['main'],
		outputs: ['main'],
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
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Prompt',
						value: 'prompt',
					},
				],
				default: 'prompt',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['prompt'],
					},
				},
		options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get a prompt',
						description: 'Retrieve a prompt by name',
						routing: {
							request: {
								method: 'GET',
								url: '=/api/public/v2/prompts/{{$parameter["promptName"]}}',
							},
						},
					},
					{
						name: 'Compile Prompt',
						value: 'compilePrompt',
						action: 'Compile a prompt with variables',
						description: 'Retrieve and compile a prompt by substituting variables',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Prompt Name',
				name: 'promptName',
				type: 'string',
				required: true,
				default: '',
				description: 'The name of the prompt to retrieve from Langfuse',
				displayOptions: {
					show: {
						resource: ['prompt'],
						operation: ['get'],
					},
				},
			},
			{
				displayName: 'Prompt',
				name: 'promptNameResource',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a prompt...',
						typeOptions: {
							searchListMethod: 'searchPrompts',
							searchable: true,
						},
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'e.g. seo-keyword-research',
					},
				],
				displayOptions: {
					show: {
						resource: ['prompt'],
						operation: ['compilePrompt'],
					},
				},
			},
			{
				displayName: 'Prompt Label',
				name: 'label',
				type: 'string',
				required: true,
				default: 'production',
				description: 'Deployment label of the prompt version to retrieve (defaults to Production)',
				displayOptions: {
					show: {
						resource: ['prompt'],
						operation: ['get'],
					},
				},
				routing: {
					request: {
						qs: {
							label: '={{$value}}',
						},
					},
				},
			},
			{
				displayName: 'Prompt Label Name or ID',
				name: 'labelResource',
				type: 'options',
				default: 'production',
				required: true,
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'loadPromptLabels',
					loadOptionsDependsOn: ['promptNameResource.value'],
				},
				options: [],
				displayOptions: {
					show: {
						resource: ['prompt'],
						operation: ['compilePrompt'],
					},
				},
			},
			{
				displayName: 'Prompt Variables',
				name: 'promptVariables',
				type: 'resourceMapper',
				noDataExpression: true,
				default: {
					mappingMode: 'defineBelow',
					value: null,
				},
				description:
					'Provide values for variables in your prompt template. Variables like {{topic}} or {{country}} are automatically detected from your Langfuse prompt.',
				typeOptions: {
					loadOptionsDependsOn: ['promptNameResource.value', 'labelResource'],
					resourceMapper: {
						resourceMapperMethod: 'getMappingVariables',
						mode: 'add',
						fieldWords: {
							singular: 'prompt variable',
							plural: 'prompt variables',
						},
						addAllFields: true,
						multiKeyMatch: false,
						supportAutoMap: false,
					},
				},
				displayOptions: {
					show: {
						resource: ['prompt'],
						operation: ['compilePrompt'],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			async loadPromptLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const promptNameRaw = this.getNodeParameter('promptNameResource') as
						| string
						| { mode: string; value: string };

					const promptName =
						typeof promptNameRaw === 'string' ? promptNameRaw : promptNameRaw?.value || '';

					if (!promptName) {
						return [
							{ name: 'Production', value: 'production' },
							{ name: 'Latest', value: 'latest' },
						];
					}

					const credentials = (await this.getCredentials('langfuseApi')) as LangfuseCredentials;

					const response = (await this.helpers.httpRequest({
						method: 'GET',
						url: `${credentials.host}/api/public/v2/prompts`,
						auth: {
							username: credentials.publicKey,
							password: credentials.secretKey,
						},
					})) as { data?: Array<{ name: string; labels: string[] }> };

					const prompts = response.data || [];
					const selectedPrompt = prompts.find((p) => p.name === promptName);

					if (!selectedPrompt || !selectedPrompt.labels || selectedPrompt.labels.length === 0) {
						return [
							{ name: 'Production', value: 'production' },
							{ name: 'Latest', value: 'latest' },
						];
					}

					const labelOptions = selectedPrompt.labels.map((label) => ({
						name: label,
						value: label,
					}));

					return labelOptions;
				} catch (error) {
					return [
						{ name: 'Production', value: 'production' },
						{ name: 'Latest', value: 'latest' },
					];
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

					const response = (await this.helpers.httpRequest({
						method: 'GET',
						url: `${credentials.host}/api/public/v2/prompts`,
						auth: {
							username: credentials.publicKey,
							password: credentials.secretKey,
						},
					})) as { data?: Array<{ name: string; versions: number[] }> };

					const prompts = response.data || [];

					const results = prompts
						.filter((p) => !filter || p.name.toLowerCase().includes(filter.toLowerCase()))
						.map((p) => {
							const latestVersion = Math.max(...p.versions);
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
					const promptName =
						typeof promptNameRaw === 'string' ? promptNameRaw : promptNameRaw?.value;

					const promptLabel = this.getNodeParameter('labelResource') as string;

					if (!promptName || !promptLabel) {
						return { fields: [] };
					}

					const credentials = (await this.getCredentials('langfuseApi')) as LangfuseCredentials;

					const promptResponse = (await this.helpers.httpRequest({
						method: 'GET',
						url: `${credentials.host}/api/public/v2/prompts/${encodeURIComponent(promptName)}?label=${encodeURIComponent(promptLabel)}`,
						auth: {
							username: credentials.publicKey,
							password: credentials.secretKey,
						},
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
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;

			if (operation === 'compilePrompt') {
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
		}

		return [returnData];
	}
}
