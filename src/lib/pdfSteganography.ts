
import type { CapacityInfo } from '@/types';

const SIMULATED_PDF_CAPACITY_BYTES = 2048; // Example: 2KB simulated capacity
const PDF_SUBJECT_PREFIX = "StegEngineHiddenMessage:"; // Prefix for our data in the Subject field

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
    throw new Error(`Le décodage Base64 a échoué: ${(e as Error).message}. Le message caché est peut-être corrompu ou absent.`);
  }
}


export async function getPdfCapacityInfo(file: File, algorithmId: string): Promise<CapacityInfo> {
  // For metadata steganography, capacity is generally flexible and not easily quantifiable like LSB.
  // We return an estimated capacity.
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
  console.log("[PDF Embed] Tentative d'intégration via le champ Subject.");

  try {
    // Dynamically import pdf-lib
    const { PDFDocument } = await import('pdf-lib');
    if (!PDFDocument) {
        console.error("[PDF Lib] PDFDocument n'a pas pu être importé de pdf-lib lors de l'intégration.");
        throw new Error("Erreur interne: Composant PDFDocument non trouvé lors de l'intégration.");
    }

    const pdfBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const messageBytes = new TextEncoder().encode(message);
    const base64EncodedMessage = uint8ArrayToBase64(messageBytes);
    const prefixedBase64Message = PDF_SUBJECT_PREFIX + base64EncodedMessage;
    
    if (typeof pdfDoc.setSubject === 'function') {
        pdfDoc.setSubject(prefixedBase64Message);
        console.log(`[PDF Embed] Tentative de définition du Subject à:`, prefixedBase64Message);
    } else {
        console.warn("[PDF Lib] pdfDoc.setSubject n'est pas une fonction. Impossible de définir le champ Subject.");
        throw new Error("Impossible de définir le champ Subject : fonction non disponible.");
    }
    
    // Save the PDF. crucial: updateMetadata: false to prevent pdf-lib from overwriting our changes.
    const modifiedPdfBytes = await pdfDoc.save({ updateMetadata: false });
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);

  } catch (err) {
    console.error("[PDF Embed] Erreur lors de l'intégration PDF:", err);
    throw new Error(`Erreur lors de l'intégration PDF: ${(err as Error).message}`);
  }
}

export async function extractMessageFromPdf(file: File, algorithmId: string): Promise<string> {
  if (algorithmId !== 'pdf_metadata_simulated') {
    throw new Error(`Algorithme d'extraction PDF non supporté: ${algorithmId}`);
  }
  console.log("[PDF Extract] Tentative d'extraction réelle via le champ Subject.");

  let pdfDoc;
  try {
    const { PDFDocument } = await import('pdf-lib');
    if (!PDFDocument) {
        console.error("[PDF Lib] PDFDocument n'a pas pu être importé de pdf-lib lors de l'extraction.");
        throw new Error("Erreur interne: Composant PDFDocument non trouvé lors de l'extraction.");
    }
    
    const pdfBuffer = await file.arrayBuffer();
    pdfDoc = await PDFDocument.load(pdfBuffer);
  } catch (loadError) {
    console.error("[PDF Extract] Erreur lors du chargement du PDFDocument:", loadError);
    throw new Error(`Impossible de charger le document PDF : ${(loadError as Error).message}`);
  }

  if (!pdfDoc) { // Should not happen if PDFDocument.load didn't throw
    throw new Error("PDFDocument n'a pas pu être initialisé.");
  }
  
  let subjectValue: string | undefined = undefined;

  if (typeof pdfDoc.getSubject === 'function') {
      subjectValue = pdfDoc.getSubject();
  } else {
      console.warn(`[PDF Lib] pdfDoc.getSubject n'est pas une fonction. Impossible de récupérer le champ Subject.`);
      // If the method doesn't exist, we can't retrieve the message this way.
      console.log("[PDF Extract] Message non trouvé (getSubject non disponible). Retour d'une chaîne vide.");
      return "";
  }
  
  console.log(`[PDF Extract] Valeur brute du champ Subject:`, subjectValue);

  if (subjectValue && subjectValue.startsWith(PDF_SUBJECT_PREFIX)) {
    console.log(`[PDF Extract] Préfixe trouvé dans le champ Subject.`);
    const base64EncodedMessage = subjectValue.substring(PDF_SUBJECT_PREFIX.length);
    console.log(`[PDF Extract] Base64 extrait du Subject:`, base64EncodedMessage);

    if (base64EncodedMessage && base64EncodedMessage.trim().length > 0) {
      try {
        const decodedBytes = base64ToUint8Array(base64EncodedMessage); 
        console.log("[PDF Extract] Octets décodés depuis Subject (longueur):", decodedBytes.length);
        const extractedText = new TextDecoder('utf-8', { fatal: true }).decode(decodedBytes); 
        console.log("[PDF Extract] Texte décodé depuis Subject:", `"${extractedText}"`);
        return extractedText;
      } catch (decodeError) {
        console.error("[PDF Extract] Erreur lors du décodage du message depuis Subject:", decodeError);
        throw new Error(`Erreur de décodage du message caché : ${(decodeError as Error).message}`);
      }
    } else {
      console.log("[PDF Extract] La valeur du Subject après préfixe est vide ou ne contient que des espaces.");
    }
  } else {
    console.log(`[PDF Extract] Le champ Subject ne correspond pas au préfixe ou est null/undefined.`);
  }
  
  console.log("[PDF Extract] Message non trouvé dans le champ Subject avec la clé attendue. Retour d'une chaîne vide.");
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
