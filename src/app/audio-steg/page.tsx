
"use client";

import type React from 'react';
import { useState, useEffect } from "react";
import FileUploadCard from "@/components/hideaway/FileUploadCard";
import AlgorithmActionsCard from "@/components/hideaway/AlgorithmActionsCard";
import type { StegToolState, OperationMode, SteganographyAlgorithm } from "@/types";
import { lsbAudioWavAlgorithm, wavMetadataCommentAlgorithm } from "@/types"; 
import { useToast } from "@/hooks/use-toast";
import { 
  embedMessageInLSBAudio, 
  extractMessageFromLSBAudio, 
  embedMessageInWavMetadata,
  extractMessageFromWavMetadata,
  getAudioCapacityInfo, 
  convertObjectUrlToDataUri 
} from '@/lib/audioSteganography';

const availableAlgorithms: SteganographyAlgorithm[] = [lsbAudioWavAlgorithm, wavMetadataCommentAlgorithm]; 

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

export default function AudioStegPage() {
  const [state, setState] = useState<StegToolState>(initialState);
  const { toast } = useToast();
  const [objectUrlToRevoke, setObjectUrlToRevoke] = useState<string | null>(null);

  const selectedAlgorithm = availableAlgorithms.find(algo => algo.id === state.selectedAlgorithmId);

  const resetStateForNewFile = (clearFileSelection: boolean = false) => {
    if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
        setObjectUrlToRevoke(null);
    }
    setState(prev => ({
      ...prev,
      carrierFile: clearFileSelection ? null : prev.carrierFile,
      fileName: clearFileSelection ? null : prev.fileName,
      filePreviewUrl: clearFileSelection ? null : prev.filePreviewUrl,
      stegoFileDataUri: null,
      extractedMessage: null,
      statusMessage: null,
      capacityInfo: null, // Reset capacity on new file or algo change
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
      if (!selectedAlgorithm?.supportedFileTypes.includes(file.type)) {
         toast({ variant: "destructive", title: "Type de fichier non supporté", description: `Veuillez sélectionner un type de fichier compatible avec l'algorithme ${selectedAlgorithm?.name || 'sélectionné'} (${selectedAlgorithm?.supportedFileTypes.join(', ') || 'audio/wav'}).` });
        event.target.value = ""; 
        resetStateForNewFile(true);
        return;
      }
      
      setState(prev => ({
        ...prev,
        carrierFile: file,
        fileName: file.name,
        filePreviewUrl: null, 
        stegoFileDataUri: null,
        statusMessage: null,
        extractedMessage: null, 
        capacityInfo: null, // Reset before fetching new one
      }));

      if (state.selectedAlgorithmId) {
        try {
          const info = await getAudioCapacityInfo(file, state.selectedAlgorithmId);
          const capacityText = info.isEstimate ? `Capacité estimée pour ${selectedAlgorithm?.name}: env. ${info.capacityBytes} octets.` : `Capacité pour ${selectedAlgorithm?.name}: ${info.capacityBytes} octets.`;
          setState(prev => ({ ...prev, capacityInfo: info, statusMessage: {type: 'info', text: capacityText} }));
        } catch (error: any) {
          toast({ variant: "destructive", title: "Erreur de Capacité Audio", description: error.message });
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
    resetStateForNewFile(false); // Keep file, but reset capacity and stego data
    setState(prev => ({ ...prev, selectedAlgorithmId: algorithmId, statusMessage: null, capacityInfo: null, extractedMessage: null, stegoFileDataUri: null }));
    
    const newSelectedAlgorithm = availableAlgorithms.find(algo => algo.id === algorithmId);
    if (state.carrierFile && newSelectedAlgorithm) {
         if (!newSelectedAlgorithm.supportedFileTypes.includes(state.carrierFile.type)) {
            toast({ variant: "destructive", title: "Type de fichier incompatible", description: `Le fichier actuel (${state.carrierFile.name}) n'est pas compatible avec ${newSelectedAlgorithm.name}. Veuillez changer de fichier.` });
            // Optionally, clear the file: resetStateForNewFile(true);
            return;
        }
      try {
        const info = await getAudioCapacityInfo(state.carrierFile, algorithmId);
        const capacityText = info.isEstimate ? `Capacité estimée pour ${newSelectedAlgorithm?.name}: env. ${info.capacityBytes} octets.` : `Capacité pour ${newSelectedAlgorithm?.name}: ${info.capacityBytes} octets.`;
        setState(prev => ({ ...prev, capacityInfo: info, statusMessage: {type: 'info', text: capacityText} }));
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur de Capacité Audio", description: error.message });
        // setState(prev => ({ ...prev, capacityInfo: null, statusMessage: {type: 'error', text: error.message } }));
      }
    }
  };

  const handleOperationModeChange = (mode: OperationMode) => {
    setState(prev => ({ 
      ...prev, 
      operationMode: mode, 
      statusMessage: null, 
      extractedMessage: null, 
      stegoFileDataUri: null, // Reset stego file when changing mode
    }));
  };

  const handleEmbed = async () => {
    if (!state.carrierFile || !state.messageToEmbed || !state.selectedAlgorithmId || !selectedAlgorithm) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un fichier, saisir un message et choisir un algorithme." });
      return;
    }
    
    const messageBytes = new TextEncoder().encode(state.messageToEmbed).length;
    if (state.capacityInfo && (messageBytes > state.capacityInfo.capacityBytes) && !state.capacityInfo.isEstimate) { // For estimates, we might allow trying
        toast({ variant: "destructive", title: "Erreur de Capacité Audio", description: `Message trop long (${messageBytes} octets). Capacité max pour ${selectedAlgorithm.name}: ${state.capacityInfo.capacityBytes} octets.` });
        return;
    }
     if (state.capacityInfo && state.capacityInfo.isEstimate && messageBytes > state.capacityInfo.capacityBytes) {
      toast({ variant: "default", title: "Avertissement de Capacité", description: `Le message (${messageBytes} octets) pourrait dépasser la capacité estimée (${state.capacityInfo.capacityBytes} octets) pour ${selectedAlgorithm.name}. L'intégration pourrait échouer.` });
    }


    setState(prev => ({ ...prev, isProcessing: true, statusMessage: {type: 'info', text:`Intégration (${selectedAlgorithm.name}) en cours...`} }));
    try {
      let stegoObjectUrl: string | null = null;
      if (state.selectedAlgorithmId === lsbAudioWavAlgorithm.id) {
        stegoObjectUrl = await embedMessageInLSBAudio(state.carrierFile, state.messageToEmbed);
      } else if (state.selectedAlgorithmId === wavMetadataCommentAlgorithm.id) {
        stegoObjectUrl = await embedMessageInWavMetadata(state.carrierFile, state.messageToEmbed);
      } else {
        throw new Error("Algorithme d'intégration non supporté ou sélectionné.");
      }

      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      setObjectUrlToRevoke(stegoObjectUrl); 

      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        stegoFileDataUri: stegoObjectUrl, 
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
      toast({ variant: "destructive", title: "Erreur", description: "Aucun fichier audio stéganographié à exporter." });
      return;
    }
    setState(prev => ({ ...prev, isExporting: true }));
    
    try {
        const dataUri = await convertObjectUrlToDataUri(state.stegoFileDataUri);
        const a = document.createElement('a');
        a.href = dataUri;
        const fileExtension = state.fileName.split('.').pop() || 'wav';
        const fileNameBase = state.fileName.substring(0, state.fileName.length - (fileExtension.length + 1));
        a.download = `steg_${fileNameBase}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        toast({ title: "Exporté", description: `Fichier audio ${state.fileName} avec message intégré téléchargé.` });
    } catch (error: any) {
        console.error("Erreur d'exportation audio:", error);
        toast({ variant: "destructive", title: "Erreur d'Exportation", description: `Impossible d'exporter le fichier: ${error.message}` });
    } finally {
        setState(prev => ({ ...prev, isExporting: false }));
    }
  };

  const handleExtract = async () => {
    if (!state.carrierFile || !state.selectedAlgorithmId || !selectedAlgorithm) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un fichier audio et choisir un algorithme." });
      return;
    }
    setState(prev => ({ ...prev, isProcessing: true, statusMessage: {type: 'info', text:`Extraction (${selectedAlgorithm.name}) en cours...`}, extractedMessage: null }));
    try {
      let extractedText: string | null = null;
       if (state.selectedAlgorithmId === lsbAudioWavAlgorithm.id) {
        extractedText = await extractMessageFromLSBAudio(state.carrierFile);
      } else if (state.selectedAlgorithmId === wavMetadataCommentAlgorithm.id) {
        extractedText = await extractMessageFromWavMetadata(state.carrierFile);
      } else {
        throw new Error("Algorithme d'extraction non supporté ou sélectionné.");
      }

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
    const currentObjectUrl = objectUrlToRevoke;
    return () => {
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [objectUrlToRevoke]);

  const messageBytesForEmbed = state.messageToEmbed ? new TextEncoder().encode(state.messageToEmbed).length : 0;
  
  const isCapacityExceeded = state.capacityInfo && !state.capacityInfo.isEstimate && (messageBytesForEmbed > state.capacityInfo.capacityBytes);
  const isEmbedPossible = !!state.carrierFile && !!state.messageToEmbed && !!state.selectedAlgorithmId && !!state.capacityInfo && !isCapacityExceeded;
    
  const isExportStegoFilePossible = !!state.stegoFileDataUri;
  const isExtractPossible = !!state.carrierFile && !!state.selectedAlgorithmId;
  const isCopyExtractedMessagePossible = !!state.extractedMessage && state.extractedMessage.length > 0;


  return (
    <div className="space-y-8">
       <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">Outil de Stéganographie Audio</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
           <FileUploadCard
            carrierFile={state.carrierFile}
            fileName={state.fileName}
            filePreviewUrl={state.filePreviewUrl} 
            onFileChange={handleFileChange}
            messageToEmbed={state.messageToEmbed}
            onMessageToEmbedChange={handleMessageToEmbedChange}
            operationMode={state.operationMode}
            acceptedFileTypes={selectedAlgorithm?.supportedFileTypes.join(',') || "audio/wav,audio/wave,audio/x-wav"}
            supportedFileTypesMessage={`Fichiers compatibles: ${selectedAlgorithm?.supportedFileTypes.join(', ') || 'audio/wav'}.`}
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
