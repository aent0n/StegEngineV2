
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
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("[PDF Lib] Erreur de décodage Base64:", e);
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

  try {
    const pdfLib = await import('pdf-lib');
    if (!pdfLib || !pdfLib.PDFDocument) {
        console.warn("[PDF Lib] pdf-lib n'a pas pu être chargé. Retour au comportement simulé pour l'intégration.");
        throw new Error("pdf-lib non chargé"); // This will be caught by the page's handler
    }
    const { PDFDocument } = pdfLib;
    const pdfBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const messageBytes = new TextEncoder().encode(message);
    const base64EncodedMessage = uint8ArrayToBase64(messageBytes);

    pdfDoc.setProducer(PDF_CUSTOM_METADATA_KEY + ":" + base64EncodedMessage);
    // console.log("[PDF Embed] Producer set with:", PDF_CUSTOM_METADATA_KEY + ":" + base64EncodedMessage);

    const modifiedPdfBytes = await pdfDoc.save();
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);

  } catch (err) {
    console.warn(
      "[PDF Lib] Tentative d'intégration PDF réelle (via Producer) échouée. Erreur:",
      err
    );
    // Let the error propagate to be handled by the page component
    throw new Error(`Erreur lors de l'intégration PDF: ${(err as Error).message}`);
  }
}

export async function extractMessageFromPdf(file: File, algorithmId: string): Promise<string> {
  if (algorithmId !== 'pdf_metadata_simulated') {
    throw new Error(`Algorithme d'extraction PDF non supporté: ${algorithmId}`);
  }

  console.log("[PDF Extract] Début de l'extraction.");
  const pdfLib = await import('pdf-lib');
  if (!pdfLib || !pdfLib.PDFDocument) {
      console.warn("[PDF Lib] pdf-lib n'a pas pu être chargé. Impossible d'effectuer une extraction réelle.");
      throw new Error("pdf-lib non chargé pour l'extraction");
  }
  const { PDFDocument } = pdfLib;
  const pdfBuffer = await file.arrayBuffer();
  
  // Errors from PDFDocument.load, base64ToUint8Array, or TextDecoder will propagate
  // up to the caller (pdf-steg/page.tsx), which will handle UI updates for errors.
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  const producer = pdfDoc.getProducer();
  console.log("[PDF Extract] Producer field raw value:", producer);

  if (producer && producer.startsWith(PDF_CUSTOM_METADATA_KEY + ":")) {
      console.log("[PDF Extract] Producer field matches prefix.");
      const base64EncodedMessage = producer.substring((PDF_CUSTOM_METADATA_KEY + ":").length);
      console.log("[PDF Extract] Extracted Base64 from Producer:", base64EncodedMessage);

      if (base64EncodedMessage) {
          // base64ToUint8Array will throw if atob fails
          const decodedBytes = base64ToUint8Array(base64EncodedMessage); 
          console.log("[PDF Extract] Decoded bytes length from Producer:", decodedBytes.length);
          
          // new TextDecoder with fatal:true will throw if UTF-8 is invalid
          const extractedText = new TextDecoder('utf-8', { fatal: true }).decode(decodedBytes); 
          console.log("[PDF Extract] Decoded text from Producer:", extractedText);
          return extractedText;
      } else {
          console.log("[PDF Extract] Base64 part in Producer is empty after prefix removal.");
      }
  } else {
      console.log("[PDF Extract] Producer field does not match prefix or is null/undefined.");
  }
  
  // Fallback to Keywords (for compatibility with a previous brief version)
  const keywordsString = pdfDoc.getKeywords();
  console.log("[PDF Extract] Keywords field raw value:", keywordsString);
  if (keywordsString) {
      const keywords = keywordsString.split(', '); 
      const hiddenMessageKeyword = keywords.find(kw => kw.startsWith(PDF_CUSTOM_METADATA_KEY + ":"));
      if (hiddenMessageKeyword) {
          console.log("[PDF Extract] Found matching keyword in Keywords (fallback):", hiddenMessageKeyword);
          const base64Fallback = hiddenMessageKeyword.substring((PDF_CUSTOM_METADATA_KEY + ":").length);
          console.log("[PDF Extract] Extracted Base64 from Keywords:", base64Fallback);
          if (base64Fallback) {
              const decodedBytes = base64ToUint8Array(base64Fallback);
              console.log("[PDF Extract] Decoded bytes length from Keywords:", decodedBytes.length);
              const extractedText = new TextDecoder('utf-8', { fatal: true }).decode(decodedBytes);
              console.log("[PDF Extract] Decoded text from Keywords:", extractedText);
              return extractedText;
          } else {
               console.log("[PDF Extract] Base64 part in Keywords is empty after prefix removal.");
          }
      }
  }

  console.log("[PDF Extract] Message non trouvé dans les métadonnées Producer ou Keywords avec la clé attendue.");
  return ""; // Message genuinely not found
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
