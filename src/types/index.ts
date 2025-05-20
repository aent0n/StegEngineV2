
import type { AlgorithmAdvisorOutput } from "@/ai/flows/algorithm-advisor";

export interface SteganographyAlgorithm {
  id: string;
  name: string;
  description: string;
  supportedFileTypes: string[]; // e.g., ['image/png', 'audio/mpeg', 'text/plain']
}

export type OperationMode = 'embed' | 'extract';

export interface CapacityInfo {
  capacityBytes: number;
  width: number;
  height: number;
}

export interface StegToolState {
  carrierFile: File | null;
  fileName: string | null;
  filePreviewUrl: string | null; // Preview of original uploaded file
  stegoFileDataUri: string | null; // Data URI of the image with embedded message (after embed operation)
  
  messageToEmbed: string; 
  extractedMessage: string | null; 

  selectedAlgorithmId: string | null;
  aiSuggestion: AlgorithmAdvisorOutput | null; // This is not used on image-steg page anymore
  
  isProcessing: boolean; 
  isExporting: boolean; 
  isAdvisorLoading: boolean; // Not used on image-steg page
  
  operationMode: OperationMode;
  statusMessage: { type: 'success' | 'error' | 'info', text: string } | null;
  capacityInfo: CapacityInfo | null; // To store capacity details
}

export type FileTypeOptionValue = 'image' | 'audio' | 'text' | 'pdf' | 'video';

export const fileTypeOptions: { value: FileTypeOptionValue, label: string }[] = [
  { value: 'image', label: 'Image (PNG, JPG)' },
  { value: 'audio', label: 'Audio (MP3, WAV)' },
  { value: 'text', label: 'Texte (TXT, DOCX)' },
  { value: 'pdf', label: 'Document PDF' },
  { value: 'video', label: 'Vidéo (MP4, AVI)' },
];

// For the functional Image LSB tool, we focus on one algorithm.
// The AI advisor on the homepage can still use a broader list if needed,
// but this page will use a specific one.
export const lsbPngAlgorithm: SteganographyAlgorithm = { 
  id: 'lsb_image_png', 
  name: 'LSB (Image PNG)', 
  description: 'Intégration par bit de poids faible pour les images PNG.', 
  supportedFileTypes: ['image/png'] 
};

export const mockAlgorithms: SteganographyAlgorithm[] = [
  lsbPngAlgorithm, // Primary functional algorithm
  // You can add other simulated algorithms here if the AI advisor on the main page needs them
  { id: 'dct_jpeg', name: 'DCT (JPEG) - Simulé', description: 'Basé sur la transformée en cosinus discrète, pour les images JPEG (simulation).', supportedFileTypes: ['image/jpeg', 'image/jpg'] },
  { id: 'metadata_pdf', name: 'Dissimulation de Métadonnées (PDF) - Simulé', description: 'Cache les données dans les champs de métadonnées PDF (simulation).', supportedFileTypes: ['application/pdf'] },
  { id: 'whitespace_text', name: 'Stéganographie par Espaces (Texte) - Simulé', description: 'Utilise des caractères d\'espacement pour cacher des données dans les fichiers texte (simulation).', supportedFileTypes: ['text/plain'] },
];
