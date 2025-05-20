
// Helper functions for LSB steganography

/**
 * Converts a string to its binary representation.
 * Each character is converted to its 8-bit ASCII binary form.
 */
function textToBinary(text: string): string {
  return text
    .split('')
    .map((char) => {
      const binary = char.charCodeAt(0).toString(2);
      return '0'.repeat(8 - binary.length) + binary; // Pad to 8 bits
    })
    .join('');
}

/**
 * Converts a binary string back to its text representation.
 */
function binaryToText(binary: string): string {
  let text = '';
  for (let i = 0; i < binary.length; i += 8) {
    const byte = binary.substring(i, i + 8);
    text += String.fromCharCode(parseInt(byte, 2));
  }
  return text;
}

/**
 * Converts a decimal number to a binary string, padded to a specific number of bits.
 */
function numberToBinary(num: number, bits: number): string {
  const binary = num.toString(2);
  return '0'.repeat(Math.max(0, bits - binary.length)) + binary;
}

/**
 * Reads an image file and returns its ImageData.
 */
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
          return reject(new Error('Could not get canvas context.'));
        }
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.width, img.height));
      };
      img.onerror = () => reject(new Error('Failed to load image for canvas processing.'));
      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error('FileReader did not return a result.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

const MESSAGE_LENGTH_BITS = 32; // Using 32 bits to store the length of the message payload

/**
 * Calculates the maximum number of bytes that can be embedded in an ImageData object.
 * We use 3 bits per pixel (1 for R, 1 for G, 1 for B).
 * We reserve MESSAGE_LENGTH_BITS for storing the message length.
 */
export function calculateCapacity(imageData: ImageData): number {
  const totalPixels = imageData.width * imageData.height;
  const totalBitsAvailable = totalPixels * 3; // R, G, B channels, 1 bit each
  if (totalBitsAvailable < MESSAGE_LENGTH_BITS) {
    return 0; // Not enough space for even the length metadata
  }
  const bitsForPayload = totalBitsAvailable - MESSAGE_LENGTH_BITS;
  return Math.floor(bitsForPayload / 8); // Convert bits to bytes
}


/**
 * Embeds a message into an image file (PNG).
 * @param file The image File object (must be PNG).
 * @param message The string message to embed.
 * @returns A Promise that resolves with the data URI of the new image with the embedded message.
 */
export async function embedMessageInImage(file: File, message: string): Promise<string> {
  if (file.type !== 'image/png') {
    throw new Error('Seuls les fichiers PNG sont pris en charge pour l\'intégration LSB.');
  }

  const imageData = await getImageData(file);
  const capacityBytes = calculateCapacity(imageData);
  const messageBinary = textToBinary(message);
  const messageLengthInBits = messageBinary.length;

  if (Math.ceil(messageLengthInBits / 8) > capacityBytes) {
    throw new Error(
      `Message trop long (${Math.ceil(messageLengthInBits/8)} octets) pour l'image sélectionnée (capacité: ${capacityBytes} octets).`
    );
  }

  const messageLengthBinary = numberToBinary(messageLengthInBits, MESSAGE_LENGTH_BITS);
  const dataToEmbedBinary = messageLengthBinary + messageBinary;

  const data = imageData.data; // Uint8ClampedArray: [R, G, B, A, R, G, B, A, ...]
  let bitIndex = 0;

  for (let i = 0; i < data.length && bitIndex < dataToEmbedBinary.length; i += 4) {
    // Modify R, G, B channels. Alpha (A) channel is data[i+3] and is skipped.
    for (let channel = 0; channel < 3; channel++) {
      if (bitIndex < dataToEmbedBinary.length) {
        const bitToEmbed = parseInt(dataToEmbedBinary[bitIndex], 10);
        data[i + channel] = (data[i + channel] & 0xFE) | bitToEmbed; // Clear LSB and set new bit
        bitIndex++;
      } else {
        break;
      }
    }
  }

  // Create a new canvas to draw the modified image data
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context to write modified data.');
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL('image/png');
}


/**
 * Extracts a hidden message from an image file (PNG).
 * @param file The image File object (must be PNG) containing the hidden message.
 * @returns A Promise that resolves with the extracted string message.
 */
export async function extractMessageFromImage(file: File): Promise<string> {
  if (file.type !== 'image/png') {
    throw new Error('Seuls les fichiers PNG sont pris en charge pour l\'extraction LSB.');
  }

  const imageData = await getImageData(file);
  const data = imageData.data;
  let extractedLengthBits = '';

  // 1. Extract message length (first MESSAGE_LENGTH_BITS bits)
  let lengthBitsRead = 0;
  for (let i = 0; i < data.length && lengthBitsRead < MESSAGE_LENGTH_BITS; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      if (lengthBitsRead < MESSAGE_LENGTH_BITS) {
        extractedLengthBits += (data[i + channel] & 1).toString();
        lengthBitsRead++;
      } else {
        break;
      }
    }
  }
  
  if (lengthBitsRead < MESSAGE_LENGTH_BITS) {
    throw new Error("Impossible d'extraire la longueur complète du message. Le fichier est peut-être trop petit ou corrompu.");
  }

  const messageLengthInBits = parseInt(extractedLengthBits, 2);

  if (isNaN(messageLengthInBits) || messageLengthInBits < 0) {
    throw new Error("Impossible de déterminer la longueur du message caché, ou format de longueur invalide.");
  }

  if (messageLengthInBits === 0) {
    return ""; // Valid empty message
  }
  
  const capacityBytes = calculateCapacity(imageData);
  if (Math.ceil(messageLengthInBits / 8) > capacityBytes) {
      throw new Error(`La longueur de message annoncée (${Math.ceil(messageLengthInBits/8)} octets) dépasse la capacité de l'image (${capacityBytes} octets). Le fichier est peut-être corrompu ou n'a pas été encodé par cet outil.`);
  }

  // 2. Extract message payload
  let extractedMessageBits = '';
  let messageBitsRead = 0;
  let currentBitInStream = 0; // Tracks the overall bit position in the steganographic data (length + payload)

  for (let i = 0; i < data.length && messageBitsRead < messageLengthInBits; i += 4) {
    for (let channel = 0; channel < 3; channel++) { 
      if (currentBitInStream >= MESSAGE_LENGTH_BITS) { 
        if (messageBitsRead < messageLengthInBits) {
          extractedMessageBits += (data[i + channel] & 1).toString();
          messageBitsRead++;
        } else {
          break; 
        }
      }
      currentBitInStream++;
      
      if (currentBitInStream >= MESSAGE_LENGTH_BITS + messageLengthInBits) {
          break;
      }
    }
    if (messageBitsRead >= messageLengthInBits || currentBitInStream >= MESSAGE_LENGTH_BITS + messageLengthInBits) {
        break; 
    }
  }

  if (messageBitsRead < messageLengthInBits) {
    throw new Error("N'a pas pu extraire le message complet. Le fichier est peut-être corrompu ou incomplet.");
  }

  return binaryToText(extractedMessageBits);
}

/**
 * Utility to get ImageData from a file for capacity calculation without full processing.
 */
export async function getCapacityInfo(file: File): Promise<{ capacityBytes: number, width: number, height: number }> {
  if (file.type !== 'image/png') {
    throw new Error('Seuls les fichiers PNG sont pris en charge pour le calcul de capacité.');
  }
  const imageData = await getImageData(file);
  return {
    capacityBytes: calculateCapacity(imageData),
    width: imageData.width,
    height: imageData.height,
  };
}
