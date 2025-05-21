// File overview: Provides functions for image steganography, specifically for PNG files.
// Includes LSB (Least Significant Bit) and metadata-based (tEXt chunk) methods.

import type { CapacityInfo } from '@/types';

// --- UTF-8 Helpers ---
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

// --- LSB Specific Helpers ---
function textToBinaryLSB(text: string): string {
  const bytes = utf8Encode(text);
  let binaryString = "";
  for (const byte of bytes) {
    binaryString += byte.toString(2).padStart(8, '0');
  }
  return binaryString;
}

function binaryToTextLSB(binary: string): string {
  if (binary.length % 8 !== 0) {
    throw new Error("Impossible d'extraire le message LSB : la longueur des données binaires est invalide.");
  }
  const bytes = new Uint8Array(binary.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    const byteString = binary.substring(i * 8, (i + 1) * 8);
    bytes[i] = parseInt(byteString, 2);
  }
  return utf8Decode(bytes);
}

function numberToBinaryLSB(num: number, bits: number): string {
  const binary = num.toString(2);
  return '0'.repeat(Math.max(0, bits - binary.length)) + binary;
}

async function getImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Impossible d\'obtenir le contexte du canvas.'));
        }
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.width, img.height));
      };
      img.onerror = () => reject(new Error('Échec du chargement de l\'image pour le traitement canvas.'));
      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error('FileReader n\'a pas retourné de résultat.'));
      }
    };
    reader.onerror = () => reject(new Error('Échec de la lecture du fichier.'));
    reader.readAsDataURL(file);
  });
}

const MESSAGE_LENGTH_BITS_LSB = 32; 

function calculateLsbCapacity(imageData: ImageData): number {
  const totalPixels = imageData.width * imageData.height;
  const totalBitsAvailable = totalPixels * 3; 
  if (totalBitsAvailable < MESSAGE_LENGTH_BITS_LSB) {
    return 0; 
  }
  const bitsForPayload = totalBitsAvailable - MESSAGE_LENGTH_BITS_LSB;
  return Math.floor(bitsForPayload / 8); 
}

// --- PNG Chunk Constants & Helpers ---
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const METADATA_CAPACITY_ESTIMATE_BYTES = 2048; 
const PNG_METADATA_KEYWORD = "StegEngineMessage";

// Standard CRC32 checksum function
function crc32(bytes: Uint8Array, start: number = 0, length: number = bytes.length - start): number {
    let crc = 0xFFFFFFFF;
    const crcTable = crc32.table || (crc32.table = (() => {
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let k = 0; k < 8; k++) {
                c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            table[i] = c;
        }
        return table;
    })());

    for (let i = start, l = start + length; i < l; i++) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
    }
    return crc ^ 0xFFFFFFFF;
}
crc32.table = null as unknown as Uint32Array; 


// --- Public Steganography Functions ---

export async function getCapacityInfo(file: File, algorithmId: string): Promise<CapacityInfo> {
  if (file.type !== 'image/png') {
    throw new Error('Seuls les fichiers PNG sont pris en charge pour cet outil.');
  }

  if (algorithmId === 'png_metadata_text') {
    let width = 0, height = 0;
    try { 
        const img = new Image();
        const url = URL.createObjectURL(file);
        await new Promise<void>((resolve, reject) => { // Added <void> for clarity
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Image load failed for dimensions"));
            img.src = url;
        });
        width = img.width;
        height = img.height;
        URL.revokeObjectURL(url);
    } catch (e) { /* ignore, dimensions are optional for estimate */ }
    return { capacityBytes: METADATA_CAPACITY_ESTIMATE_BYTES, width, height, isEstimate: true };
  } else if (algorithmId === 'lsb_image_png') {
    const imageData = await getImageData(file);
    return {
      capacityBytes: calculateLsbCapacity(imageData),
      width: imageData.width,
      height: imageData.height,
      isEstimate: false,
    };
  }
  throw new Error(`Algorithme d'image non reconnu pour le calcul de capacité: ${algorithmId}`);
}


export async function embedMessageInImage(file: File, message: string, algorithmId: string): Promise<string> {
  if (algorithmId === 'lsb_image_png') {
    return embedMessageInLsbPng(file, message);
  } else if (algorithmId === 'png_metadata_text') {
    return embedMessageInPngMetadata(file, message);
  }
  throw new Error(`Algorithme d'intégration d'image non supporté: ${algorithmId}`);
}

export async function extractMessageFromImage(file: File, algorithmId: string): Promise<string> {
  if (algorithmId === 'lsb_image_png') {
    return extractMessageFromLsbPng(file);
  } else if (algorithmId === 'png_metadata_text') {
    return extractMessageFromPngMetadata(file);
  }
  throw new Error(`Algorithme d'extraction d'image non supporté: ${algorithmId}`);
}

// --- LSB PNG Implementation ---
async function embedMessageInLsbPng(file: File, message: string): Promise<string> {
  const imageData = await getImageData(file);
  const capacityBytes = calculateLsbCapacity(imageData);
  const messageBinary = textToBinaryLSB(message);
  const messageLengthInBits = messageBinary.length;

  if (Math.ceil(messageLengthInBits / 8) > capacityBytes) {
    throw new Error(
      `Message trop long (${Math.ceil(messageLengthInBits/8)} octets) pour l'image sélectionnée (capacité LSB: ${capacityBytes} octets).`
    );
  }

  const messageLengthBinary = numberToBinaryLSB(messageLengthInBits, MESSAGE_LENGTH_BITS_LSB);
  const dataToEmbedBinary = messageLengthBinary + messageBinary;

  const data = imageData.data;
  let bitIndex = 0;

  for (let i = 0; i < data.length && bitIndex < dataToEmbedBinary.length; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      if (bitIndex < dataToEmbedBinary.length) {
        const bitToEmbed = parseInt(dataToEmbedBinary[bitIndex], 10);
        data[i + channel] = (data[i + channel] & 0xFE) | bitToEmbed;
        bitIndex++;
      } else {
        break;
      }
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Impossible d\'obtenir le contexte du canvas pour écrire les données modifiées.');
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png'); 
}

async function extractMessageFromLsbPng(file: File): Promise<string> {
  const imageData = await getImageData(file);
  const data = imageData.data;
  let extractedLengthBits = '';
  let lengthBitsRead = 0;

  for (let i = 0; i < data.length && lengthBitsRead < MESSAGE_LENGTH_BITS_LSB; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      if (lengthBitsRead < MESSAGE_LENGTH_BITS_LSB) {
        extractedLengthBits += (data[i + channel] & 1).toString();
        lengthBitsRead++;
      } else {
        break;
      }
    }
  }
  
  if (lengthBitsRead < MESSAGE_LENGTH_BITS_LSB) {
    throw new Error("Impossible d'extraire la longueur LSB complète. Fichier trop petit ou corrompu.");
  }

  const messageLengthInBits = parseInt(extractedLengthBits, 2);

  if (isNaN(messageLengthInBits) || messageLengthInBits < 0) {
    throw new Error("Impossible de déterminer la longueur du message LSB caché, ou format de longueur invalide.");
  }
  if (messageLengthInBits === 0) return "";
  
  const capacityBytes = calculateLsbCapacity(imageData);
  const maxPayloadBits = capacityBytes * 8;

  if (messageLengthInBits > maxPayloadBits) {
      throw new Error(`Longueur de message LSB annoncée (${Math.ceil(messageLengthInBits/8)} octets) dépasse la capacité de l'image (${capacityBytes} octets). Fichier corrompu ?`);
  }

  let extractedMessageBits = '';
  let messageBitsRead = 0;
  let dataStreamBitIndex = 0;

  for (let i = 0; i < data.length && messageBitsRead < messageLengthInBits; i += 4) {
    for (let channel = 0; channel < 3; channel++) { 
      if (dataStreamBitIndex >= MESSAGE_LENGTH_BITS_LSB) { 
        if (messageBitsRead < messageLengthInBits) {
          extractedMessageBits += (data[i + channel] & 1).toString();
          messageBitsRead++;
        } else {
          break; 
        }
      }
      dataStreamBitIndex++;
      if (dataStreamBitIndex >= MESSAGE_LENGTH_BITS_LSB + messageLengthInBits) break;
    }
    if (messageBitsRead >= messageLengthInBits || dataStreamBitIndex >= MESSAGE_LENGTH_BITS_LSB + messageLengthInBits) break; 
  }

  if (messageBitsRead < messageLengthInBits) {
    throw new Error("N'a pas pu extraire le message LSB complet. Fichier corrompu ou incomplet.");
  }
  return binaryToTextLSB(extractedMessageBits);
}


// --- PNG Metadata (tEXt Chunk) Implementation ---
async function embedMessageInPngMetadata(file: File, message: string): Promise<string> {
  const buffer = await file.arrayBuffer();
  const originalBytes = new Uint8Array(buffer);

  if (!originalBytes.slice(0, 8).every((val, idx) => val === PNG_SIGNATURE[idx])) {
    throw new Error("Format de fichier PNG invalide ou signature manquante.");
  }

  const messageBytes = utf8Encode(message);
  const keywordBytes = utf8Encode(PNG_METADATA_KEYWORD);
  
  const textChunkData = new Uint8Array(keywordBytes.length + 1 + messageBytes.length);
  textChunkData.set(keywordBytes, 0);
  textChunkData[keywordBytes.length] = 0; 
  textChunkData.set(messageBytes, keywordBytes.length + 1);

  const newChunks: Uint8Array[] = [];
  let offset = 8; 

  while (offset < originalBytes.length) {
    const view = new DataView(originalBytes.buffer, offset);
    const length = view.getUint32(0, false);
    const typeBytes = originalBytes.slice(offset + 4, offset + 8);
    const type = String.fromCharCode(...typeBytes);
    
    const currentChunk = originalBytes.slice(offset, offset + 12 + length); 

    if (type === 'IEND') { 
      break; 
    }

    if (type === 'tEXt') {
      const currentKeywordBytes = originalBytes.slice(offset + 8, offset + 8 + keywordBytes.length);
      const isOurKeyword = keywordBytes.every((val, idx) => val === currentKeywordBytes[idx]) && originalBytes[offset + 8 + keywordBytes.length] === 0;
      if (!isOurKeyword) {
        newChunks.push(currentChunk);
      }
    } else {
      newChunks.push(currentChunk);
    }
    offset += 12 + length;
  }

  const tEXtTypeBytes = utf8Encode("tEXt");
  const chunkContentForCrc = new Uint8Array(tEXtTypeBytes.length + textChunkData.length);
  chunkContentForCrc.set(tEXtTypeBytes, 0);
  chunkContentForCrc.set(textChunkData, tEXtTypeBytes.length);
  
  const crc = crc32(chunkContentForCrc);

  const newTextChunk = new Uint8Array(12 + textChunkData.length);
  const newChunkView = new DataView(newTextChunk.buffer);
  newChunkView.setUint32(0, textChunkData.length, false); 
  newTextChunk.set(tEXtTypeBytes, 4);                     
  newTextChunk.set(textChunkData, 8);                     
  newChunkView.setUint32(8 + textChunkData.length, crc, false); 

  newChunks.push(newTextChunk);

  const iendChunk = new Uint8Array([0,0,0,0, 73,69,78,68, 174,66,96,130]); 
  newChunks.push(iendChunk);

  let totalNewLength = PNG_SIGNATURE.length;
  newChunks.forEach(chunk => totalNewLength += chunk.length);
  
  const newPngBytes = new Uint8Array(totalNewLength);
  newPngBytes.set(PNG_SIGNATURE, 0);
  let currentPosition = PNG_SIGNATURE.length;
  for (const chunk of newChunks) {
    newPngBytes.set(chunk, currentPosition);
    currentPosition += chunk.length;
  }

  const blob = new Blob([newPngBytes], { type: 'image/png' });
  return URL.createObjectURL(blob);
}

async function extractMessageFromPngMetadata(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (!bytes.slice(0, 8).every((val, idx) => val === PNG_SIGNATURE[idx])) {
    throw new Error("Format de fichier PNG invalide ou signature manquante.");
  }

  let offset = 8;
  const keywordBytes = utf8Encode(PNG_METADATA_KEYWORD);

  while (offset < bytes.length) {
    const view = new DataView(bytes.buffer, offset);
    const length = view.getUint32(0, false);
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);

    if (type === 'tEXt') {
      const chunkDataStart = offset + 8;
      const chunkDataEnd = chunkDataStart + length;
      
      if (length > keywordBytes.length && bytes[chunkDataStart + keywordBytes.length] === 0) { 
        const currentKeyword = bytes.slice(chunkDataStart, chunkDataStart + keywordBytes.length);
        if (keywordBytes.every((val, idx) => val === currentKeyword[idx])) {
          const messageData = bytes.slice(chunkDataStart + keywordBytes.length + 1, chunkDataEnd);
          return utf8Decode(messageData);
        }
      }
    }
    
    if (type === 'IEND') break; 
    offset += 12 + length; 
  }
  return ""; 
}

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
