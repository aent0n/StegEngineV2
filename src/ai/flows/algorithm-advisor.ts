
'use server';

/**
 * @fileOverview An AI agent that suggests the best steganography algorithm
 * for a given file type and message, chosen from a list of available algorithms.
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
    .describe("Le type de fichier pour cacher le message (ex: 'image', 'audio', 'texte', 'pdf')."), // Removed 'vidéo'
  message: z.string().describe('Le message à cacher.'),
  availableAlgorithms: z.array(z.string()).describe('Liste des noms des algorithmes disponibles parmi lesquels choisir.'),
});
export type AlgorithmAdvisorInput = z.infer<typeof AlgorithmAdvisorInputSchema>;

const AlgorithmAdvisorOutputSchema = z.object({
  algorithm: z.string().describe("L'algorithme de stéganographie suggéré, choisi parmi la liste fournie."),
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
  prompt: `Vous êtes un expert en algorithmes de stéganographie.
Étant donné un type de fichier, un message à cacher, et une liste d'algorithmes disponibles,
vous devez suggérer le meilleur algorithme de stéganographie à utiliser EN LE CHOISISSANT EXCLUSIVEMENT PARMI LA LISTE SUIVANTE :
{{#each availableAlgorithms}}
- {{{this}}}
{{/each}}

Expliquez votre raisonnement en français.

Type de Fichier : {{{fileType}}}
Message : {{{message}}}

Suggérez le meilleur algorithme de la liste fournie et expliquez pourquoi c'est le choix le plus approprié.
Assurez-vous que l'algorithme que vous suggérez peut gérer le type de fichier spécifique et qu'il est présent dans la liste ci-dessus.
La justification doit être concise et aller à l'essentiel (1-2 phrases maximum), en considérant l'impact sur la taille du fichier, la sécurité et la facilité d'extraction.
Évitez de suggérer des algorithmes qui ne sont pas pratiques, qui ont des vulnérabilités connues, ou qui ne sont pas dans la liste fournie.
Ne suggérez pas d'algorithmes pour des types de fichiers non listés (ex: vidéo).
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
