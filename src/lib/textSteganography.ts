
import type { CapacityInfo } from '@/types';

const MESSAGE_LENGTH_BITS_TEXT = 32; // Bits to store the length of the (binary) message

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
    throw new Error("Impossible d'extraire le message : la longueur des données binaires est invalide.");
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
  if (binary.length > bits) {
      throw new Error(`Nombre ${num} trop grand pour être représenté en ${bits} bits.`);
  }
  return '0'.repeat(bits - binary.length) + binary;
}

export async function getTextCapacityInfo(coverText: string): Promise<CapacityInfo> {
  const lines = coverText.split('\n');
  const numLines = lines.length;
  
  // Each line can store 1 bit.
  // We need MESSAGE_LENGTH_BITS_TEXT lines to store the message length.
  const availableBitsForPayload = numLines - MESSAGE_LENGTH_BITS_TEXT;

  if (availableBitsForPayload < 0) {
    return { capacityBytes: 0, width: 0, height: 0, isEstimate: false };
  }
  
  const capacityBytes = Math.floor(availableBitsForPayload / 8);
  return { capacityBytes, width: 0, height: 0, isEstimate: false };
}

export async function embedMessageInText(coverText: string, message: string): Promise<string> {
  if (!coverText) {
    throw new Error("Le texte porteur ne peut pas être vide.");
  }
  if (!message) { // Embedding an empty message is valid, it will encode length 0
    message = "";
  }

  const messageBinary = textToBinary(message);
  const messageLengthInBits = messageBinary.length;

  const { capacityBytes: maxCapacityBytes } = await getTextCapacityInfo(coverText);
  if (Math.ceil(messageLengthInBits / 8) > maxCapacityBytes) {
    throw new Error(`Message trop long (${Math.ceil(messageLengthInBits / 8)} octets). Capacité max: ${maxCapacityBytes} octets.`);
  }

  const lengthBinary = numberToBinary(messageLengthInBits, MESSAGE_LENGTH_BITS_TEXT);
  const dataToEmbedBinary = lengthBinary + messageBinary;

  const coverLines = coverText.split('\n');
  const stegoLines: string[] = [];

  if (coverLines.length < dataToEmbedBinary.length) {
      throw new Error("Capacité du texte porteur insuffisante pour cacher le message et sa longueur.");
  }

  for (let i = 0; i < coverLines.length; i++) {
    let currentLine = coverLines[i].replace(/\s+$/, ''); // Remove existing trailing spaces
    if (i < dataToEmbedBinary.length) {
      const bit = dataToEmbedBinary[i];
      if (bit === '0') {
        stegoLines.push(currentLine + ' ');
      } else { // bit === '1'
        stegoLines.push(currentLine + '  ');
      }
    } else {
      stegoLines.push(coverLines[i]); // Add remaining lines as is
    }
  }
  return stegoLines.join('\n');
}

export async function extractMessageFromText(stegoText: string): Promise<string> {
  if (!stegoText) {
    throw new Error("Le texte stéganographié ne peut pas être vide.");
  }
  const stegoLines = stegoText.split('\n');
  
  if (stegoLines.length < MESSAGE_LENGTH_BITS_TEXT) {
    throw new Error("Texte stéganographié trop court pour contenir une longueur de message valide.");
  }

  let extractedLengthBits = '';
  for (let i = 0; i < MESSAGE_LENGTH_BITS_TEXT; i++) {
    const line = stegoLines[i];
    if (line.endsWith('  ')) {
      extractedLengthBits += '1';
    } else if (line.endsWith(' ')) {
      extractedLengthBits += '0';
    } else {
      // This could mean the line wasn't used or the file is corrupted.
      // For simplicity, assume if no trailing space, it's an error or unencoded part.
      // More robust: check if line *should* have been encoded based on total expected bits.
      // For now, if a bit is missing, it's an error.
      throw new Error(`Format de stéganographie invalide à la ligne ${i + 1} (bit de longueur). Attendu un ou deux espaces de fin.`);
    }
  }
  
  const messageLengthInBits = parseInt(extractedLengthBits, 2);

  if (isNaN(messageLengthInBits) || messageLengthInBits < 0) {
    throw new Error("Longueur de message cachée invalide.");
  }

  if (messageLengthInBits === 0) {
    return ""; // Empty message was encoded
  }

  const totalBitsToExtract = MESSAGE_LENGTH_BITS_TEXT + messageLengthInBits;
  if (stegoLines.length < totalBitsToExtract) {
    throw new Error("Texte stéganographié trop court pour contenir le message annoncé.");
  }

  let extractedMessageBits = '';
  for (let i = MESSAGE_LENGTH_BITS_TEXT; i < totalBitsToExtract; i++) {
    const line = stegoLines[i];
    if (line.endsWith('  ')) {
      extractedMessageBits += '1';
    } else if (line.endsWith(' ')) {
      extractedMessageBits += '0';
    } else {
      throw new Error(`Format de stéganographie invalide à la ligne ${i + 1} (bit de message). Attendu un ou deux espaces de fin.`);
    }
  }

  if (extractedMessageBits.length !== messageLengthInBits) {
      throw new Error("N'a pas pu extraire le message complet. Le nombre de bits extraits ne correspond pas à la longueur annoncée.");
  }

  return binaryToText(extractedMessageBits);
}
