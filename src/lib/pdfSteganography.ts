
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
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}


export async function getPdfCapacityInfo(file: File, algorithmId: string): Promise<CapacityInfo> {
  // For PDF metadata, capacity is generally flexible and hard to define strictly.
  // We'll continue to provide an estimate for the UI.
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
    const { PDFDocument } = await import('pdf-lib');
    const pdfBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const messageBytes = new TextEncoder().encode(message);
    const base64EncodedMessage = uint8ArrayToBase64(messageBytes);

    // Set custom metadata. pdf-lib doesn't have a direct "set custom property" like some other libraries.
    // A common workaround is to use an existing, less critical field or append to keywords.
    // For a cleaner approach, if pdf-lib supports it, one might modify the document's Info dictionary directly.
    // Here, we'll add it as a keyword with a unique prefix. More robust would be a dedicated custom property.
    // As of pdf-lib 1.17, direct custom metadata addition is not straightforward via high-level API.
    // We can try to set it using a known field like 'Producer' or 'Keywords' if not critical,
    // or by manipulating the underlying dictionary (more complex).
    // For simplicity, we'll try to set it as the "Producer" field or append to Keywords.
    // A safer way is to store it in a custom XMP packet if full control is needed, but that's much more involved.

    // pdfDoc.setProducer(PDF_CUSTOM_METADATA_KEY + ":" + base64EncodedMessage); // Overwrites producer
    // Or, less intrusively, add to keywords:
    const keywords = pdfDoc.getKeywords()?.split(', ') || [];
    const newKeywords = keywords.filter(kw => !kw.startsWith(PDF_CUSTOM_METADATA_KEY + ":"));
    newKeywords.push(PDF_CUSTOM_METADATA_KEY + ":" + base64EncodedMessage);
    pdfDoc.setKeywords(newKeywords.join(', '));


    const modifiedPdfBytes = await pdfDoc.save();
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);

  } catch (err) {
    console.warn(
      "Tentative d'intégration PDF réelle échouée. 'pdf-lib' est-il installé et l'opération est-elle valide ? Erreur:",
      err
    );
    console.log(`Simulation (PDF): Intégration du message "${message.substring(0,50)}..." dans le PDF "${file.name}"`);
    const messageBytes = new TextEncoder().encode(message).length;
    if (messageBytes > SIMULATED_PDF_CAPACITY_BYTES && !confirm(`Le message (${messageBytes} octets) dépasse la capacité PDF simulée (${SIMULATED_PDF_CAPACITY_BYTES} octets). Continuer avec la simulation?`)) {
      throw new Error(`Intégration PDF simulée annulée car le message dépasse la capacité estimée.`);
    }
    return URL.createObjectURL(file); // Fallback to simulated: return original file URL
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
    
    // Fallback: Try checking Producer field if keywords didn't yield result
    // const producer = pdfDoc.getProducer();
    // if (producer && producer.startsWith(PDF_CUSTOM_METADATA_KEY + ":")) {
    //   const base64EncodedMessage = producer.substring((PDF_CUSTOM_METADATA_KEY + ":").length);
    //   if (base64EncodedMessage) {
    //       const decodedBytes = base64ToUint8Array(base64EncodedMessage);
    //       return new TextDecoder().decode(decodedBytes);
    //   }
    // }

    return ""; // No message found with our key

  } catch (err) {
    console.warn(
      "Tentative d'extraction PDF réelle échouée. 'pdf-lib' est-il installé et le fichier contient-il le message ? Erreur:",
      err
    );
    console.log(`Simulation (PDF): Extraction d'un message du PDF "${file.name}"`);
    return SIMULATED_EXTRACTED_MESSAGE; // Fallback to simulated
  }
}

// The convertObjectUrlToDataUri function might still be useful if you need to pass
// the PDF as a data URI elsewhere, but for direct download of blobs, it's not strictly needed.
// For now, let's keep it if it's used by any export logic generally.
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
