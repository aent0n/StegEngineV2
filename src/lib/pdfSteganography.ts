
import type { CapacityInfo } from '@/types';

const SIMULATED_PDF_CAPACITY_BYTES = 2048; // Example: 2KB simulated capacity
const PDF_CUSTOM_METADATA_KEY = "com.stegengine.hiddenmessage"; // Custom key for our data

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
    throw new Error(`Le décodage Base64 a échoué: ${(e as Error).message}. Le message caché est peut-être corrompu ou absent.`);
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
  console.log("[PDF Embed] Tentative d'intégration réelle.");

  try {
    const { PDFDocument } = await import('pdf-lib');
    if (!PDFDocument) {
        console.error("[PDF Lib] PDFDocument n'a pas pu être importé de pdf-lib lors de l'intégration.");
        throw new Error("Erreur interne: Composant PDFDocument non trouvé lors de l'intégration.");
    }

    const pdfBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const messageBytes = new TextEncoder().encode(message);
    const base64EncodedMessage = uint8ArrayToBase64(messageBytes);
    
    if (typeof pdfDoc.setCustomMetadata === 'function') {
        pdfDoc.setCustomMetadata(PDF_CUSTOM_METADATA_KEY, base64EncodedMessage);
        console.log(`[PDF Embed] Tentative de définition des métadonnées personnalisées '${PDF_CUSTOM_METADATA_KEY}' à:`, base64EncodedMessage);
    } else {
        console.warn("[PDF Lib] pdfDoc.setCustomMetadata n'est pas une fonction. Impossible de définir les métadonnées personnalisées.");
        throw new Error("Impossible de définir les métadonnées personnalisées: fonction non disponible.");
    }
    
    const modifiedPdfBytes = await pdfDoc.save({ updateMetadata: false });
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

  try {
    const { PDFDocument } = await import('pdf-lib');
    if (!PDFDocument) {
        console.error("[PDF Extract] PDFDocument n'a pas pu être importé de pdf-lib lors de l'extraction.");
        throw new Error("Erreur interne: Composant PDFDocument non trouvé lors de l'extraction.");
    }
    
    const pdfBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    let customMetadataValue: string | undefined = undefined;

    if (typeof pdfDoc.getCustomMetadata === 'function') {
        customMetadataValue = pdfDoc.getCustomMetadata(PDF_CUSTOM_METADATA_KEY);
    } else {
        console.warn(`[PDF Lib] pdfDoc.getCustomMetadata n'est pas une fonction. Version de pdf-lib potentiellement incompatible ou autre problème. Impossible de récupérer les métadonnées personnalisées de cette manière.`);
        // Fallback or simple return of empty string if method doesn't exist
        console.log("[PDF Extract] Message non trouvé (getCustomMetadata non disponible). Retour d'une chaîne vide.");
        return "";
    }

    console.log(`[PDF Extract] Valeur brute des métadonnées personnalisées '${PDF_CUSTOM_METADATA_KEY}':`, customMetadataValue);

    if (customMetadataValue) {
        console.log(`[PDF Extract] Métadonnées personnalisées '${PDF_CUSTOM_METADATA_KEY}' trouvées.`);
        const base64EncodedMessage = customMetadataValue;

        if (base64EncodedMessage && base64EncodedMessage.trim().length > 0) {
            const decodedBytes = base64ToUint8Array(base64EncodedMessage); 
            console.log("[PDF Extract] Octets décodés (longueur):", decodedBytes.length);
            const extractedText = new TextDecoder('utf-8', { fatal: true }).decode(decodedBytes); 
            console.log("[PDF Extract] Texte décodé:", `"${extractedText}"`);
            return extractedText;
        } else {
            console.log("[PDF Extract] La valeur des métadonnées personnalisées est vide ou ne contient que des espaces.");
        }
    } else {
        console.log(`[PDF Extract] Métadonnées personnalisées '${PDF_CUSTOM_METADATA_KEY}' non trouvées via getCustomMetadata.`);
    }
    
    console.log("[PDF Extract] Message non trouvé dans les métadonnées personnalisées. Retour d'une chaîne vide.");
    return ""; 

  } catch (err) {
    console.error("[PDF Extract] Erreur lors de l'extraction réelle du PDF:", err);
    // Propagate error for UI handling
    throw new Error(`Erreur lors de l'extraction PDF: ${(err as Error).message}`);
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
