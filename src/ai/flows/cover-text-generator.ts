
'use server';
/**
 * @fileOverview Un agent IA qui génère du texte porteur pour la stéganographie.
 *
 * - generateCoverText - Une fonction qui génère du texte porteur.
 * - CoverTextGeneratorInput - Le type d'entrée pour la fonction generateCoverText.
 * - CoverTextGeneratorOutput - Le type de retour pour la fonction generateCoverText.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CoverTextGeneratorInputSchema = z.object({
  topic: z.string().optional().describe("Un sujet optionnel pour orienter la génération du texte. Laissez vide pour un texte générique."),
});
export type CoverTextGeneratorInput = z.infer<typeof CoverTextGeneratorInputSchema>;

const CoverTextGeneratorOutputSchema = z.object({
  generatedText: z.string().describe("Le texte porteur généré, d'environ 50 à 100 lignes, en français."),
});
export type CoverTextGeneratorOutput = z.infer<typeof CoverTextGeneratorOutputSchema>;

export async function generateCoverText(input: CoverTextGeneratorInput): Promise<CoverTextGeneratorOutput> {
  return coverTextGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'coverTextGeneratorPrompt',
  input: {schema: CoverTextGeneratorInputSchema},
  output: {schema: CoverTextGeneratorOutputSchema},
  prompt: `Vous êtes un assistant IA chargé de générer du texte porteur plausible pour des opérations de stéganographie.
Le texte doit être en français et compter entre 50 et 100 lignes.
Le style doit être neutre et générique, comme un extrait de document, un article de blog factice, ou une section de "Lorem Ipsum" amélioré.
Évitez les sujets sensibles ou controversés. Le but est de fournir un texte qui ne se démarque pas.
Le texte doit être formaté avec des sauts de ligne pour créer plusieurs lignes.

{{#if topic}}
Tentez d'incorporer légèrement le sujet suivant dans le texte : {{{topic}}}
{{else}}
Générez un texte sur un sujet général et anodin.
{{/if}}

Assurez-vous que le texte généré respecte bien la contrainte de nombre de lignes.
Chaque ligne doit être distincte et ne pas être excessivement longue.
Répondez uniquement avec le texte généré, sans préambule ni conclusion.
`,
});

const coverTextGeneratorFlow = ai.defineFlow(
  {
    name: 'coverTextGeneratorFlow',
    inputSchema: CoverTextGeneratorInputSchema,
    outputSchema: CoverTextGeneratorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || !output.generatedText) {
      throw new Error("L'IA n'a pas réussi à générer de texte porteur.");
    }
    // Assurer un minimum de lignes si l'IA ne respecte pas toujours
    const lines = output.generatedText.split('\n');
    if (lines.length < 40) {
        const additionalLinesNeeded = 40 - lines.length;
        const loremLine = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
        for (let i = 0; i < additionalLinesNeeded; i++) {
            lines.push(loremLine);
        }
        output.generatedText = lines.join('\n');
    }
    return output;
  }
);

    