
"use client";

import type React from 'react';
import { useState, useEffect } from "react";
import FileUploadCard from "@/components/hideaway/FileUploadCard";
import AlgorithmActionsCard from "@/components/hideaway/AlgorithmActionsCard";
import type { StegToolState, OperationMode, SteganographyAlgorithm, CapacityInfo } from "@/types";
import { lsbPngAlgorithm, pngMetadataTextAlgorithm } from "@/types"; 
import { useToast } from "@/hooks/use-toast";
import { embedMessageInImage, extractMessageFromImage, getCapacityInfo, convertObjectUrlToDataUri } from '@/lib/steganography';

const availableAlgorithms: SteganographyAlgorithm[] = [lsbPngAlgorithm, pngMetadataTextAlgorithm];

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
  const [objectUrlToRevoke, setObjectUrlToRevoke] = useState<string | null>(null);

  const selectedAlgorithm = availableAlgorithms.find(algo => algo.id === state.selectedAlgorithmId);

  const resetStateForNewFile = (clearFileSelection: boolean = false) => {
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
      setObjectUrlToRevoke(null);
    }
    if (state.filePreviewUrl && state.filePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(state.filePreviewUrl);
    }

    setState(prev => ({
      ...prev,
      carrierFile: clearFileSelection ? null : prev.carrierFile,
      fileName: clearFileSelection ? null : prev.fileName,
      filePreviewUrl: clearFileSelection ? null : prev.filePreviewUrl,
      stegoFileDataUri: null,
      extractedMessage: null,
      statusMessage: null,
      capacityInfo: null, 
    }));
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (state.filePreviewUrl && state.filePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(state.filePreviewUrl);
    }
    if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
        setObjectUrlToRevoke(null);
    }
    
    if (file) {
      const currentSelectedAlgo = availableAlgorithms.find(a => a.id === state.selectedAlgorithmId) || availableAlgorithms[0];
      if (!currentSelectedAlgo?.supportedFileTypes.includes(file.type)) {
         toast({ variant: "destructive", title: "Type de fichier non supporté", description: `Veuillez sélectionner un type de fichier compatible avec l'algorithme ${currentSelectedAlgo?.name || 'sélectionné'} (${currentSelectedAlgo?.supportedFileTypes.join(', ') || 'image/png'}).` });
        event.target.value = ""; 
        resetStateForNewFile(true);
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

      if (state.selectedAlgorithmId) {
        try {
          const info = await getCapacityInfo(file, state.selectedAlgorithmId);
          const algoForCapacityToast = availableAlgorithms.find(a => a.id === state.selectedAlgorithmId) || availableAlgorithms[0];
          const capacityText = info.isEstimate 
            ? `Capacité estimée pour ${algoForCapacityToast?.name}: env. ${info.capacityBytes} octets.`
            : `Capacité pour ${algoForCapacityToast?.name}: ${info.capacityBytes} octets.`;
          if (info.width && info.height) {
            setState(prev => ({ ...prev, capacityInfo: info, statusMessage: {type: 'info', text: `${capacityText} Dimensions: ${info.width}x${info.height}px.`} }));
          } else {
            setState(prev => ({ ...prev, capacityInfo: info, statusMessage: {type: 'info', text: capacityText} }));
          }
        } catch (error: any) {
          toast({ variant: "destructive", title: "Erreur de Capacité", description: error.message });
          setState(prev => ({ ...prev, capacityInfo: null, statusMessage: {type: 'error', text: error.message } }));
        }
      }

    } else {
      resetStateForNewFile(true);
    }
  };

  const handleMessageToEmbedChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState(prev => ({ ...prev, messageToEmbed: event.target.value, statusMessage: null }));
  };

  const handleAlgorithmChange = async (algorithmId: string) => {
    resetStateForNewFile(false); 
    setState(prev => ({ ...prev, selectedAlgorithmId: algorithmId, statusMessage: null, capacityInfo: null, extractedMessage: null, stegoFileDataUri: null }));
    
    const newSelectedAlgorithm = availableAlgorithms.find(algo => algo.id === algorithmId);
    if (state.carrierFile && newSelectedAlgorithm) {
         if (!newSelectedAlgorithm.supportedFileTypes.includes(state.carrierFile.type)) {
            toast({ variant: "destructive", title: "Type de fichier incompatible", description: `Le fichier actuel (${state.carrierFile.name}) n'est pas compatible avec ${newSelectedAlgorithm.name}. Veuillez changer de fichier.` });
            return;
        }
      try {
        const info = await getCapacityInfo(state.carrierFile, algorithmId);
        const capacityText = info.isEstimate 
          ? `Capacité estimée pour ${newSelectedAlgorithm?.name}: env. ${info.capacityBytes} octets.`
          : `Capacité pour ${newSelectedAlgorithm?.name}: ${info.capacityBytes} octets.`;
        if (info.width && info.height) {
          setState(prev => ({ ...prev, capacityInfo: info, statusMessage: {type: 'info', text: `${capacityText} Dimensions: ${info.width}x${info.height}px.`} }));
        } else {
          setState(prev => ({ ...prev, capacityInfo: info, statusMessage: {type: 'info', text: capacityText} }));
        }
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur de Capacité", description: error.message });
      }
    }
  };

  const handleOperationModeChange = (mode: OperationMode) => {
    setState(prev => ({ 
      ...prev, 
      operationMode: mode, 
      statusMessage: null, 
      extractedMessage: null, 
      // Don't clear stegoFileDataUri on mode change to allow embed then extract from result
    }));
  };

  const handleEmbed = async () => {
    if (!state.carrierFile || !state.messageToEmbed || !state.selectedAlgorithmId || !selectedAlgorithm) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un fichier, saisir un message et choisir un algorithme." });
      return;
    }
    
    const messageBytes = new TextEncoder().encode(state.messageToEmbed).length;
    if (state.capacityInfo && !state.capacityInfo.isEstimate && (messageBytes > state.capacityInfo.capacityBytes)) {
        toast({ variant: "destructive", title: "Erreur de Capacité", description: `Message trop long (${messageBytes} octets). Capacité max pour ${selectedAlgorithm.name}: ${state.capacityInfo.capacityBytes} octets.` });
        return;
    }
    if (state.capacityInfo && state.capacityInfo.isEstimate && messageBytes > state.capacityInfo.capacityBytes) {
      toast({ variant: "default", title: "Avertissement de Capacité", description: `Le message (${messageBytes} octets) pourrait dépasser la capacité estimée (${state.capacityInfo.capacityBytes} octets) pour ${selectedAlgorithm.name}. L'intégration pourrait échouer.` });
    }

    setState(prev => ({ ...prev, isProcessing: true, statusMessage: {type: 'info', text:`Intégration (${selectedAlgorithm.name}) en cours...`} }));
    try {
      const stegoObjectOrDataUri = await embedMessageInImage(state.carrierFile, state.messageToEmbed, state.selectedAlgorithmId);
      
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      if (stegoObjectOrDataUri.startsWith('blob:')) { 
        setObjectUrlToRevoke(stegoObjectOrDataUri);
      } else { 
        setObjectUrlToRevoke(null);
      }

      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        stegoFileDataUri: stegoObjectOrDataUri, 
        statusMessage: {type: 'success', text:`Message intégré avec succès via ${selectedAlgorithm.name}.`} 
      }));
      toast({ title: "Succès", description: `Message intégré via ${selectedAlgorithm.name}.` });
    } catch (error: any) {
      console.error(`Erreur d'intégration (${selectedAlgorithm.name}):`, error);
      setState(prev => ({ ...prev, isProcessing: false, statusMessage: {type: 'error', text: `Erreur d'intégration (${selectedAlgorithm.name}): ${error.message}`} }));
      toast({ variant: "destructive", title: `Erreur d'Intégration (${selectedAlgorithm.name})`, description: error.message });
    }
  };
  
  const handleExportStegoFile = async () => {
    if (!state.stegoFileDataUri || !state.fileName) {
      toast({ variant: "destructive", title: "Erreur", description: "Aucun fichier stéganographié à exporter." });
      return;
    }
    setState(prev => ({ ...prev, isExporting: true }));
    
    try {
        let downloadableUri = state.stegoFileDataUri;
        // If it's an object URL, convert to Data URI for robust download
        if (state.stegoFileDataUri.startsWith('blob:')) {
            downloadableUri = await convertObjectUrlToDataUri(state.stegoFileDataUri);
        }

        const a = document.createElement('a');
        a.href = downloadableUri;
        const fileExtension = state.fileName.split('.').pop() || 'png';
        const fileNameBase = state.fileName.substring(0, state.fileName.lastIndexOf('.')) || state.fileName;
        a.download = `steg_${fileNameBase}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        toast({ title: "Exporté", description: `Fichier image ${state.fileName} avec message intégré téléchargé.` });
    } catch (error: any) {
        console.error("Erreur d'exportation d'image:", error);
        toast({ variant: "destructive", title: "Erreur d'Exportation", description: `Impossible d'exporter le fichier: ${error.message}` });
    } finally {
        setState(prev => ({ ...prev, isExporting: false }));
    }
  };

  const handleExtract = async () => {
    let fileForExtraction: File | null = null;

    if (state.stegoFileDataUri && state.operationMode === 'extract') {
        try {
            const response = await fetch(state.stegoFileDataUri);
            if (!response.ok) throw new Error(`Échec de la récupération du fichier stéganographié: ${response.status}`);
            const blob = await response.blob();
            fileForExtraction = new File([blob], state.fileName || "stego_image.png", { type: blob.type || selectedAlgorithm?.supportedFileTypes[0] || "image/png" });
        } catch (fetchError: any) {
            toast({ variant: "destructive", title: "Erreur interne", description: `Impossible de charger le fichier modifié pour extraction: ${fetchError.message}` });
            setState(prev => ({ ...prev, isProcessing: false }));
            return;
        }
    } else if (state.carrierFile) {
        fileForExtraction = state.carrierFile;
    }

    if (!fileForExtraction || !state.selectedAlgorithmId || !selectedAlgorithm) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un fichier et choisir un algorithme." });
      return;
    }
    setState(prev => ({ ...prev, isProcessing: true, statusMessage: {type: 'info', text:`Extraction (${selectedAlgorithm.name}) en cours...`}, extractedMessage: null }));
    try {
      const extractedText = await extractMessageFromImage(fileForExtraction, state.selectedAlgorithmId);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        extractedMessage: extractedText, 
        statusMessage: {type: 'success', text:`Message extrait avec succès via ${selectedAlgorithm.name}.`} 
      }));
      toast({ title: "Extraction Réussie", description: `Message extrait via ${selectedAlgorithm.name}.` });
    } catch (error: any) {
      console.error(`Erreur d'extraction (${selectedAlgorithm.name}):`, error);
      setState(prev => ({ ...prev, isProcessing: false, statusMessage: {type: 'error', text: `Erreur d'extraction (${selectedAlgorithm.name}): ${error.message}`}, extractedMessage: '' }));
      toast({ variant: "destructive", title: `Erreur d'Extraction (${selectedAlgorithm.name})`, description: error.message });
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
      console.error('Échec de la copie du texte: ', err);
      toast({ variant: "destructive", title: "Erreur de Copie", description: "Impossible de copier le message." });
    }
  };
  
  useEffect(() => {
    const currentPreviewUrlForCleanup = state.filePreviewUrl;
    const currentObjectUrlToRevoke = objectUrlToRevoke;
  
    return () => {
      if (currentPreviewUrlForCleanup && currentPreviewUrlForCleanup.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreviewUrlForCleanup);
      }
      if (currentObjectUrlToRevoke) {
        URL.revokeObjectURL(currentObjectUrlToRevoke);
      }
    };
  }, [state.filePreviewUrl, objectUrlToRevoke]);


  const messageBytesForEmbed = state.messageToEmbed ? new TextEncoder().encode(state.messageToEmbed).length : 0;
  
  const isCapacityExceeded = state.capacityInfo && !state.capacityInfo.isEstimate && (messageBytesForEmbed > state.capacityInfo.capacityBytes);
  const isEmbedPossible = !!state.carrierFile && !!state.messageToEmbed && !!state.selectedAlgorithmId && !!state.capacityInfo && !isCapacityExceeded;
    
  const isExportStegoFilePossible = !!state.stegoFileDataUri;
  const isExtractPossible = !!(state.carrierFile || (state.stegoFileDataUri && state.operationMode === 'extract')) && !!state.selectedAlgorithmId;
  const isCopyExtractedMessagePossible = !!state.extractedMessage && state.extractedMessage.length > 0;

  // Determine which URL to use for preview in FileUploadCard
  // In 'extract' mode, if stegoFileDataUri is available, prefer it for preview.
  // Otherwise, use the general filePreviewUrl (which comes from the uploaded carrierFile).
  const previewUrlForCard = state.operationMode === 'extract' && state.stegoFileDataUri 
                            ? state.stegoFileDataUri 
                            : state.filePreviewUrl;

  return (
    <div className="space-y-8">
       <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">Outil de Stéganographie d'Image</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
           <FileUploadCard
            carrierFile={state.carrierFile}
            fileName={state.fileName}
            filePreviewUrl={previewUrlForCard}
            onFileChange={handleFileChange}
            messageToEmbed={state.messageToEmbed}
            onMessageToEmbedChange={handleMessageToEmbedChange}
            operationMode={state.operationMode}
            acceptedFileTypes={selectedAlgorithm?.supportedFileTypes.join(',') || "image/png"}
            supportedFileTypesMessage={`Fichiers compatibles: ${selectedAlgorithm?.supportedFileTypes.join(', ') || 'PNG'}.`}
            capacityInfo={state.capacityInfo}
            isMetadataAlgorithm={selectedAlgorithm?.isMetadataBased || false}
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
            onCopyExtractedMessage={handleCopyExtractedMessage} 
            isProcessing={state.isProcessing}
            isExporting={state.isExporting} 
            isEmbedPossible={isEmbedPossible}
            isExportStegoFilePossible={isExportStegoFilePossible}
            isExtractPossible={isExtractPossible}
            isCopyExtractedMessagePossible={isCopyExtractedMessagePossible} 
            statusMessage={state.statusMessage}
            extractedMessage={state.extractedMessage} 
          />
        </div>
      </div>
    </div>
  );
}
