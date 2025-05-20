'use server';

/**
 * @fileOverview An AI agent that suggests the best steganography algorithm
 * for a given file type and message.
 *
 * - suggestAlgorithm - A function that suggests the optimal steganography algorithm.
 * - AlgorithmAdvisorInput - The input type for the suggestAlgorithm function.
 * - AlgorithmAdvisorOutput - The return type for the suggestAlgorithm function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AlgorithmAdvisorInputSchema = z.object({
  fileType: z
    .string()
    .describe("The type of file to hide the message in (e.g., 'image', 'audio', 'text', 'pdf', 'video')."),
  message: z.string().describe('The message to be hidden.'),
});
export type AlgorithmAdvisorInput = z.infer<typeof AlgorithmAdvisorInputSchema>;

const AlgorithmAdvisorOutputSchema = z.object({
  algorithm: z.string().describe('The suggested steganography algorithm.'),
  rationale: z
    .string()
    .describe('The rationale for choosing the suggested algorithm.'),
});
export type AlgorithmAdvisorOutput = z.infer<typeof AlgorithmAdvisorOutputSchema>;

export async function suggestAlgorithm(input: AlgorithmAdvisorInput): Promise<AlgorithmAdvisorOutput> {
  return algorithmAdvisorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'algorithmAdvisorPrompt',
  input: {schema: AlgorithmAdvisorInputSchema},
  output: {schema: AlgorithmAdvisorOutputSchema},
  prompt: `You are an expert in steganography algorithms. Given a file type and a message to hide,
you will suggest the best steganography algorithm to use and explain your reasoning.

File Type: {{{fileType}}}
Message: {{{message}}}

Suggest the best algorithm and explain why it is the most suitable choice.
Ensure that the algorithm you suggest can handle the specific file type.
Be as detailed as possible in the rationale. Consider factors like file size impact, security, and ease of extraction.
Avoid suggesting algorithms that are not practical or have known vulnerabilities.
`,
});

const algorithmAdvisorFlow = ai.defineFlow(
  {
    name: 'algorithmAdvisorFlow',
    inputSchema: AlgorithmAdvisorInputSchema,
    outputSchema: AlgorithmAdvisorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

