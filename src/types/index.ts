import type { AlgorithmAdvisorOutput } from "@/ai/flows/algorithm-advisor";

export interface SteganographyAlgorithm {
  id: string;
  name: string;
  description: string;
  supportedFileTypes: string[]; // e.g., ['image/png', 'image/jpeg', 'audio/mpeg']
}

export interface HideawayState {
  carrierFile: File | null;
  fileName: string | null;
  filePreviewUrl: string | null;
  message: string;
  selectedAlgorithmId: string | null;
  aiSuggestion: AlgorithmAdvisorOutput | null;
  isEmbedding: boolean;
  isExporting: boolean;
  isAdvisorLoading: boolean;
  isMessageEmbedded: boolean;
}

export type FileTypeOption = 'image' | 'audio' | 'text' | 'pdf' | 'video';

export const fileTypeOptions: { value: FileTypeOption, label: string }[] = [
  { value: 'image', label: 'Image (PNG, JPG)' },
  { value: 'audio', label: 'Audio (MP3, WAV)' },
  { value: 'text', label: 'Text (TXT, DOCX)' },
  { value: 'pdf', label: 'PDF Document' },
  { value: 'video', label: 'Video (MP4, AVI)' },
];

export const mockAlgorithms: SteganographyAlgorithm[] = [
  { id: 'lsb_image', name: 'LSB (Image/Audio)', description: 'Least Significant Bit embedding, suitable for lossless images and audio.', supportedFileTypes: ['image', 'audio'] },
  { id: 'dct_jpeg', name: 'DCT (JPEG)', description: 'Discrete Cosine Transform based, for JPEG images.', supportedFileTypes: ['image'] },
  { id: 'metadata_pdf', name: 'Metadata Hiding (PDF)', description: 'Hides data within PDF metadata fields.', supportedFileTypes: ['pdf'] },
  { id: 'whitespace_text', name: 'Whitespace Steganography (Text)', description: 'Uses whitespace characters to hide data in text files.', supportedFileTypes: ['text'] },
  { id: 'frame_video', name: 'Frame Interleaving (Video)', description: 'Embeds data across video frames.', supportedFileTypes: ['video'] },
  { id: 'generic', name: 'Generic Appending (Any File)', description: 'Appends data to the end of any file. Less secure.', supportedFileTypes: ['image', 'audio', 'text', 'pdf', 'video'] },
];
