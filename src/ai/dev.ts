// Résumé du fichier : Configuration et importations de flux Genkit pour le développement uniquement.
// Utilisé pour le serveur de développement local Genkit.

import { config } from 'dotenv';
config();

import '@/ai/flows/algorithm-advisor.ts';
import '@/ai/flows/cover-text-generator.ts';
