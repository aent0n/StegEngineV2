
"use client";

import type React from 'react';
import { useState, useEffect } from "react";
import FileUploadCard from "@/components/hideaway/FileUploadCard";
import AlgorithmActionsCard from "@/components/hideaway/AlgorithmActionsCard";
import type { StegToolState, OperationMode } from "@/types";
import { lsbAudioWavAlgorithm } from "@/types"; 
import { useToast } from "@/hooks/use-toast";
import { embedMessageInAudio, extractMessageFromAudio, getAudioCapacityInfo, convertObjectUrlToDataUri } from '@/lib/audioSteganography';

const availableAlgorithms = [lsbAudioWavAlgorithm]; 

const initialState: StegToolState = {
  carrierFile: null,
  fileName: null,
  filePreviewUrl: null, 
  stegoFileDataUri: null, // Sera un Object URL après intégration, converti en Data URI pour l'export
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


  const resetStateForNewFile = () => {
    if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
        setObjectUrlToRevoke(null);
    }
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
    
    if (state.filePreviewUrl && state.filePreviewUrl.startsWith('blob:')) { 
        URL.revokeObjectURL(state.filePreviewUrl);
    }
     if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
        setObjectUrlToRevoke(null);
    }


    if (file) {
      if (file.type !== 'audio/wav' && file.type !== 'audio/wave' && file.type !== 'audio/x-wav') {
        toast({ variant: "destructive", title: "Type de fichier non supporté", description: "Veuillez sélectionner un fichier audio WAV (.wav)." });
        event.target.value = ""; 
        resetStateForNewFile();
        return;
      }
      // Pour l'audio, filePreviewUrl n'est pas utilisé pour un aperçu visuel mais pourrait l'être pour des contrôles audio
      // Pour l'instant, nous n'allons pas le créer pour éviter la complexité
      setState(prev => ({
        ...prev,
        carrierFile: file,
        fileName: file.name,
        filePreviewUrl: null, // Pas de preview pour l'audio ici
        stegoFileDataUri: null,
        statusMessage: null,
        extractedMessage: null, 
        capacityInfo: null,
      }));

      try {
        const info = await getAudioCapacityInfo(file);
        setState(prev => ({ ...prev, capacityInfo: info, statusMessage: {type: 'info', text: `Capacité LSB WAV: ${info.capacityBytes} octets.`} }));
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur de Capacité Audio", description: error.message });
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
      extractedMessage: null, 
    }));
  };

  const handleEmbed = async () => {
    if (!state.carrierFile || !state.messageToEmbed || !state.selectedAlgorithmId) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un fichier, saisir un message et choisir un algorithme." });
      return;
    }
    
    const messageBytes = new TextEncoder().encode(state.messageToEmbed).length;
    if (state.capacityInfo && (messageBytes > state.capacityInfo.capacityBytes)) {
        toast({ variant: "destructive", title: "Erreur de Capacité Audio", description: `Message trop long (${messageBytes} octets). Capacité max: ${state.capacityInfo.capacityBytes} octets.` });
        return;
    }

    setState(prev => ({ ...prev, isProcessing: true, statusMessage: {type: 'info', text:"Intégration du message dans l'audio en cours..."} }));
    try {
      const stegoObjectUrl = await embedMessageInAudio(state.carrierFile, state.messageToEmbed);
      if (objectUrlToRevoke) { // Révoquer l'ancien si existant
        URL.revokeObjectURL(objectUrlToRevoke);
      }
      setObjectUrlToRevoke(stegoObjectUrl); // Garder une trace pour révocation ultérieure

      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        stegoFileDataUri: stegoObjectUrl, // Stocker l'Object URL
        statusMessage: {type: 'success', text:"Message intégré avec succès dans le fichier audio."} 
      }));
      toast({ title: "Succès", description: "Message intégré dans le fichier audio." });
    } catch (error: any) {
      console.error("Erreur d'intégration audio:", error);
      setState(prev => ({ ...prev, isProcessing: false, statusMessage: {type: 'error', text: `Erreur d'intégration audio: ${error.message}`} }));
      toast({ variant: "destructive", title: "Erreur d'Intégration Audio", description: error.message });
    }
  };
  
 const handleExportStegoFile = async () => {
    if (!state.stegoFileDataUri || !state.fileName) {
      toast({ variant: "destructive", title: "Erreur", description: "Aucun fichier audio stéganographié à exporter." });
      return;
    }
    setState(prev => ({ ...prev, isExporting: true }));
    
    try {
        // Convertir l'Object URL en Data URI pour le téléchargement
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
    if (!state.carrierFile || !state.selectedAlgorithmId) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un fichier audio (contenant un message) et choisir un algorithme." });
      return;
    }
    setState(prev => ({ ...prev, isProcessing: true, statusMessage: {type: 'info', text:"Extraction du message audio en cours..."}, extractedMessage: null }));
    try {
      const extractedText = await extractMessageFromAudio(state.carrierFile);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        extractedMessage: extractedText, 
        statusMessage: {type: 'success', text:"Message extrait avec succès du fichier audio."} 
      }));
      toast({ title: "Extraction Réussie", description: "Message extrait avec succès." });
    } catch (error: any) {
      console.error("Erreur d'extraction audio:", error);
      setState(prev => ({ ...prev, isProcessing: false, statusMessage: {type: 'error', text: `Erreur d'extraction audio: ${error.message}`}, extractedMessage: '' }));
      toast({ variant: "destructive", title: "Erreur d'Extraction Audio", description: error.message });
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
    // Nettoyage de l'URL de l'objet lors du démontage du composant ou si un nouveau fichier est traité
    return () => {
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [objectUrlToRevoke]);

  const messageBytesForEmbed = state.messageToEmbed ? new TextEncoder().encode(state.messageToEmbed).length : 0;
  const isEmbedPossible = !!state.carrierFile && !!state.messageToEmbed && !!state.selectedAlgorithmId && !!state.capacityInfo && (messageBytesForEmbed <= state.capacityInfo.capacityBytes);
  const isExportStegoFilePossible = !!state.stegoFileDataUri;
  const isExtractPossible = !!state.carrierFile && !!state.selectedAlgorithmId;
  const isCopyExtractedMessagePossible = !!state.extractedMessage && state.extractedMessage.length > 0;


  return (
    <div className="space-y-8">
       <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">Outil de Stéganographie Audio (LSB sur WAV)</h1>
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
            acceptedFileTypes="audio/wav,audio/wave,audio/x-wav"
            supportedFileTypesMessage="Fichiers audio WAV (.wav) pour cet outil."
            capacityInfo={state.capacityInfo}
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

