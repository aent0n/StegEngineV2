
import type { CapacityInfo } from '@/types';
import { convertObjectUrlToDataUri } from './steganography'; // Re-use if applicable for export

const SIMULATED_PDF_CAPACITY_BYTES = 1024; // Example: 1KB simulated capacity
const SIMULATED_EXTRACTED_MESSAGE = "Message extrait (simulation PDF)";

export async function getPdfCapacityInfo(file: File, algorithmId: string): Promise<CapacityInfo> {
  if (algorithmId === 'pdf_metadata_simulated') {
    // For simulation, we don't need to read the file to determine capacity
    // We can return a fixed estimated capacity
    return { 
      capacityBytes: SIMULATED_PDF_CAPACITY_BYTES, 
      width: 0, // Not applicable for PDF
      height: 0, // Not applicable for PDF
      isEstimate: true 
    };
  }
  throw new Error(`Algorithme PDF non reconnu pour le calcul de capacité: ${algorithmId}`);
}

export async function embedMessageInPdf(file: File, message: string, algorithmId: string): Promise<string> {
  if (algorithmId === 'pdf_metadata_simulated') {
    // Simulate embedding: just log and return the original file's object URL
    // In a real scenario, you would modify the PDF here
    console.log(`Simulation: Intégration du message "${message}" dans le PDF "${file.name}" via ${algorithmId}`);
    
    // Check against simulated capacity
    const messageBytes = new TextEncoder().encode(message).length;
    if (messageBytes > SIMULATED_PDF_CAPACITY_BYTES) {
      throw new Error(`Message trop long (${messageBytes} octets) pour la capacité PDF simulée (${SIMULATED_PDF_CAPACITY_BYTES} octets).`);
    }
    
    // Return an object URL for the original file for download simulation purposes
    // Or a new object URL if the file was actually modified and re-blobbed
    return URL.createObjectURL(file); 
  }
  throw new Error(`Algorithme d'intégration PDF non supporté: ${algorithmId}`);
}

export async function extractMessageFromPdf(file: File, algorithmId: string): Promise<string> {
  if (algorithmId === 'pdf_metadata_simulated') {
    // Simulate extraction: log and return a fixed message
    console.log(`Simulation: Extraction d'un message du PDF "${file.name}" via ${algorithmId}`);
    return SIMULATED_EXTRACTED_MESSAGE;
  }
  throw new Error(`Algorithme d'extraction PDF non supporté: ${algorithmId}`);
}

// Re-exporting for consistency if needed for PDF export, though current simulation doesn't modify file
export { convertObjectUrlToDataUri };
