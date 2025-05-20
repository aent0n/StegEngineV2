
"use client";

import type React from 'react';
import { useState, useEffect } from "react";
import FileUploadCard from "@/components/hideaway/FileUploadCard";
import AlgorithmActionsCard from "@/components/hideaway/AlgorithmActionsCard";
import type { StegToolState, OperationMode } from "@/types";
import { lsbPngAlgorithm } from "@/types"; // Use the specific LSB PNG algorithm
import { useToast } from "@/hooks/use-toast";
import { embedMessageInImage, extractMessageFromImage, getCapacityInfo } from '@/lib/steganography';

const availableAlgorithms = [lsbPngAlgorithm];

const initialState: StegToolState = {
  carrierFile: null,
  fileName: null,
  filePreviewUrl: null,
  stegoFileDataUri: null,
  messageToEmbed: "",
  extractedMessage: null,
  selectedAlgorithmId: availableAlgorithms.length > 0 ? availableAlgorithms[0].id : null,
  aiSuggestion: null, 
  isProcessing: false,
  isExporting: false, 
  isAdvisorLoading: false,
  operationMode: 'embed',
  statusMessage: null,
  capacityInfo: null,
};

export default function ImageStegPage() {
  const [state, setState] = useState<StegToolState>(initialState);
  const { toast } = useToast();

  const resetStateForNewFile = () => {
    setState(prev => ({
      ...prev,
      carrierFile: null,
      fileName: null,
      filePreviewUrl: null,
      stegoFileDataUri: null,
      extractedMessage: null,
      statusMessage: null,
      capacityInfo: null,
    }));
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (state.filePreviewUrl) {
        URL.revokeObjectURL(state.filePreviewUrl);
    }

    if (file) {
      if (file.type !== 'image/png') {
        toast({ variant: "destructive", title: "Type de fichier non supporté", description: "Veuillez sélectionner un fichier image PNG." });
        event.target.value = ""; 
        resetStateForNewFile();
        return;
      }
      const filePreviewUrl = URL.createObjectURL(file);
      setState(prev => ({
        ...prev,
        carrierFile: file,
        fileName: file.name,
        filePreviewUrl,
        stegoFileDataUri: null,
        statusMessage: null,
        extractedMessage: null, 
        capacityInfo: null,
      }));

      try {
        const info = await getCapacityInfo(file);
        setState(prev => ({ ...prev, capacityInfo: info, statusMessage: {type: 'info', text: `Capacité: ${info.capacityBytes} octets. Dimensions: ${info.width}x${info.height}px.`} }));
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur de Capacité", description: error.message });
        setState(prev => ({ ...prev, capacityInfo: null, statusMessage: {type: 'error', text: error.message } }));
      }

    } else {
      resetStateForNewFile();
    }
  };

  const handleMessageToEmbedChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState(prev => ({ ...prev, messageToEmbed: event.target.value, statusMessage: null }));
  };

  const handleAlgorithmChange = (algorithmId: string) => {
    setState(prev => ({ ...prev, selectedAlgorithmId: algorithmId, statusMessage: null }));
  };

  const handleOperationModeChange = (mode: OperationMode) => {
    setState(prev => ({ 
      ...prev, 
      operationMode: mode, 
      statusMessage: null, 
      extractedMessage: null, // Clear extracted message when switching modes
    }));
  };

  const handleEmbed = async () => {
    if (!state.carrierFile || !state.messageToEmbed || !state.selectedAlgorithmId) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un fichier, saisir un message et choisir un algorithme." });
      return;
    }
    if (state.capacityInfo && (textToBinary(state.messageToEmbed).length / 8 > state.capacityInfo.capacityBytes)) {
        toast({ variant: "destructive", title: "Erreur de Capacité", description: `Message trop long (${Math.ceil(textToBinary(state.messageToEmbed).length/8)} octets). Capacité max: ${state.capacityInfo.capacityBytes} octets.` });
        return;
    }

    setState(prev => ({ ...prev, isProcessing: true, statusMessage: {type: 'info', text:"Intégration du message en cours..."} }));
    try {
      const stegoDataUri = await embedMessageInImage(state.carrierFile, state.messageToEmbed);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        stegoFileDataUri: stegoDataUri,
        statusMessage: {type: 'success', text:"Message intégré avec succès dans le fichier."} 
      }));
      toast({ title: "Succès", description: "Message intégré dans le fichier porteur." });
    } catch (error: any) {
      console.error("Embed error:", error);
      setState(prev => ({ ...prev, isProcessing: false, statusMessage: {type: 'error', text: `Erreur d'intégration: ${error.message}`} }));
      toast({ variant: "destructive", title: "Erreur d'Intégration", description: error.message });
    }
  };
  
  function textToBinary(text: string): string {
      return text.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join('');
  }

  const handleExportStegoFile = () => {
    if (!state.stegoFileDataUri || !state.fileName) {
      toast({ variant: "destructive", title: "Erreur", description: "Aucun fichier stéganographié à exporter. Veuillez d'abord intégrer un message." });
      return;
    }
    setState(prev => ({ ...prev, isExporting: true }));
    
    const a = document.createElement('a');
    a.href = state.stegoFileDataUri;
    a.download = `steg_${state.fileName}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setState(prev => ({ ...prev, isExporting: false }));
    toast({ title: "Exporté", description: `Fichier ${state.fileName} avec message intégré téléchargé.` });
  };

  const handleExtract = async () => {
    if (!state.carrierFile || !state.selectedAlgorithmId) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un fichier (contenant un message) et choisir un algorithme." });
      return;
    }
    setState(prev => ({ ...prev, isProcessing: true, statusMessage: {type: 'info', text:"Extraction du message en cours..."}, extractedMessage: null }));
    try {
      const extractedText = await extractMessageFromImage(state.carrierFile);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        extractedMessage: extractedText, 
        statusMessage: {type: 'success', text:"Message extrait avec succès."} 
      }));
      toast({ title: "Extraction Réussie", description: "Message extrait avec succès." });
    } catch (error: any) {
      console.error("Extract error:", error);
      setState(prev => ({ ...prev, isProcessing: false, statusMessage: {type: 'error', text: `Erreur d'extraction: ${error.message}`}, extractedMessage: '' })); // Set to empty string on error to avoid null issues
      toast({ variant: "destructive", title: "Erreur d'Extraction", description: error.message });
    }
  };
  
  const handleCopyExtractedMessage = async () => {
    if (!state.extractedMessage) {
      toast({ variant: "destructive", title: "Erreur", description: "Aucun message extrait à copier." });
      return;
    }
    try {
      await navigator.clipboard.writeText(state.extractedMessage);
      toast({ title: "Copié", description: "Message extrait copié dans le presse-papiers." });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({ variant: "destructive", title: "Erreur de Copie", description: "Impossible de copier le message." });
    }
  };
  
  useEffect(() => {
    const currentPreviewUrl = state.filePreviewUrl;
    return () => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }
    };
  }, [state.filePreviewUrl]);

  const isEmbedPossible = !!state.carrierFile && !!state.messageToEmbed && !!state.selectedAlgorithmId && !!state.capacityInfo && (textToBinary(state.messageToEmbed).length / 8 <= state.capacityInfo.capacityBytes);
  const isExportStegoFilePossible = !!state.stegoFileDataUri;
  const isExtractPossible = !!state.carrierFile && !!state.selectedAlgorithmId;
  const isCopyExtractedMessagePossible = !!state.extractedMessage && state.extractedMessage.length > 0;


  return (
    <div className="space-y-8">
       <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">Outil de Stéganographie d'Image (LSB sur PNG)</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
           <FileUploadCard
            carrierFile={state.carrierFile}
            fileName={state.fileName}
            filePreviewUrl={state.operationMode === 'embed' ? state.filePreviewUrl : (state.stegoFileDataUri || state.filePreviewUrl)}
            onFileChange={handleFileChange}
            messageToEmbed={state.messageToEmbed}
            onMessageToEmbedChange={handleMessageToEmbedChange}
            operationMode={state.operationMode}
            supportedFileTypesMessage="Fichiers PNG uniquement pour cet outil."
            capacityInfo={state.capacityInfo}
            // extractedMessage prop is removed as it's handled in AlgorithmActionsCard
          />
        </div>
        
        <div className="space-y-8">
          <AlgorithmActionsCard
            algorithms={availableAlgorithms} 
            selectedAlgorithmId={state.selectedAlgorithmId}
            onAlgorithmChange={handleAlgorithmChange}
            operationMode={state.operationMode}
            onOperationModeChange={handleOperationModeChange}
            onEmbed={handleEmbed}
            onExportStegoFile={handleExportStegoFile}
            onExtract={handleExtract}
            onCopyExtractedMessage={handleCopyExtractedMessage} // New handler
            isProcessing={state.isProcessing}
            isExporting={state.isExporting} // Still relevant for stego file export
            isEmbedPossible={isEmbedPossible}
            isExportStegoFilePossible={isExportStegoFilePossible}
            isExtractPossible={isExtractPossible}
            isCopyExtractedMessagePossible={isCopyExtractedMessagePossible} // New condition
            statusMessage={state.statusMessage}
            extractedMessage={state.extractedMessage} // Pass extracted message for display
          />
        </div>
      </div>
    </div>
  );
}

    