// File overview: Development-only Genkit configuration and flow imports.
// Used for local Genkit development server.

import { config } from 'dotenv';
config();

import '@/ai/flows/algorithm-advisor.ts';
import '@/ai/flows/cover-text-generator.ts';
