
import type { CapacityInfo } from '@/types';

const SIMULATED_PDF_CAPACITY_BYTES = 2048; // Example: 2KB simulated capacity
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
    const binary_string = atob(base64); // This can throw if base64 is invalid
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("[PDF Lib] Erreur de décodage Base64:", e);
    // Re-throw the error so the calling UI can handle it (e.g., show error toast)
    throw new Error(`Base64 decoding failed: ${(e as Error).message}`);
  }
}


export async function getPdfCapacityInfo(file: File, algorithmId: string): Promise<CapacityInfo> {
  if (algorithmId === 'pdf_metadata_simulated') { 
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

  // Dynamically import pdf-lib
  const pdfLib = await import('pdf-lib');
  if (!pdfLib || !pdfLib.PDFDocument) {
      console.warn("[PDF Lib] pdf-lib n'a pas pu être chargé. Retour au comportement simulé pour l'intégration.");
      // Fallback to simulated behavior if pdf-lib is not available
      const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' });
      return URL.createObjectURL(blob); // Return original file
  }
  const { PDFDocument } = pdfLib;

  try {
    const pdfBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const messageBytes = new TextEncoder().encode(message);
    const base64EncodedMessage = uint8ArrayToBase64(messageBytes);
    
    const producerValue = PDF_CUSTOM_METADATA_KEY + ":" + base64EncodedMessage;
    pdfDoc.setProducer(producerValue);
    console.log("[PDF Embed] Tentative de définition du Producer à:", producerValue);

    const modifiedPdfBytes = await pdfDoc.save();
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);

  } catch (err) {
    console.error("[PDF Embed] Erreur lors de l'intégration réelle du PDF:", err);
    // Let the error propagate to be handled by the page component
    throw new Error(`Erreur lors de l'intégration PDF: ${(err as Error).message}`);
  }
}

export async function extractMessageFromPdf(file: File, algorithmId: string): Promise<string> {
  if (algorithmId !== 'pdf_metadata_simulated') {
    throw new Error(`Algorithme d'extraction PDF non supporté: ${algorithmId}`);
  }
  console.log("[PDF Extract] Tentative d'extraction réelle.");

  const pdfLib = await import('pdf-lib');
  if (!pdfLib || !pdfLib.PDFDocument) {
      console.warn("[PDF Lib] pdf-lib n'a pas pu être chargé. Impossible d'effectuer une extraction réelle.");
      throw new Error("pdf-lib non chargé pour l'extraction");
  }
  const { PDFDocument } = pdfLib;

  // Errors from PDFDocument.load, base64ToUint8Array, or TextDecoder will propagate
  // up to the caller (pdf-steg/page.tsx), which will handle UI updates for errors.
  const pdfBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  const producer = pdfDoc.getProducer();
  console.log("[PDF Extract] Valeur brute du champ Producer:", producer);

  if (producer && producer.startsWith(PDF_CUSTOM_METADATA_KEY + ":")) {
      console.log("[PDF Extract] Le champ Producer correspond au préfixe.");
      const prefixLength = (PDF_CUSTOM_METADATA_KEY + ":").length;
      const base64EncodedMessage = producer.substring(prefixLength);
      console.log("[PDF Extract] Base64 extrait du Producer:", `"${base64EncodedMessage}"`);

      if (base64EncodedMessage && base64EncodedMessage.trim().length > 0) {
          const decodedBytes = base64ToUint8Array(base64EncodedMessage); 
          console.log("[PDF Extract] Octets décodés depuis Producer (longueur):", decodedBytes.length);
          // Use TextDecoder with fatal:true to ensure it throws on invalid UTF-8
          const extractedText = new TextDecoder('utf-8', { fatal: true }).decode(decodedBytes); 
          console.log("[PDF Extract] Texte décodé depuis Producer:", `"${extractedText}"`);
          return extractedText;
      } else {
          console.log("[PDF Extract] La partie Base64 dans Producer est vide après la suppression du préfixe.");
      }
  } else {
      console.log("[PDF Extract] Le champ Producer ne correspond pas au préfixe ou est null/undefined.");
  }
  
  // Fallback to Keywords (for compatibility with a previous brief version, less likely to be the source now)
  const keywordsString = pdfDoc.getKeywords();
  console.log("[PDF Extract] Valeur brute du champ Keywords (fallback):", keywordsString);
  if (keywordsString) {
      const keywords = keywordsString.split(',').map(kw => kw.trim()); // Trim spaces
      const hiddenMessageKeyword = keywords.find(kw => kw.startsWith(PDF_CUSTOM_METADATA_KEY + ":"));
      if (hiddenMessageKeyword) {
          console.log("[PDF Extract] Mot-clé correspondant trouvé dans Keywords (fallback):", hiddenMessageKeyword);
          const prefixLength = (PDF_CUSTOM_METADATA_KEY + ":").length;
          const base64Fallback = hiddenMessageKeyword.substring(prefixLength);
          console.log("[PDF Extract] Base64 extrait de Keywords:", `"${base64Fallback}"`);
          if (base64Fallback && base64Fallback.trim().length > 0) {
              const decodedBytes = base64ToUint8Array(base64Fallback);
              console.log("[PDF Extract] Octets décodés de Keywords (longueur):", decodedBytes.length);
              const extractedText = new TextDecoder('utf-8', { fatal: true }).decode(decodedBytes);
              console.log("[PDF Extract] Texte décodé de Keywords:", `"${extractedText}"`);
              return extractedText;
          } else {
               console.log("[PDF Extract] La partie Base64 dans Keywords est vide après la suppression du préfixe.");
          }
      }
  }

  console.log("[PDF Extract] Message non trouvé dans les métadonnées Producer ou Keywords avec la clé attendue. Retour d'une chaîne vide.");
  return ""; // Message genuinely not found or an issue occurred before returning actual text
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

