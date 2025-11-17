import { extractVariablesFromPrompt, compilePrompt } from '../helpers';
import type { ChatMessage } from '../types';

describe('extractVariablesFromPrompt', () => {
	describe('text prompts', () => {
		it('should extract single variable from text prompt', () => {
			const prompt = 'Hello {{name}}!';
			const variables = extractVariablesFromPrompt(prompt);
			expect(variables).toEqual(['name']);
		});

		it('should extract multiple variables from text prompt', () => {
			const prompt = 'Hello {{firstName}} {{lastName}}! You are from {{country}}.';
			const variables = extractVariablesFromPrompt(prompt);
			expect(variables).toEqual(['firstName', 'lastName', 'country']);
		});

		it('should handle variables with spaces', () => {
			const prompt = 'Value: {{ variable_name }}';
			const variables = extractVariablesFromPrompt(prompt);
			expect(variables).toEqual(['variable_name']);
		});

		it('should deduplicate repeated variables', () => {
			const prompt = 'Hello {{name}}! Nice to meet you {{name}}.';
			const variables = extractVariablesFromPrompt(prompt);
			expect(variables).toEqual(['name']);
		});

		it('should return empty array for prompt without variables', () => {
			const prompt = 'Hello world!';
			const variables = extractVariablesFromPrompt(prompt);
			expect(variables).toEqual([]);
		});

		it('should handle empty string', () => {
			const prompt = '';
			const variables = extractVariablesFromPrompt(prompt);
			expect(variables).toEqual([]);
		});

		it('should handle variables with underscores and hyphens', () => {
			const prompt = '{{user_name}} and {{user-id}}';
			const variables = extractVariablesFromPrompt(prompt);
			expect(variables).toEqual(['user_name', 'user-id']);
		});

		it('should handle nested braces correctly', () => {
			const prompt = 'Data: {{data}}';
			const variables = extractVariablesFromPrompt(prompt);
			expect(variables).toEqual(['data']);
		});
	});

	describe('chat prompts', () => {
		it('should extract variables from chat messages', () => {
			const prompt: ChatMessage[] = [
				{ role: 'system', content: 'You are {{role}}' },
				{ role: 'user', content: 'Tell me about {{topic}}' },
			];
			const variables = extractVariablesFromPrompt(prompt);
			expect(variables).toEqual(['role', 'topic']);
		});

		it('should deduplicate variables across messages', () => {
			const prompt: ChatMessage[] = [
				{ role: 'system', content: 'Hello {{name}}' },
				{ role: 'user', content: 'Hi {{name}}' },
			];
			const variables = extractVariablesFromPrompt(prompt);
			expect(variables).toEqual(['name']);
		});

		it('should handle empty chat array', () => {
			const prompt: ChatMessage[] = [];
			const variables = extractVariablesFromPrompt(prompt);
			expect(variables).toEqual([]);
		});

		it('should handle chat messages without variables', () => {
			const prompt: ChatMessage[] = [
				{ role: 'system', content: 'You are helpful' },
				{ role: 'user', content: 'Tell me a story' },
			];
			const variables = extractVariablesFromPrompt(prompt);
			expect(variables).toEqual([]);
		});
	});
});

describe('compilePrompt', () => {
	describe('text prompts', () => {
		it('should compile single variable in text prompt', () => {
			const prompt = 'Hello {{name}}!';
			const variables = { name: 'Alice' };
			const compiled = compilePrompt(prompt, variables);
			expect(compiled).toBe('Hello Alice!');
		});

		it('should compile multiple variables in text prompt', () => {
			const prompt = 'Hello {{firstName}} {{lastName}}!';
			const variables = { firstName: 'John', lastName: 'Doe' };
			const compiled = compilePrompt(prompt, variables);
			expect(compiled).toBe('Hello John Doe!');
		});

		it('should handle variables with spaces', () => {
			const prompt = 'Value: {{ name }}';
			const variables = { name: 'Test' };
			const compiled = compilePrompt(prompt, variables);
			expect(compiled).toBe('Value: Test');
		});

		it('should compile repeated variables', () => {
			const prompt = 'Hello {{name}}! Nice to meet you {{name}}.';
			const variables = { name: 'Bob' };
			const compiled = compilePrompt(prompt, variables);
			expect(compiled).toBe('Hello Bob! Nice to meet you Bob.');
		});

		it('should leave unmatched variables as-is', () => {
			const prompt = 'Hello {{name}} from {{city}}!';
			const variables = { name: 'Alice' };
			const compiled = compilePrompt(prompt, variables);
			expect(compiled).toBe('Hello Alice from {{city}}!');
		});

		it('should handle empty variables object', () => {
			const prompt = 'Hello {{name}}!';
			const variables = {};
			const compiled = compilePrompt(prompt, variables);
			expect(compiled).toBe('Hello {{name}}!');
		});

		it('should handle prompt without variables', () => {
			const prompt = 'Hello world!';
			const variables = { name: 'Alice' };
			const compiled = compilePrompt(prompt, variables);
			expect(compiled).toBe('Hello world!');
		});

		it('should handle empty string prompt', () => {
			const prompt = '';
			const variables = { name: 'Alice' };
			const compiled = compilePrompt(prompt, variables);
			expect(compiled).toBe('');
		});

		it('should handle special characters in variable values', () => {
			const prompt = 'Hello {{name}}!';
			const variables = { name: 'Alice & Bob' };
			const compiled = compilePrompt(prompt, variables);
			expect(compiled).toBe('Hello Alice & Bob!');
		});
	});

	describe('chat prompts', () => {
		it('should compile variables in chat messages', () => {
			const prompt: ChatMessage[] = [
				{ role: 'system', content: 'You are {{role}}' },
				{ role: 'user', content: 'Tell me about {{topic}}' },
			];
			const variables = { role: 'assistant', topic: 'AI' };
			const compiled = compilePrompt(prompt, variables) as ChatMessage[];
			expect(compiled).toEqual([
				{ role: 'system', content: 'You are assistant' },
				{ role: 'user', content: 'Tell me about AI' },
			]);
		});

		it('should preserve message structure', () => {
			const prompt: ChatMessage[] = [{ role: 'user', content: 'Hello {{name}}' }];
			const variables = { name: 'World' };
			const compiled = compilePrompt(prompt, variables) as ChatMessage[];
			expect(compiled[0].role).toBe('user');
			expect(compiled[0].content).toBe('Hello World');
		});

		it('should handle empty chat array', () => {
			const prompt: ChatMessage[] = [];
			const variables = { name: 'Test' };
			const compiled = compilePrompt(prompt, variables);
			expect(compiled).toEqual([]);
		});

		it('should handle chat messages without variables', () => {
			const prompt: ChatMessage[] = [
				{ role: 'system', content: 'You are helpful' },
			];
			const variables = { name: 'Test' };
			const compiled = compilePrompt(prompt, variables) as ChatMessage[];
			expect(compiled).toEqual([{ role: 'system', content: 'You are helpful' }]);
		});

		it('should handle empty variables object with chat prompts', () => {
			const prompt: ChatMessage[] = [
				{ role: 'user', content: 'Hello {{name}}' },
			];
			const variables = {};
			const compiled = compilePrompt(prompt, variables) as ChatMessage[];
			expect(compiled[0].content).toBe('Hello {{name}}');
		});

		it('should not mutate original prompt array', () => {
			const prompt: ChatMessage[] = [
				{ role: 'user', content: 'Hello {{name}}' },
			];
			const original = JSON.parse(JSON.stringify(prompt));
			const variables = { name: 'World' };
			compilePrompt(prompt, variables);
			expect(prompt).toEqual(original);
		});
	});
});
