
import type { AlgorithmAdvisorOutput } from "@/ai/flows/algorithm-advisor";

export interface SteganographyAlgorithm {
  id: string;
  name: string;
  description: string;
  supportedFileTypes: string[]; // e.g., ['image/png', 'audio/wav', 'text/plain']
  isMetadataBased?: boolean;
  isTextBased?: boolean;
  estimatedCapacity?: number; // For metadata-based algorithms primarily
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

export type FileTypeOptionValue = 'image' | 'audio' | 'text' | 'pdf';

export const fileTypeOptions: { value: FileTypeOptionValue, label: string }[] = [
  { value: 'image', label: 'Image (PNG)' },
  { value: 'audio', label: 'Audio (WAV)' },
  { value: 'text', label: 'Texte (TXT)' },
  { value: 'pdf', label: 'Document PDF' },
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
  estimatedCapacity: 2048, // Example estimated capacity
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
  estimatedCapacity: 1024, // Example estimated capacity
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

export const pdfMetadataAlgorithm: SteganographyAlgorithm = {
  id: 'pdf_metadata_simulated', // ID remains same as functions in pdfSteganography.ts use this
  name: 'Métadonnées PDF (Champ Sujet)',
  description: 'Dissimulation de données dans le champ "Sujet" des métadonnées d\'un fichier PDF.',
  supportedFileTypes: ['application/pdf'],
  isMetadataBased: true,
  estimatedCapacity: 2048, // Example estimated capacity
};

export const mockAlgorithms: SteganographyAlgorithm[] = [
  lsbPngAlgorithm,
  pngMetadataTextAlgorithm,
  lsbAudioWavAlgorithm,
  wavMetadataCommentAlgorithm,
  whitespaceTextAlgorithm,
  zeroWidthCharsTextAlgorithm,
  pdfMetadataAlgorithm,
];
