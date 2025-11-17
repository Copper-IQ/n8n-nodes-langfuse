export interface LangfuseCredentials {
	host: string;
	publicKey: string;
	secretKey: string;
}

export interface ChatMessage {
	role: string;
	content: string;
}

export interface LangfusePromptResponse {
	id: string;
	name: string;
	version: number;
	prompt: string | ChatMessage[];
	type: 'text' | 'chat';
	labels: string[];
	tags: string[];
	config?: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

export interface CompiledPromptOutput {
	id: string;
	name: string;
	version: number;
	type: 'text' | 'chat';
	labels: string[];
	tags: string[];
	config?: Record<string, unknown>;
	compiledPrompt: string | ChatMessage[];
	variables: Record<string, string>;
	[key: string]: unknown;
}
