
// Fonctions pour la stéganographie LSB sur fichiers WAV 16 bits

import type { CapacityInfo } from '@/types';

const MESSAGE_LENGTH_BITS_AUDIO = 32; // 32 bits pour stocker la longueur du message en bits

/**
 * Encode un texte en Uint8Array via UTF-8.
 */
function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/**
 * Décode un Uint8Array (UTF-8) en chaîne de caractères.
 */
function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Convertit un texte en sa représentation binaire UTF-8.
 */
function textToBinary(text: string): string {
  const bytes = utf8Encode(text);
  let binaryString = "";
  for (const byte of bytes) {
    binaryString += byte.toString(2).padStart(8, '0');
  }
  return binaryString;
}

/**
 * Convertit une chaîne binaire (représentant des octets UTF-8) en texte.
 */
function binaryToText(binary: string): string {
  if (binary.length % 8 !== 0) {
    throw new Error("Impossible d'extraire le message : la longueur des données binaires est invalide.");
  }
  const bytes = new Uint8Array(binary.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    const byteString = binary.substring(i * 8, (i + 1) * 8);
    bytes[i] = parseInt(byteString, 2);
  }
  try {
    return utf8Decode(bytes);
  } catch (e) {
    console.error("Erreur de décodage UTF-8:", e);
    throw new Error("Impossible d'extraire le message : encodage UTF-8 invalide. Le message est peut-être corrompu.");
  }
}

/**
 * Convertit un nombre décimal en chaîne binaire, paddée à un nombre de bits spécifique.
 */
function numberToBinary(num: number, bits: number): string {
  const binary = num.toString(2);
  return '0'.repeat(Math.max(0, bits - binary.length)) + binary;
}

interface WavHeader {
  riffId: string; // "RIFF"
  fileSize: number; // Taille totale du fichier moins 8 octets
  waveId: string; // "WAVE"
  fmtId: string; // "fmt "
  fmtSize: number; // Taille du chunk fmt (ex: 16 pour PCM)
  audioFormat: number; // Format audio (1 pour PCM)
  numChannels: number; // Nombre de canaux (1 mono, 2 stereo)
  sampleRate: number; // Fréquence d'échantillonnage (ex: 44100)
  byteRate: number; // sampleRate * numChannels * bitsPerSample/8
  blockAlign: number; // numChannels * bitsPerSample/8
  bitsPerSample: number; // Bits par échantillon (ex: 8, 16, 24)
  dataId: string; // "data"
  dataSize: number; // Taille des données audio
  headerSize: number; // Taille totale de l'en-tête (jusqu'au début des données)
}

/**
 * Analyse l'en-tête d'un fichier WAV.
 * Supporte principalement les WAV PCM simples.
 */
function parseWavHeader(buffer: ArrayBuffer): WavHeader | null {
  const view = new DataView(buffer);
  let offset = 0;

  const header: Partial<WavHeader> = {};

  header.riffId = String.fromCharCode(view.getUint8(offset++), view.getUint8(offset++), view.getUint8(offset++), view.getUint8(offset++));
  if (header.riffId !== 'RIFF') {
    console.error("Not a RIFF file");
    return null;
  }

  header.fileSize = view.getUint32(offset, true);
  offset += 4;

  header.waveId = String.fromCharCode(view.getUint8(offset++), view.getUint8(offset++), view.getUint8(offset++), view.getUint8(offset++));
  if (header.waveId !== 'WAVE') {
    console.error("Not a WAVE file");
    return null;
  }

  // Find 'fmt ' chunk
  while (offset < view.byteLength - 4) {
    const chunkId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset+1), view.getUint8(offset+2), view.getUint8(offset+3));
    offset += 4;
    const chunkSize = view.getUint32(offset, true);
    offset += 4;

    if (chunkId === 'fmt ') {
      header.fmtId = chunkId;
      header.fmtSize = chunkSize;
      header.audioFormat = view.getUint16(offset, true); offset += 2;
      header.numChannels = view.getUint16(offset, true); offset += 2;
      header.sampleRate = view.getUint32(offset, true); offset += 4;
      header.byteRate = view.getUint32(offset, true); offset += 4;
      header.blockAlign = view.getUint16(offset, true); offset += 2;
      header.bitsPerSample = view.getUint16(offset, true); offset += 2;
      offset += chunkSize - 16; // Skip any extra fmt bytes
    } else if (chunkId === 'data') {
      header.dataId = chunkId;
      header.dataSize = chunkSize;
      header.headerSize = offset; // Position where data chunk content begins
      return header as WavHeader; // Found data, assume header is complete
    } else {
      // Skip other chunks
      offset += chunkSize;
    }
    // Align to next word boundary if chunk size is odd
    if (chunkSize % 2 !== 0) {
      offset++;
    }
  }

  console.error("WAV 'data' chunk not found or 'fmt ' chunk missing before 'data'.");
  return null;
}


/**
 * Calcule la capacité pour un fichier WAV basé sur son header.
 * Pour LSB 16-bit, 1 bit par échantillon.
 */
export async function getAudioCapacityInfo(file: File): Promise<CapacityInfo> {
  const buffer = await file.arrayBuffer();
  const header = parseWavHeader(buffer);

  if (!header || header.bitsPerSample !== 16 || header.audioFormat !== 1) {
    throw new Error("Format WAV non supporté ou en-tête invalide. Seuls les WAV PCM 16 bits sont pris en charge pour le calcul de capacité.");
  }

  const numSamples = header.dataSize / (header.bitsPerSample / 8);
  const totalBitsAvailable = numSamples; // 1 bit per sample (1 channel assumed, or LSB on one channel if stereo)
  
  if (totalBitsAvailable < MESSAGE_LENGTH_BITS_AUDIO) {
    return { capacityBytes: 0, width: 0, height: 0 };
  }
  const bitsForPayload = totalBitsAvailable - MESSAGE_LENGTH_BITS_AUDIO;
  return {
    capacityBytes: Math.floor(bitsForPayload / 8),
    width: 0, // Non applicable pour l'audio
    height: 0, // Non applicable pour l'audio
  };
}


/**
 * Intègre un message dans un fichier audio WAV (16-bit PCM).
 */
export async function embedMessageInAudio(file: File, message: string): Promise<string> {
  const buffer = await file.arrayBuffer();
  const header = parseWavHeader(buffer);

  if (!header || header.bitsPerSample !== 16 || header.audioFormat !== 1) {
    throw new Error("Format WAV non supporté pour l'intégration. Seuls les WAV PCM 16 bits sont pris en charge.");
  }
  
  const capacity = await getAudioCapacityInfo(file);
  const messageBinary = textToBinary(message);
  const messageLengthInBits = messageBinary.length;

  if (Math.ceil(messageLengthInBits / 8) > capacity.capacityBytes) {
    throw new Error(
      `Message trop long (${Math.ceil(messageLengthInBits / 8)} octets) pour le fichier audio (capacité: ${capacity.capacityBytes} octets).`
    );
  }

  const messageLengthBinary = numberToBinary(messageLengthInBits, MESSAGE_LENGTH_BITS_AUDIO);
  const dataToEmbedBinary = messageLengthBinary + messageBinary;

  // Create a new buffer for the modified WAV data
  const newBuffer = buffer.slice(0); // Create a mutable copy
  const samplesView = new Int16Array(newBuffer, header.headerSize, header.dataSize / 2); // dataSize is in bytes, Int16Array works with 2-byte elements

  let bitIndex = 0;
  for (let i = 0; i < samplesView.length && bitIndex < dataToEmbedBinary.length; i++) {
    const bitToEmbed = parseInt(dataToEmbedBinary[bitIndex], 10);
    samplesView[i] = (samplesView[i] & 0xFFFE) | bitToEmbed; // Clear LSB and set new bit
    bitIndex++;
  }

  const blob = new Blob([newBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob); // Return an object URL for the new blob
}


/**
 * Extrait un message caché d'un fichier audio WAV (16-bit PCM).
 */
export async function extractMessageFromAudio(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const header = parseWavHeader(buffer);

  if (!header || header.bitsPerSample !== 16 || header.audioFormat !== 1) {
    throw new Error("Format WAV non supporté pour l'extraction. Seuls les WAV PCM 16 bits sont pris en charge.");
  }

  const samplesView = new Int16Array(buffer, header.headerSize, header.dataSize / 2);

  let extractedLengthBits = '';
  for (let i = 0; i < MESSAGE_LENGTH_BITS_AUDIO && i < samplesView.length; i++) {
    extractedLengthBits += (samplesView[i] & 1).toString();
  }

  if (extractedLengthBits.length < MESSAGE_LENGTH_BITS_AUDIO) {
     throw new Error("Impossible d'extraire la longueur complète du message. Fichier audio trop court ou corrompu.");
  }
  const messageLengthInBits = parseInt(extractedLengthBits, 2);

  if (isNaN(messageLengthInBits) || messageLengthInBits < 0) {
    throw new Error("Impossible de déterminer la longueur du message caché, ou longueur invalide.");
  }
  if (messageLengthInBits === 0) {
    return ""; // Valid empty message
  }

  // Check against theoretical max capacity based on file
  const numSamples = header.dataSize / (header.bitsPerSample / 8);
  const totalBitsAvailableForPayload = numSamples - MESSAGE_LENGTH_BITS_AUDIO;
  if (messageLengthInBits > totalBitsAvailableForPayload) {
      throw new Error(`La longueur de message annoncée (${Math.ceil(messageLengthInBits/8)} octets) dépasse la capacité du fichier audio. Le fichier est peut-être corrompu.`);
  }
  
  let extractedMessageBits = '';
  // Start reading from sample index MESSAGE_LENGTH_BITS_AUDIO
  for (let i = MESSAGE_LENGTH_BITS_AUDIO; i < samplesView.length && extractedMessageBits.length < messageLengthInBits; i++) {
    extractedMessageBits += (samplesView[i] & 1).toString();
  }

  if (extractedMessageBits.length < messageLengthInBits) {
    throw new Error("N'a pas pu extraire le message complet. Fichier audio corrompu ou incomplet.");
  }

  return binaryToText(extractedMessageBits);
}

/**
 * Pour l'exportation, nous créons un Data URI à partir de l'Object URL qui a été généré par embedMessageInAudio.
 * L'Object URL est temporaire et lié à la session du navigateur.
 */
export async function convertObjectUrlToDataUri(objectUrl: string): Promise<string> {
  const response = await fetch(objectUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        resolve(reader.result as string);
      } else {
        reject(new Error("Impossible de convertir l'Object URL en Data URI."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
