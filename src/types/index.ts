
import type { AlgorithmAdvisorOutput } from "@/ai/flows/algorithm-advisor";

export interface SteganographyAlgorithm {
  id: string;
  name: string;
  description: string;
  supportedFileTypes: string[]; // e.g., ['image/png', 'audio/wav', 'text/plain']
  isMetadataBased?: boolean; 
  isTextBased?: boolean; 
}

export type OperationMode = 'embed' | 'extract';

export interface CapacityInfo {
  capacityBytes: number;
  width: number; 
  height: number; 
  isEstimate?: boolean; 
}

export interface StegToolState {
  carrierFile: File | null;
  fileName: string | null;
  filePreviewUrl: string | null; 
  stegoFileDataUri: string | null; 
  
  messageToEmbed: string; 
  extractedMessage: string | null; 

  selectedAlgorithmId: string | null;
  aiSuggestion: AlgorithmAdvisorOutput | null; 
  
  isProcessing: boolean; 
  isExporting: boolean; 
  isAdvisorLoading: boolean; 
  
  operationMode: OperationMode;
  statusMessage: { type: 'success' | 'error' | 'info', text: string } | null;
  capacityInfo: CapacityInfo | null;

  coverText?: string;
  stegoText?: string;
  isGeneratingCoverText?: boolean;
}

export type FileTypeOptionValue = 'image' | 'audio' | 'text' | 'pdf' | 'video';

export const fileTypeOptions: { value: FileTypeOptionValue, label: string }[] = [
  { value: 'image', label: 'Image (PNG)' },
  { value: 'audio', label: 'Audio (WAV)' },
  { value: 'text', label: 'Texte (TXT)' },
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

export const whitespaceTextAlgorithm: SteganographyAlgorithm = {
  id: 'whitespace_text_txt',
  name: 'Espaces Blancs (Fin de Ligne)',
  description: 'Cache des données en utilisant des espaces en fin de ligne (1 espace pour "0", 2 pour "1"). Capacité: 1 bit/ligne.',
  supportedFileTypes: ['text/plain'],
  isTextBased: true,
};

export const zeroWidthCharsTextAlgorithm: SteganographyAlgorithm = {
  id: 'zero_width_chars_text_txt',
  name: 'Caractères Largeur Nulle (ZWC)',
  description: 'Cache des données en insérant des caractères Unicode invisibles (U+200B pour "0", U+200C pour "1") après chaque caractère du texte porteur. Capacité: 1 bit/caractère porteur.',
  supportedFileTypes: ['text/plain'],
  isTextBased: true,
};

export const mockAlgorithms: SteganographyAlgorithm[] = [
  lsbPngAlgorithm,
  pngMetadataTextAlgorithm,
  lsbAudioWavAlgorithm,
  wavMetadataCommentAlgorithm,
  whitespaceTextAlgorithm,
  zeroWidthCharsTextAlgorithm,
  { id: 'dct_jpeg', name: 'DCT (JPEG) - Simulé', description: 'Basé sur la transformée en cosinus discrète, pour les images JPEG (simulation).', supportedFileTypes: ['image/jpeg', 'image/jpg'] },
  { id: 'metadata_pdf', name: 'Dissimulation de Métadonnées (PDF) - Simulé', description: 'Cache les données dans les champs de métadonnées PDF (simulation).', supportedFileTypes: ['application/pdf'] },
];

    
