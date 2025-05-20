
"use client";

import type React from 'react';
import { useState, useEffect } from "react";
import FileUploadCard from "@/components/hideaway/FileUploadCard";
import AlgorithmActionsCard from "@/components/hideaway/AlgorithmActionsCard";
import type { StegToolState, OperationMode } from "@/types";
import { lsbAudioWavAlgorithm } from "@/types"; 
import { useToast } from "@/hooks/use-toast";
import { embedMessageInAudio, extractMessageFromAudio, getAudioCapacityInfo } from '@/lib/audioSteganography'; // Fonctions simulées

const availableAlgorithms = [lsbAudioWavAlgorithm]; // Algorithme spécifique pour audio

const initialState: StegToolState = {
  carrierFile: null,
  fileName: null,
  filePreviewUrl: null, // Pour audio, ceci est utilisé pour l'icône, pas pour une preview Image
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
    if (state.filePreviewUrl) { // Si un URL d'objet existait, le révoquer
        URL.revokeObjectURL(state.filePreviewUrl);
    }

    if (file) {
      // Vérification de type de fichier pour l'audio (ex: WAV, MP3)
      if (!file.type.startsWith('audio/')) { // Accepte tous les sous-types audio pour la simulation
        toast({ variant: "destructive", title: "Type de fichier non supporté", description: "Veuillez sélectionner un fichier audio (ex: WAV, MP3)." });
        event.target.value = ""; 
        resetStateForNewFile();
        return;
      }
      const filePreviewUrl = URL.createObjectURL(file); // Utilisé pour l'icône
      setState(prev => ({
        ...prev,
        carrierFile: file,
        fileName: file.name,
        filePreviewUrl, // Pas pour Image, mais pour l'état
        stegoFileDataUri: null,
        statusMessage: null,
        extractedMessage: null, 
        capacityInfo: null,
      }));

      try {
        // Utiliser la fonction simulée pour obtenir la capacité audio
        const info = await getAudioCapacityInfo(file);
        setState(prev => ({ ...prev, capacityInfo: info, statusMessage: {type: 'info', text: `Capacité simulée: ${info.capacityBytes} octets.`} }));
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur de Capacité (Simulée)", description: error.message });
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
        toast({ variant: "destructive", title: "Erreur de Capacité (Simulée)", description: `Message trop long (${messageBytes} octets). Capacité max simulée: ${state.capacityInfo.capacityBytes} octets.` });
        return;
    }

    setState(prev => ({ ...prev, isProcessing: true, statusMessage: {type: 'info', text:"Intégration (simulée) du message en cours..."} }));
    try {
      // Utiliser la fonction simulée d'intégration audio
      const stegoDataUri = await embedMessageInAudio(state.carrierFile, state.messageToEmbed);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        stegoFileDataUri: stegoDataUri,
        statusMessage: {type: 'success', text:"Message intégré (simulé) avec succès dans le fichier audio."} 
      }));
      toast({ title: "Succès (Simulé)", description: "Message intégré dans le fichier porteur audio." });
    } catch (error: any) {
      console.error("Erreur d'intégration (simulée):", error);
      setState(prev => ({ ...prev, isProcessing: false, statusMessage: {type: 'error', text: `Erreur d'intégration (simulée): ${error.message}`} }));
      toast({ variant: "destructive", title: "Erreur d'Intégration (Simulée)", description: error.message });
    }
  };
  
  const handleExportStegoFile = () => {
    if (!state.stegoFileDataUri || !state.fileName) {
      toast({ variant: "destructive", title: "Erreur", description: "Aucun fichier audio stéganographié (simulé) à exporter." });
      return;
    }
    setState(prev => ({ ...prev, isExporting: true }));
    
    const a = document.createElement('a');
    a.href = state.stegoFileDataUri;
    // Ajouter un préfixe au nom du fichier pour indiquer qu'il est "stégo"
    const fileExtension = state.fileName.split('.').pop();
    const fileNameBase = state.fileName.substring(0, state.fileName.length - (fileExtension ? fileExtension.length + 1 : 0));
    a.download = `steg_${fileNameBase}.${fileExtension || 'wav'}`; // Assurer une extension
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setState(prev => ({ ...prev, isExporting: false }));
    toast({ title: "Exporté (Simulé)", description: `Fichier audio ${state.fileName} avec message intégré (simulé) téléchargé.` });
  };

  const handleExtract = async () => {
    if (!state.carrierFile || !state.selectedAlgorithmId) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un fichier audio (contenant un message simulé) et choisir un algorithme." });
      return;
    }
    setState(prev => ({ ...prev, isProcessing: true, statusMessage: {type: 'info', text:"Extraction (simulée) du message en cours..."}, extractedMessage: null }));
    try {
      // Utiliser la fonction simulée d'extraction audio
      const extractedText = await extractMessageFromAudio(state.carrierFile);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        extractedMessage: extractedText, 
        statusMessage: {type: 'success', text:"Message extrait (simulé) avec succès."} 
      }));
      toast({ title: "Extraction Réussie (Simulée)", description: "Message extrait avec succès (simulation)." });
    } catch (error: any) {
      console.error("Erreur d'extraction (simulée):", error);
      setState(prev => ({ ...prev, isProcessing: false, statusMessage: {type: 'error', text: `Erreur d'extraction (simulée): ${error.message}`}, extractedMessage: '' }));
      toast({ variant: "destructive", title: "Erreur d'Extraction (Simulée)", description: error.message });
    }
  };
  
  const handleCopyExtractedMessage = async () => {
    if (!state.extractedMessage) {
      toast({ variant: "destructive", title: "Erreur", description: "Aucun message extrait (simulé) à copier." });
      return;
    }
    try {
      await navigator.clipboard.writeText(state.extractedMessage);
      toast({ title: "Copié", description: "Message extrait (simulé) copié dans le presse-papiers." });
    } catch (err) {
      console.error('Échec de la copie du texte: ', err);
      toast({ variant: "destructive", title: "Erreur de Copie", description: "Impossible de copier le message." });
    }
  };
  
  useEffect(() => {
    const currentPreviewUrl = state.filePreviewUrl;
    // Nettoyage de l'URL de l'objet lors du démontage du composant ou si filePreviewUrl change
    return () => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }
    };
  }, [state.filePreviewUrl]);

  const messageBytesForEmbed = state.messageToEmbed ? new TextEncoder().encode(state.messageToEmbed).length : 0;
  const isEmbedPossible = !!state.carrierFile && !!state.messageToEmbed && !!state.selectedAlgorithmId && !!state.capacityInfo && (messageBytesForEmbed <= state.capacityInfo.capacityBytes);
  const isExportStegoFilePossible = !!state.stegoFileDataUri;
  const isExtractPossible = !!state.carrierFile && !!state.selectedAlgorithmId;
  const isCopyExtractedMessagePossible = !!state.extractedMessage && state.extractedMessage.length > 0;


  return (
    <div className="space-y-8">
       <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">Outil de Stéganographie Audio (Simulé)</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
           <FileUploadCard
            carrierFile={state.carrierFile}
            fileName={state.fileName}
            filePreviewUrl={state.filePreviewUrl} // Pour l'icône
            onFileChange={handleFileChange}
            messageToEmbed={state.messageToEmbed}
            onMessageToEmbedChange={handleMessageToEmbedChange}
            operationMode={state.operationMode}
            acceptedFileTypes="audio/wav,audio/mpeg,audio/wave,audio/x-wav" // Accepte WAV et MP3
            supportedFileTypesMessage="Fichiers audio (WAV, MP3) pour cet outil simulé."
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
