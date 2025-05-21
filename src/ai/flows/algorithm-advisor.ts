
'use server';

/**
 * @fileOverview Un agent IA qui suggère le meilleur algorithme de stéganographie
 * pour un type de fichier et un message donnés, choisi parmi une liste d'algorithmes disponibles.
 *
 * - suggestAlgorithm - Une fonction qui suggère l'algorithme de stéganographie optimal.
 * - AlgorithmAdvisorInput - Le type d'entrée pour la fonction suggestAlgorithm.
 * - AlgorithmAdvisorOutput - Le type de retour pour la fonction suggestAlgorithm.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AlgorithmAdvisorInputSchema = z.object({
  fileType: z
    .string()
    .describe("Le type de fichier pour cacher le message (ex: 'image', 'audio', 'texte', 'pdf')."),
  message: z.string().describe('Le message à cacher.'),
  availableAlgorithms: z.array(z.string()).describe('Liste des noms des algorithmes disponibles parmi lesquels choisir.'),
});
export type AlgorithmAdvisorInput = z.infer<typeof AlgorithmAdvisorInputSchema>;

const AlgorithmAdvisorOutputSchema = z.object({
  algorithm: z.string().describe("L'algorithme de stéganographie suggéré, choisi parmi la liste fournie."),
  rationale: z
    .string()
    .describe("La justification pour le choix de l'algorithme suggéré."),
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
La justification doit être concise et aller à l'essentiel (1-2 phrases maximum), spécifiquement adaptée au type de fichier et au message fournis, en considérant l'impact sur la taille du fichier, la sécurité et la facilité d'extraction.
Évitez de suggérer des algorithmes qui ne sont pas pratiques, qui ont des vulnérabilités connues, ou qui ne sont pas dans la liste fournie.
Ne suggérez pas d'algorithmes pour des types de fichiers non listés.
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
