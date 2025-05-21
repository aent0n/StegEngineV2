// File overview: Provides functions for audio steganography,
// including LSB and metadata-based methods for WAV files.

import type { CapacityInfo } from '@/types';

const MESSAGE_LENGTH_BYTES_METADATA = 4; 
const METADATA_CAPACITY_ESTIMATE_BYTES = 2048; 

// LSB Specific Constants
const MESSAGE_LENGTH_BITS_LSB = 32; 

// UTF-8 Helpers
function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function utf8Decode(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (e) {
    console.error("Erreur de décodage UTF-8:", e);
    throw new Error("Impossible d'extraire le message : encodage UTF-8 invalide ou caractères corrompus.");
  }
}

function textToBinary(text: string): string {
  const bytes = utf8Encode(text);
  let binaryString = "";
  for (const byte of bytes) {
    binaryString += byte.toString(2).padStart(8, '0');
  }
  return binaryString;
}

function binaryToText(binary: string): string {
  if (binary.length % 8 !== 0) {
    throw new Error("Impossible d'extraire le message : la longueur des données binaires LSB est invalide.");
  }
  const bytes = new Uint8Array(binary.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    const byteString = binary.substring(i * 8, (i + 1) * 8);
    bytes[i] = parseInt(byteString, 2);
  }
  return utf8Decode(bytes);
}

function numberToBinary(num: number, bits: number): string {
  const binary = num.toString(2);
  return '0'.repeat(Math.max(0, bits - binary.length)) + binary;
}

// WAV Chunk Helpers
interface WavChunk {
  id: string;
  size: number;
  offset: number; 
  dataOffset: number; 
}

function findChunk(view: DataView, chunkIdToFind: string, startOffset: number = 0): WavChunk | null {
  let offset = startOffset;
  while (offset < view.byteLength - 8) {
    const id = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
    const size = view.getUint32(offset + 4, true);
    if (id === chunkIdToFind) {
      return { id, size, offset, dataOffset: offset + 8 };
    }
    offset += 8 + size;
    if (size % 2 !== 0) offset++; // Pad byte
  }
  return null;
}

interface ListInfoChunk extends WavChunk {
  listType: string;
}

function findListChunk(view: DataView, listTypeToFind: string, startOffset: number = 0): ListInfoChunk | null {
  let offset = startOffset;
  while (offset < view.byteLength - 12) {
    const id = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
    const size = view.getUint32(offset + 4, true); 
    const listType = String.fromCharCode(view.getUint8(offset + 8), view.getUint8(offset + 9), view.getUint8(offset + 10), view.getUint8(offset + 11));

    if (id === 'LIST' && listType === listTypeToFind) {
      return { id, size, listType, offset, dataOffset: offset + 12 };
    }
    offset += 8 + size;
    if (size % 2 !== 0) offset++;
  }
  return null;
}


function findSubChunk(view: DataView, parentChunkDataOffset: number, parentChunkDataSize: number, subChunkIdToFind: string): WavChunk | null {
  let offset = parentChunkDataOffset;
  const endOffset = parentChunkDataOffset + parentChunkDataSize;
  while (offset < endOffset - 8) {
    const id = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
    const size = view.getUint32(offset + 4, true);
    if (id === subChunkIdToFind) {
      return { id, size, offset, dataOffset: offset + 8 };
    }
    offset += 8 + size;
    if (size % 2 !== 0) offset++;
  }
  return null;
}


// WAV Header Interface and Parser
interface WavHeader {
  riffId: string;
  fileSize: number;
  waveId: string;
  fmtId: string;
  fmtSize: number;
  audioFormat: number;
  numChannels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitsPerSample: number;
  dataId: string;
  dataSize: number;
  dataOffset: number; 
  headerSize: number; 
}

function parseWavHeader(buffer: ArrayBuffer): WavHeader | null {
  const view = new DataView(buffer);
  if (view.byteLength < 44) {
      console.error("File too small to be a valid WAV file");
      return null;
  }

  const header: Partial<WavHeader> = {};
  let offset = 0;

  header.riffId = String.fromCharCode(view.getUint8(offset++), view.getUint8(offset++), view.getUint8(offset++), view.getUint8(offset++));
  if (header.riffId !== 'RIFF') {
    console.error("Not a RIFF file"); return null;
  }
  header.fileSize = view.getUint32(offset, true); offset += 4;
  header.waveId = String.fromCharCode(view.getUint8(offset++), view.getUint8(offset++), view.getUint8(offset++), view.getUint8(offset++));
  if (header.waveId !== 'WAVE') {
    console.error("Not a WAVE file"); return null;
  }

  const fmtChunk = findChunk(view, 'fmt ', offset);
  if (!fmtChunk) {
    console.error("WAV 'fmt ' chunk not found."); return null;
  }
  header.fmtId = fmtChunk.id;
  header.fmtSize = fmtChunk.size;
  offset = fmtChunk.dataOffset;

  header.audioFormat = view.getUint16(offset, true); offset += 2;
  header.numChannels = view.getUint16(offset, true); offset += 2;
  header.sampleRate = view.getUint32(offset, true); offset += 4;
  header.byteRate = view.getUint32(offset, true); offset += 4;
  header.blockAlign = view.getUint16(offset, true); offset += 2;
  header.bitsPerSample = view.getUint16(offset, true); offset += 2;
  
  offset = fmtChunk.dataOffset + fmtChunk.size;
  if (fmtChunk.size % 2 !== 0) offset++;


  const dataChunk = findChunk(view, 'data', 12); 
  if (!dataChunk) {
    console.error("WAV 'data' chunk not found."); return null;
  }
  header.dataId = dataChunk.id;
  header.dataSize = dataChunk.size;
  header.dataOffset = dataChunk.dataOffset;
  header.headerSize = dataChunk.offset; 

  return header as WavHeader;
}

// Capacity Info
export async function getAudioCapacityInfo(file: File, algorithmId: string): Promise<CapacityInfo> {
  const buffer = await file.arrayBuffer();
  const header = parseWavHeader(buffer);

  if (!header) {
    throw new Error("En-tête WAV invalide ou non reconnu.");
  }

  if (algorithmId === 'lsb_audio_wav') {
    if (header.bitsPerSample !== 16 || header.audioFormat !== 1) {
      throw new Error("Format WAV non supporté pour LSB. Seuls les WAV PCM 16 bits sont pris en charge.");
    }
    const numSamples = header.dataSize / (header.bitsPerSample / 8);
    const totalBitsAvailable = numSamples;
    if (totalBitsAvailable < MESSAGE_LENGTH_BITS_LSB) {
      return { capacityBytes: 0, width: 0, height: 0, isEstimate: false };
    }
    const bitsForPayload = totalBitsAvailable - MESSAGE_LENGTH_BITS_LSB;
    return { capacityBytes: Math.floor(bitsForPayload / 8), width: 0, height: 0, isEstimate: false };
  } else if (algorithmId === 'wav_metadata_comment') {
    return { capacityBytes: METADATA_CAPACITY_ESTIMATE_BYTES, width: 0, height: 0, isEstimate: true };
  }
  throw new Error("Algorithme audio non reconnu pour le calcul de capacité.");
}

// LSB Audio Steganography
export async function embedMessageInLSBAudio(file: File, message: string): Promise<string> {
  const buffer = await file.arrayBuffer();
  const header = parseWavHeader(buffer);

  if (!header || header.bitsPerSample !== 16 || header.audioFormat !== 1) {
    throw new Error("Format WAV non supporté pour l'intégration LSB. Seuls les WAV PCM 16 bits sont pris en charge.");
  }
  
  const capacityInfo = await getAudioCapacityInfo(file, 'lsb_audio_wav');
  const messageBinary = textToBinary(message);
  const messageLengthInBits = messageBinary.length;

  if (Math.ceil(messageLengthInBits / 8) > capacityInfo.capacityBytes) {
    throw new Error(`Message trop long (${Math.ceil(messageLengthInBits / 8)} octets) pour LSB audio (capacité: ${capacityInfo.capacityBytes} octets).`);
  }

  const messageLengthBinary = numberToBinary(messageLengthInBits, MESSAGE_LENGTH_BITS_LSB);
  const dataToEmbedBinary = messageLengthBinary + messageBinary;

  const newBuffer = buffer.slice(0);
  const samplesView = new Int16Array(newBuffer, header.dataOffset, header.dataSize / 2);

  let bitIndex = 0;
  for (let i = 0; i < samplesView.length && bitIndex < dataToEmbedBinary.length; i++) {
    const bitToEmbed = parseInt(dataToEmbedBinary[bitIndex], 10);
    samplesView[i] = (samplesView[i] & 0xFFFE) | bitToEmbed;
    bitIndex++;
  }

  const blob = new Blob([newBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export async function extractMessageFromLSBAudio(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const header = parseWavHeader(buffer);

  if (!header || header.bitsPerSample !== 16 || header.audioFormat !== 1) {
    throw new Error("Format WAV non supporté pour l'extraction LSB. Seuls les WAV PCM 16 bits sont pris en charge.");
  }

  const samplesView = new Int16Array(buffer, header.dataOffset, header.dataSize / 2);
  let extractedLengthBits = '';
  for (let i = 0; i < MESSAGE_LENGTH_BITS_LSB && i < samplesView.length; i++) {
    extractedLengthBits += (samplesView[i] & 1).toString();
  }

  if (extractedLengthBits.length < MESSAGE_LENGTH_BITS_LSB) {
     throw new Error("Impossible d'extraire la longueur LSB complète. Fichier audio trop court ou corrompu.");
  }
  const messageLengthInBits = parseInt(extractedLengthBits, 2);

  if (isNaN(messageLengthInBits) || messageLengthInBits < 0) {
    throw new Error("Longueur de message LSB cachée invalide.");
  }
  if (messageLengthInBits === 0) return "";

  const numSamples = header.dataSize / (header.bitsPerSample / 8);
  const totalBitsAvailableForPayload = numSamples - MESSAGE_LENGTH_BITS_LSB;
  if (messageLengthInBits > totalBitsAvailableForPayload) {
      throw new Error(`Longueur de message LSB annoncée (${Math.ceil(messageLengthInBits/8)} octets) dépasse la capacité. Fichier corrompu ?`);
  }
  
  let extractedMessageBits = '';
  for (let i = MESSAGE_LENGTH_BITS_LSB; i < samplesView.length && extractedMessageBits.length < messageLengthInBits; i++) {
    extractedMessageBits += (samplesView[i] & 1).toString();
  }

  if (extractedMessageBits.length < messageLengthInBits) {
    throw new Error("N'a pas pu extraire le message LSB complet. Fichier audio corrompu ou incomplet.");
  }
  return binaryToText(extractedMessageBits);
}


// WAV Metadata (INFO Comment) Steganography
function createIcmtChunk(message: string): Uint8Array {
  const messageBytes = utf8Encode(message);
  const payloadLength = messageBytes.length;
  
  const icmtData = new Uint8Array(MESSAGE_LENGTH_BYTES_METADATA + payloadLength);
  const view = new DataView(icmtData.buffer);
  view.setUint32(0, payloadLength, true); 
  icmtData.set(messageBytes, MESSAGE_LENGTH_BYTES_METADATA);

  const chunkDataSize = icmtData.length;
  const paddedChunkDataSize = chunkDataSize + (chunkDataSize % 2);

  const icmtChunk = new Uint8Array(8 + paddedChunkDataSize);
  const icmtView = new DataView(icmtChunk.buffer);

  icmtView.setUint8(0, 'I'.charCodeAt(0));
  icmtView.setUint8(1, 'C'.charCodeAt(0));
  icmtView.setUint8(2, 'M'.charCodeAt(0));
  icmtView.setUint8(3, 'T'.charCodeAt(0));
  icmtView.setUint32(4, chunkDataSize, true);
  icmtChunk.set(icmtData, 8);
  return icmtChunk;
}

export async function embedMessageInWavMetadata(file: File, message: string): Promise<string> {
  const buffer = await file.arrayBuffer();
  const originalView = new DataView(buffer);

  const messageBytesLength = utf8Encode(message).length;
  if (messageBytesLength > METADATA_CAPACITY_ESTIMATE_BYTES - MESSAGE_LENGTH_BYTES_METADATA) {
      throw new Error(`Message trop long (${messageBytesLength} octets) pour le champ commentaire (capacité estimée: ${METADATA_CAPACITY_ESTIMATE_BYTES - MESSAGE_LENGTH_BYTES_METADATA} octets).`);
  }

  const newIcmtChunkBytes = createIcmtChunk(message);

  const dataChunk = findChunk(originalView, 'data', 12);
  if (!dataChunk) throw new Error("Chunk 'data' introuvable dans le fichier WAV.");
  
  const insertionPoint = dataChunk.offset;

  let existingInfoListChunk: ListInfoChunk | null = null;
  let existingInfoListEndOffset = 0;

  let scanOffset = 12; 
  while(scanOffset < insertionPoint) {
      const currentChunkId = String.fromCharCode(originalView.getUint8(scanOffset), originalView.getUint8(scanOffset+1), originalView.getUint8(scanOffset+2), originalView.getUint8(scanOffset+3));
      const currentChunkSize = originalView.getUint32(scanOffset+4, true);
      if (currentChunkId === 'LIST') {
          const listType = String.fromCharCode(originalView.getUint8(scanOffset+8), originalView.getUint8(scanOffset+9), originalView.getUint8(scanOffset+10), originalView.getUint8(scanOffset+11));
          if (listType === 'INFO') {
              existingInfoListChunk = {id: 'LIST', size: currentChunkSize, listType: 'INFO', offset: scanOffset, dataOffset: scanOffset + 12};
              existingInfoListEndOffset = scanOffset + 8 + currentChunkSize + (currentChunkSize % 2); 
              break;
          }
      }
      scanOffset += 8 + currentChunkSize;
      if(currentChunkSize % 2 !== 0) scanOffset++;
  }

  const part1End = existingInfoListChunk ? existingInfoListChunk.offset : insertionPoint;
  const part1 = buffer.slice(0, part1End);

  let infoSubChunksData: Uint8Array;
  if (existingInfoListChunk) {
      const oldInfoDataStart = existingInfoListChunk.dataOffset;
      const oldInfoDataSize = existingInfoListChunk.size - 4; 
      let tempBuffer = new ArrayBuffer(oldInfoDataSize);
      let tempOffset = 0;
      let currentSubChunkOffset = oldInfoDataStart;
      const endSubChunkScan = oldInfoDataStart + oldInfoDataSize;

      while(currentSubChunkOffset < endSubChunkScan) {
          const subId = String.fromCharCode(originalView.getUint8(currentSubChunkOffset), originalView.getUint8(currentSubChunkOffset+1), originalView.getUint8(currentSubChunkOffset+2), originalView.getUint8(currentSubChunkOffset+3));
          const subSize = originalView.getUint32(currentSubChunkOffset+4, true);
          if (subId !== 'ICMT') { 
              const chunkToCopy = new Uint8Array(buffer, currentSubChunkOffset, 8 + subSize + (subSize % 2));
              new Uint8Array(tempBuffer, tempOffset, chunkToCopy.length).set(chunkToCopy);
              tempOffset += chunkToCopy.length;
          }
          currentSubChunkOffset += 8 + subSize;
          if(subSize % 2 !== 0) currentSubChunkOffset++;
      }
      const combinedSubChunks = new Uint8Array(tempOffset + newIcmtChunkBytes.length);
      combinedSubChunks.set(new Uint8Array(tempBuffer, 0, tempOffset), 0);
      combinedSubChunks.set(newIcmtChunkBytes, tempOffset);
      infoSubChunksData = combinedSubChunks;
  } else {
      infoSubChunksData = newIcmtChunkBytes;
  }

  const infoListChunkSize = 4 + infoSubChunksData.length; 

  const listChunkHeader = new Uint8Array(12);
  const listView = new DataView(listChunkHeader.buffer);
  listView.setUint8(0, 'L'.charCodeAt(0)); listView.setUint8(1, 'I'.charCodeAt(0)); listView.setUint8(2, 'S'.charCodeAt(0)); listView.setUint8(3, 'T'.charCodeAt(0));
  listView.setUint32(4, infoListChunkSize, true); 
  listView.setUint8(8, 'I'.charCodeAt(0)); listView.setUint8(9, 'N'.charCodeAt(0)); listView.setUint8(10, 'F'.charCodeAt(0)); listView.setUint8(11, 'O'.charCodeAt(0));
  
  const finalInfoListChunk = new Uint8Array(12 + infoSubChunksData.length + (infoSubChunksData.length % 2)); 
  finalInfoListChunk.set(listChunkHeader, 0);
  finalInfoListChunk.set(infoSubChunksData, 12);

  const part3Start = existingInfoListChunk ? existingInfoListEndOffset : insertionPoint;
  const part3 = buffer.slice(part3Start);
  
  const newTotalSize = part1.byteLength + finalInfoListChunk.byteLength + part3.byteLength;
  const newBuffer = new ArrayBuffer(newTotalSize);
  const newView = new DataView(newBuffer);
  
  new Uint8Array(newBuffer).set(new Uint8Array(part1), 0);
  new Uint8Array(newBuffer).set(finalInfoListChunk, part1.byteLength);
  new Uint8Array(newBuffer).set(new Uint8Array(part3), part1.byteLength + finalInfoListChunk.byteLength);

  newView.setUint32(4, newTotalSize - 8, true);

  const blob = new Blob([newBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}


export async function extractMessageFromWavMetadata(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  const infoListChunk = findListChunk(view, 'INFO', 12);
  if (!infoListChunk) {
    throw new Error("Aucun chunk 'INFO' trouvé dans le fichier WAV.");
  }

  const icmtChunk = findSubChunk(view, infoListChunk.dataOffset, infoListChunk.size - 4, 'ICMT');
  if (!icmtChunk) {
    throw new Error("Aucun sous-chunk 'ICMT' (commentaire) trouvé dans le chunk INFO.");
  }

  if (icmtChunk.size < MESSAGE_LENGTH_BYTES_METADATA) {
    throw new Error("Chunk ICMT trop petit pour contenir une longueur de message valide.");
  }
  
  const payloadLength = view.getUint32(icmtChunk.dataOffset, true);
  
  if (payloadLength > icmtChunk.size - MESSAGE_LENGTH_BYTES_METADATA) {
      throw new Error("Longueur de message annoncée dans ICMT dépasse la taille du chunk.");
  }
  if (payloadLength === 0) return "";

  const messageBytes = new Uint8Array(buffer, icmtChunk.dataOffset + MESSAGE_LENGTH_BYTES_METADATA, payloadLength);
  return utf8Decode(messageBytes);
}


// Generic Export/Conversion
export async function convertObjectUrlToDataUri(objectUrl: string): Promise<string> {
  const response = await fetch(objectUrl);
  if (!response.ok) throw new Error(`Erreur HTTP lors de la récupération de l'Object URL: ${response.status} ${response.statusText}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        resolve(reader.result as string);
      } else {
        reject(new Error("Impossible de convertir l'Object URL en Data URI (résultat vide)."));
      }
    };
    reader.onerror = (error) => reject(new Error(`Erreur FileReader: ${error}`));
    reader.readAsDataURL(blob);
  });
}

// Dispatcher function for embedding
export async function embedMessageInAudio(file: File, message: string, algorithmId: string): Promise<string> {
  if (algorithmId === 'lsb_audio_wav') {
    return embedMessageInLSBAudio(file, message);
  } else if (algorithmId === 'wav_metadata_comment') {
    return embedMessageInWavMetadata(file, message);
  }
  throw new Error(`Algorithme audio d'intégration non supporté: ${algorithmId}`);
}

// Dispatcher function for extraction
export async function extractMessageFromAudio(file: File, algorithmId: string): Promise<string> {
  if (algorithmId === 'lsb_audio_wav') {
    return extractMessageFromLSBAudio(file);
  } else if (algorithmId === 'wav_metadata_comment') {
    return extractMessageFromWavMetadata(file);
  }
  throw new Error(`Algorithme audio d'extraction non supporté: ${algorithmId}`);
}
