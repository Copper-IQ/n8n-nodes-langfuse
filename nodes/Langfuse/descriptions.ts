import type { INodeProperties } from 'n8n-workflow';

export const resourceProperty: INodeProperties = {
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
};

export const operationProperty: INodeProperties = {
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
};

export const promptNameProperty: INodeProperties = {
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
};

export const promptNameResourceProperty: INodeProperties = {
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
};

export const labelProperty: INodeProperties = {
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
};

export const labelResourceProperty: INodeProperties = {
	displayName: 'Prompt Label Name or ID',
	name: 'labelResource',
	type: 'options',
	default: 'production',
	required: true,
	description:
		'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	typeOptions: {
		loadOptionsMethod: 'loadPromptLabels',
		loadOptionsDependsOn: ['promptNameResource.value'],
	},
	options: [
		{ name: 'Production', value: 'production' },
		{ name: 'Latest', value: 'latest' },
	],
	displayOptions: {
		show: {
			resource: ['prompt'],
			operation: ['compilePrompt'],
		},
	},
};

export const promptVariablesProperty: INodeProperties = {
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
		loadOptionsDependsOn: ['promptNameResource.value'],
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
};
