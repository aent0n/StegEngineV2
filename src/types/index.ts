
import type { AlgorithmAdvisorOutput } from "@/ai/flows/algorithm-advisor";

export interface SteganographyAlgorithm {
  id: string;
  name: string;
  description: string;
  supportedFileTypes: string[]; // e.g., ['image', 'audio', 'text', 'pdf', 'video']
}

export type OperationMode = 'embed' | 'extract';

// This state will be used by individual tool pages, e.g., ImageStegPage
export interface StegToolState {
  carrierFile: File | null;
  fileName: string | null;
  filePreviewUrl: string | null;
  
  messageToEmbed: string; // For embedding
  extractedMessage: string | null; // For displaying extracted message

  selectedAlgorithmId: string | null;
  aiSuggestion: AlgorithmAdvisorOutput | null;
  
  isProcessing: boolean; // True when embedding or extracting
  isExporting: boolean; // True when exporting stego file or saving extracted text
  isAdvisorLoading: boolean;
  
  operationMode: OperationMode;
  statusMessage: { type: 'success' | 'error' | 'info', text: string } | null;
}

export type FileTypeOptionValue = 'image' | 'audio' | 'text' | 'pdf' | 'video';

export const fileTypeOptions: { value: FileTypeOptionValue, label: string }[] = [
  { value: 'image', label: 'Image (PNG, JPG)' },
  { value: 'audio', label: 'Audio (MP3, WAV)' },
  { value: 'text', label: 'Texte (TXT, DOCX)' },
  { value: 'pdf', label: 'Document PDF' },
  { value: 'video', label: 'Vidéo (MP4, AVI)' },
];

export const mockAlgorithms: SteganographyAlgorithm[] = [
  { id: 'lsb_image_audio', name: 'LSB (Image/Audio)', description: 'Intégration par bit de poids faible, adaptée aux images sans perte et à l\'audio.', supportedFileTypes: ['image', 'audio'] },
  { id: 'dct_jpeg', name: 'DCT (JPEG)', description: 'Basé sur la transformée en cosinus discrète, pour les images JPEG.', supportedFileTypes: ['image'] },
  { id: 'metadata_pdf', name: 'Dissimulation de Métadonnées (PDF)', description: 'Cache les données dans les champs de métadonnées PDF.', supportedFileTypes: ['pdf'] },
  { id: 'whitespace_text', name: 'Stéganographie par Espaces (Texte)', description: 'Utilise des caractères d\'espacement pour cacher des données dans les fichiers texte.', supportedFileTypes: ['text'] },
  { id: 'frame_video', name: 'Entrelacement de Trames (Vidéo)', description: 'Intègre des données à travers les trames vidéo.', supportedFileTypes: ['video'] },
  { id: 'generic_append', name: 'Ajout Générique (Tout Fichier)', description: 'Ajoute des données à la fin de n\'importe quel fichier. Moins sécurisé.', supportedFileTypes: ['image', 'audio', 'text', 'pdf', 'video'] },
];
