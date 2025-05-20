
import type { AlgorithmAdvisorOutput } from "@/ai/flows/algorithm-advisor";

export interface SteganographyAlgorithm {
  id: string;
  name: string;
  description: string;
  supportedFileTypes: string[]; // e.g., ['image/png', 'audio/mpeg', 'text/plain']
  isMetadataBased?: boolean; // Flag for metadata algorithms
}

export type OperationMode = 'embed' | 'extract';

export interface CapacityInfo {
  capacityBytes: number;
  width: number; // Peut être 0 si non applicable (ex: audio)
  height: number; // Peut être 0 si non applicable (ex: audio)
  isEstimate?: boolean; // True if the capacity is a general estimate (for metadata algos)
}

export interface StegToolState {
  carrierFile: File | null;
  fileName: string | null;
  filePreviewUrl: string | null; // Preview of original uploaded file or Object URL for audio/image
  stegoFileDataUri: string | null; // Object URL or Data URI of the image/audio with embedded message (after embed operation)
  
  messageToEmbed: string; 
  extractedMessage: string | null; 

  selectedAlgorithmId: string | null;
  aiSuggestion: AlgorithmAdvisorOutput | null; // Utilisé sur la page d'accueil
  
  isProcessing: boolean; 
  isExporting: boolean; 
  isAdvisorLoading: boolean; // Utilisé sur la page d'accueil
  
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

export const lsbPngAlgorithm: SteganographyAlgorithm = { 
  id: 'lsb_image_png', 
  name: 'LSB (Image PNG)', 
  description: 'Intégration par bit de poids faible pour les images PNG.', 
  supportedFileTypes: ['image/png'] 
};

export const pngMetadataTextAlgorithm: SteganographyAlgorithm = {
  id: 'png_metadata_text',
  name: 'Métadonnées PNG (tEXt Chunk)',
  description: 'Cache le message dans un chunk tEXt (commentaire personnalisé) d\'un fichier PNG. N\'altère pas les pixels.',
  supportedFileTypes: ['image/png'],
  isMetadataBased: true,
};

export const lsbAudioWavAlgorithm: SteganographyAlgorithm = {
  id: 'lsb_audio_wav',
  name: 'LSB (Audio WAV - 16 bits)',
  description: 'Intégration par bit de poids faible pour fichiers audio WAV (PCM 16 bits).',
  supportedFileTypes: ['audio/wav', 'audio/wave', 'audio/x-wav'],
};

export const wavMetadataCommentAlgorithm: SteganographyAlgorithm = {
  id: 'wav_metadata_comment',
  name: 'Métadonnées WAV (Commentaire INFO)',
  description: 'Cache le message dans le champ commentaire (ICMT) de l\'en-tête INFO d\'un fichier WAV. Moins robuste mais n\'altère pas l\'audio.',
  supportedFileTypes: ['audio/wav', 'audio/wave', 'audio/x-wav'],
  isMetadataBased: true,
};

export const mockAlgorithms: SteganographyAlgorithm[] = [
  lsbPngAlgorithm,
  pngMetadataTextAlgorithm,
  lsbAudioWavAlgorithm,
  wavMetadataCommentAlgorithm,
  { id: 'dct_jpeg', name: 'DCT (JPEG) - Simulé', description: 'Basé sur la transformée en cosinus discrète, pour les images JPEG (simulation).', supportedFileTypes: ['image/jpeg', 'image/jpg'] },
  { id: 'metadata_pdf', name: 'Dissimulation de Métadonnées (PDF) - Simulé', description: 'Cache les données dans les champs de métadonnées PDF (simulation).', supportedFileTypes: ['application/pdf'] },
  { id: 'whitespace_text', name: 'Stéganographie par Espaces (Texte) - Simulé', description: 'Utilise des caractères d\'espacement pour cacher des données dans les fichiers texte (simulation).', supportedFileTypes: ['text/plain'] },
];

