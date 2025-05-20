
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
    .describe("Le type de fichier pour cacher le message (ex: 'image', 'audio', 'texte', 'pdf', 'vidéo')."),
  message: z.string().describe('Le message à cacher.'),
});
export type AlgorithmAdvisorInput = z.infer<typeof AlgorithmAdvisorInputSchema>;

const AlgorithmAdvisorOutputSchema = z.object({
  algorithm: z.string().describe("L'algorithme de stéganographie suggéré."),
  rationale: z
    .string()
    .describe('La justification pour le choix de l\'algorithme suggéré.'),
});
export type AlgorithmAdvisorOutput = z.infer<typeof AlgorithmAdvisorOutputSchema>;

export async function suggestAlgorithm(input: AlgorithmAdvisorInput): Promise<AlgorithmAdvisorOutput> {
  return algorithmAdvisorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'algorithmAdvisorPrompt',
  input: {schema: AlgorithmAdvisorInputSchema},
  output: {schema: AlgorithmAdvisorOutputSchema},
  prompt: `Vous êtes un expert en algorithmes de stéganographie. Étant donné un type de fichier et un message à cacher,
vous suggérerez le meilleur algorithme de stéganographie à utiliser et expliquerez votre raisonnement en français.

Type de Fichier : {{{fileType}}}
Message : {{{message}}}

Suggérez le meilleur algorithme et expliquez pourquoi c'est le choix le plus approprié.
Assurez-vous que l'algorithme que vous suggérez peut gérer le type de fichier spécifique.
La justification doit être concise et aller à l'essentiel (1-2 phrases maximum), en considérant l'impact sur la taille du fichier, la sécurité et la facilité d'extraction.
Évitez de suggérer des algorithmes qui ne sont pas pratiques ou qui ont des vulnérabilités connues.
Répondez entièrement en français.
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

