
import type { CapacityInfo } from '@/types';
import { whitespaceTextAlgorithm, zeroWidthCharsTextAlgorithm } from '@/types'; // Import new algo type

const MESSAGE_LENGTH_BITS_TEXT = 32; // Bits to store the length of the (binary) message

// ZWC Constants
const ZW_SPACE = '\u200B'; // Represents bit '0'
const ZW_NON_JOINER = '\u200C'; // Represents bit '1'

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
  return '0'.repeat(Math.max(0, bits - binary.length)) + binary; // Ensure non-negative repeat
}


// --- Whitespace Algorithm Specific Functions ---
async function getTextCapacityInfoWhitespace(coverText: string): Promise<CapacityInfo> {
  const lines = coverText.split('\n');
  const numLines = lines.length;
  const availableBitsForPayload = numLines - MESSAGE_LENGTH_BITS_TEXT;

  if (availableBitsForPayload < 0) {
    return { capacityBytes: 0, width: 0, height: 0, isEstimate: false };
  }
  
  const capacityBytes = Math.floor(availableBitsForPayload / 8);
  return { capacityBytes, width: 0, height: 0, isEstimate: false };
}

async function embedMessageInTextWhitespace(coverText: string, message: string): Promise<string> {
  if (!coverText) {
    throw new Error("Le texte porteur ne peut pas être vide.");
  }
  message = message || ""; // Handle empty message

  const messageBinary = textToBinary(message);
  const messageLengthInBits = messageBinary.length;

  const { capacityBytes: maxCapacityBytes } = await getTextCapacityInfoWhitespace(coverText);
  if (Math.ceil(messageLengthInBits / 8) > maxCapacityBytes) {
    throw new Error(`Message trop long (${Math.ceil(messageLengthInBits / 8)} octets). Capacité max (whitespace): ${maxCapacityBytes} octets.`);
  }

  const lengthBinary = numberToBinary(messageLengthInBits, MESSAGE_LENGTH_BITS_TEXT);
  const dataToEmbedBinary = lengthBinary + messageBinary;

  const coverLines = coverText.split('\n');
  const stegoLines: string[] = [];

  if (coverLines.length < dataToEmbedBinary.length) {
      throw new Error("Capacité du texte porteur (whitespace) insuffisante pour cacher le message et sa longueur.");
  }

  for (let i = 0; i < coverLines.length; i++) {
    let currentLine = coverLines[i].replace(/\s+$/, ''); 
    if (i < dataToEmbedBinary.length) {
      const bit = dataToEmbedBinary[i];
      stegoLines.push(currentLine + (bit === '0' ? ' ' : '  '));
    } else {
      stegoLines.push(coverLines[i]); 
    }
  }
  return stegoLines.join('\n');
}

async function extractMessageFromTextWhitespace(stegoText: string): Promise<string> {
  if (!stegoText) throw new Error("Le texte stéganographié (whitespace) ne peut pas être vide.");
  
  const stegoLines = stegoText.split('\n');
  if (stegoLines.length < MESSAGE_LENGTH_BITS_TEXT) {
    throw new Error("Texte (whitespace) trop court pour contenir une longueur de message valide.");
  }

  let extractedLengthBits = '';
  for (let i = 0; i < MESSAGE_LENGTH_BITS_TEXT; i++) {
    const line = stegoLines[i];
    if (line.endsWith('  ')) extractedLengthBits += '1';
    else if (line.endsWith(' ')) extractedLengthBits += '0';
    else throw new Error(`Format (whitespace) invalide ligne ${i + 1} (longueur). Attendu un ou deux espaces.`);
  }
  
  const messageLengthInBits = parseInt(extractedLengthBits, 2);
  if (isNaN(messageLengthInBits) || messageLengthInBits < 0) throw new Error("Longueur de message (whitespace) invalide.");
  if (messageLengthInBits === 0) return "";

  const totalBitsToExtract = MESSAGE_LENGTH_BITS_TEXT + messageLengthInBits;
  if (stegoLines.length < totalBitsToExtract) throw new Error("Texte (whitespace) trop court pour le message annoncé.");

  let extractedMessageBits = '';
  for (let i = MESSAGE_LENGTH_BITS_TEXT; i < totalBitsToExtract; i++) {
    const line = stegoLines[i];
    if (line.endsWith('  ')) extractedMessageBits += '1';
    else if (line.endsWith(' ')) extractedMessageBits += '0';
    else throw new Error(`Format (whitespace) invalide ligne ${i + 1} (message). Attendu un ou deux espaces.`);
  }

  if (extractedMessageBits.length !== messageLengthInBits) throw new Error("N'a pas pu extraire le message (whitespace) complet.");
  return binaryToText(extractedMessageBits);
}

// --- Zero-Width Characters (ZWC) Algorithm Specific Functions ---
async function getTextCapacityInfoZWC(coverText: string): Promise<CapacityInfo> {
  // Capacity is 1 bit per character of the cover text, minus bits for length.
  // We only consider non-ZWC characters from the cover text for capacity calculation.
  const cleanCoverText = coverText.replace(new RegExp(`[${ZW_SPACE}${ZW_NON_JOINER}]`, 'g'), '');
  const availableBitsForPayload = cleanCoverText.length - MESSAGE_LENGTH_BITS_TEXT;

  if (availableBitsForPayload < 0) {
    return { capacityBytes: 0, width: 0, height: 0, isEstimate: false };
  }
  
  const capacityBytes = Math.floor(availableBitsForPayload / 8);
  return { capacityBytes, width: 0, height: 0, isEstimate: false };
}

async function embedMessageInTextZWC(coverText: string, message: string): Promise<string> {
  if (!coverText) throw new Error("Le texte porteur ne peut pas être vide pour ZWC.");
  message = message || "";

  const messageBinary = textToBinary(message);
  const messageLengthInBits = messageBinary.length;

  const { capacityBytes: maxCapacityBytes } = await getTextCapacityInfoZWC(coverText);
  if (Math.ceil(messageLengthInBits / 8) > maxCapacityBytes) {
    throw new Error(`Message trop long (${Math.ceil(messageLengthInBits / 8)} octets). Capacité max (ZWC): ${maxCapacityBytes} octets.`);
  }

  const lengthBinary = numberToBinary(messageLengthInBits, MESSAGE_LENGTH_BITS_TEXT);
  const dataToEmbedBinary = lengthBinary + messageBinary;

  let stegoText = "";
  let dataBitIndex = 0;
  
  // Iterate over the cover text, inserting ZWCs *after* each original character
  for (let i = 0; i < coverText.length; i++) {
    const coverChar = coverText[i];
    // Skip existing ZWCs in cover text to avoid issues and base capacity on visible chars
    if (coverChar === ZW_SPACE || coverChar === ZW_NON_JOINER) {
        stegoText += coverChar; // Preserve them if they were there, but don't use for embedding
        continue;
    }
    
    stegoText += coverChar;
    if (dataBitIndex < dataToEmbedBinary.length) {
      const bit = dataToEmbedBinary[dataBitIndex];
      stegoText += (bit === '0' ? ZW_SPACE : ZW_NON_JOINER);
      dataBitIndex++;
    }
  }
  
  // If cover text was shorter than data to embed (should be caught by capacity check, but as a safeguard)
  if (dataBitIndex < dataToEmbedBinary.length) {
      // This case implies the capacity check failed or was bypassed.
      // We could throw, or append remaining ZWCs if we absolutely must.
      // For now, this scenario indicates an issue with capacity calculation or logic.
      console.warn("Tentative d'intégration ZWC au-delà de la longueur du texte porteur nettoyé. Message pourrait être tronqué si la capacité était mal calculée.");
       while(dataBitIndex < dataToEmbedBinary.length) {
           const bit = dataToEmbedBinary[dataBitIndex];
           stegoText += (bit === '0' ? ZW_SPACE : ZW_NON_JOINER);
           dataBitIndex++;
       }
  }

  return stegoText;
}

async function extractMessageFromTextZWC(stegoText: string): Promise<string> {
  if (!stegoText) throw new Error("Le texte stéganographié (ZWC) ne peut pas être vide.");

  let extractedBits = "";
  for (let i = 0; i < stegoText.length; i++) {
    const char = stegoText[i];
    if (char === ZW_SPACE) {
      extractedBits += '0';
    } else if (char === ZW_NON_JOINER) {
      extractedBits += '1';
    }
  }

  if (extractedBits.length < MESSAGE_LENGTH_BITS_TEXT) {
    throw new Error("Texte (ZWC) trop court pour contenir une longueur de message valide (pas assez de ZWC trouvés).");
  }

  const extractedLengthBits = extractedBits.substring(0, MESSAGE_LENGTH_BITS_TEXT);
  const messageLengthInBits = parseInt(extractedLengthBits, 2);

  if (isNaN(messageLengthInBits) || messageLengthInBits < 0) {
    throw new Error("Longueur de message (ZWC) cachée invalide.");
  }
  if (messageLengthInBits === 0) return "";

  const messageStartBitIndex = MESSAGE_LENGTH_BITS_TEXT;
  const messageEndBitIndex = messageStartBitIndex + messageLengthInBits;

  if (extractedBits.length < messageEndBitIndex) {
    throw new Error("Texte (ZWC) ne contient pas assez de bits pour le message annoncé (basé sur les ZWC trouvés).");
  }

  const extractedMessageBits = extractedBits.substring(messageStartBitIndex, messageEndBitIndex);
  if (extractedMessageBits.length !== messageLengthInBits)  throw new Error("N'a pas pu extraire le message (ZWC) complet.");

  return binaryToText(extractedMessageBits);
}


// --- Main Dispatcher Functions ---
export async function getTextCapacityInfo(coverText: string, algorithmId: string): Promise<CapacityInfo> {
  if (algorithmId === whitespaceTextAlgorithm.id) {
    return getTextCapacityInfoWhitespace(coverText);
  } else if (algorithmId === zeroWidthCharsTextAlgorithm.id) {
    return getTextCapacityInfoZWC(coverText);
  }
  throw new Error(`Algorithme texte non supporté pour capacité : ${algorithmId}`);
}

export async function embedMessageInText(coverText: string, message: string, algorithmId: string): Promise<string> {
  if (algorithmId === whitespaceTextAlgorithm.id) {
    return embedMessageInTextWhitespace(coverText, message);
  } else if (algorithmId === zeroWidthCharsTextAlgorithm.id) {
    return embedMessageInTextZWC(coverText, message);
  }
  throw new Error(`Algorithme texte non supporté pour intégration : ${algorithmId}`);
}

export async function extractMessageFromText(stegoText: string, algorithmId: string): Promise<string> {
  if (algorithmId === whitespaceTextAlgorithm.id) {
    return extractMessageFromTextWhitespace(stegoText);
  } else if (algorithmId === zeroWidthCharsTextAlgorithm.id) {
    return extractMessageFromTextZWC(stegoText);
  }
  throw new Error(`Algorithme texte non supporté pour extraction : ${algorithmId}`);
}
