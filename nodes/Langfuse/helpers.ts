import type { ChatMessage } from './types';

/**
 * Extract variables from prompt template
 * Supports both text (string) and chat (array) prompts
 * Extracts {{variableName}} patterns
 */
export function extractVariablesFromPrompt(
	prompt: string | ChatMessage[],
): string[] {
	const template = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
	const regex = /\{\{([^}]+)\}\}/g;
	const variables = new Set<string>();

	let match: RegExpExecArray | null;
	while ((match = regex.exec(template)) !== null) {
		variables.add(match[1].trim());
	}

	return Array.from(variables);
}

/**
 * Compile prompt by substituting variables with provided values
 * Handles both text and chat prompt formats
 */
export function compilePrompt(
	prompt: string | ChatMessage[],
	variables: Record<string, string>,
): string | ChatMessage[] {
	if (typeof prompt === 'string') {
		// Text prompt - simple string replacement
		let compiled = prompt;
		for (const [key, value] of Object.entries(variables)) {
			const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
			compiled = compiled.replace(pattern, value);
		}
		return compiled;
	}

	// Chat prompt - need to compile each message's content
	return prompt.map((message) => {
		let compiledContent = message.content;
		for (const [key, value] of Object.entries(variables)) {
			const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
			compiledContent = compiledContent.replace(pattern, value);
		}
		return {
			...message,
			content: compiledContent,
		};
	});
}
