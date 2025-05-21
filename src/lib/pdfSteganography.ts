
import type { CapacityInfo } from '@/types';

const SIMULATED_PDF_CAPACITY_BYTES = 2048; // Example: 2KB simulated capacity
const SIMULATED_EXTRACTED_MESSAGE = "Message extrait (simulation PDF)";
const PDF_CUSTOM_METADATA_KEY = "StegEngineHiddenMessage"; // Custom key for our data

// Helper to convert Uint8Array to Base64 string
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert Base64 string to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  try {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Erreur de décodage Base64:", e);
    throw new Error("Impossible d'extraire le message : décodage Base64 invalide.");
  }
}


export async function getPdfCapacityInfo(file: File, algorithmId: string): Promise<CapacityInfo> {
  if (algorithmId === 'pdf_metadata_simulated') { // Keep ID same, but behavior changes
    return { 
      capacityBytes: SIMULATED_PDF_CAPACITY_BYTES, 
      width: 0, 
      height: 0, 
      isEstimate: true 
    };
  }
  throw new Error(`Algorithme PDF non reconnu pour le calcul de capacité: ${algorithmId}`);
}

export async function embedMessageInPdf(file: File, message: string, algorithmId: string): Promise<string> {
  if (algorithmId !== 'pdf_metadata_simulated') {
    throw new Error(`Algorithme d'intégration PDF non supporté: ${algorithmId}`);
  }

  try {
    const { PDFDocument } = await import('pdf-lib');
    const pdfBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const messageBytes = new TextEncoder().encode(message);
    const base64EncodedMessage = uint8ArrayToBase64(messageBytes);

    pdfDoc.setProducer(PDF_CUSTOM_METADATA_KEY + ":" + base64EncodedMessage);

    const modifiedPdfBytes = await pdfDoc.save();
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);

  } catch (err) {
    console.warn(
      "Tentative d'intégration PDF réelle (via Producer) échouée. 'pdf-lib' est-il installé et l'opération est-elle valide ? Erreur:",
      err
    );
    const error = err as Error;
    throw new Error(`Erreur lors de l'intégration PDF: ${error.message}. Retour au comportement simulé.`);
  }
}

export async function extractMessageFromPdf(file: File, algorithmId: string): Promise<string> {
  if (algorithmId !== 'pdf_metadata_simulated') {
    throw new Error(`Algorithme d'extraction PDF non supporté: ${algorithmId}`);
  }

  try {
    const { PDFDocument } = await import('pdf-lib');
    const pdfBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const producer = pdfDoc.getProducer();
    
    if (producer && producer.startsWith(PDF_CUSTOM_METADATA_KEY + ":")) {
        const base64EncodedMessage = producer.substring((PDF_CUSTOM_METADATA_KEY + ":").length);
        if (base64EncodedMessage) {
            const decodedBytes = base64ToUint8Array(base64EncodedMessage);
            return new TextDecoder().decode(decodedBytes);
        }
    }
    
    // If message not found in Producer, try Keywords as a fallback from previous attempt (optional)
    // This part can be removed if we decide Producer is the sole method now.
    // For now, keeping it might help with files processed by the immediately prior version.
    const keywordsString = pdfDoc.getKeywords();
    if (keywordsString) {
        const keywords = keywordsString.split(', ');
        const hiddenMessageKeyword = keywords.find(kw => kw.startsWith(PDF_CUSTOM_METADATA_KEY + ":"));
        if (hiddenMessageKeyword) {
            const base64EncodedMessage = hiddenMessageKeyword.substring((PDF_CUSTOM_METADATA_KEY + ":").length);
            if (base64EncodedMessage) {
                const decodedBytes = base64ToUint8Array(base64EncodedMessage);
                return new TextDecoder().decode(decodedBytes);
            }
        }
    }

    return ""; // No message found with our key in Producer or Keywords

  } catch (err) {
    console.warn(
      "Tentative d'extraction PDF réelle (via Producer/Keywords) échouée. 'pdf-lib' est-il installé et le fichier contient-il le message ? Erreur:",
      err
    );
    // To provide better feedback, let's not return simulated message on error, but an empty string or throw
    // throw new Error(`Erreur lors de l'extraction PDF: ${(err as Error).message}. Retour au comportement simulé.`);
    return ""; // Return empty if real extraction fails, rather than simulated message.
  }
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
