
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from "react";
import FileUploadCard from "@/components/hideaway/FileUploadCard";
import AlgorithmActionsCard from "@/components/hideaway/AlgorithmActionsCard";
import AlgorithmAdvisorCard from "@/components/hideaway/AlgorithmAdvisorCard";
import type { StegToolState, OperationMode, SteganographyAlgorithm } from "@/types";
import { mockAlgorithms, fileTypeOptions } from "@/types";
import { useToast } from "@/hooks/use-toast";
import type { AlgorithmAdvisorOutput } from '@/ai/flows/algorithm-advisor';

const imageAlgorithms = mockAlgorithms.filter(algo => algo.supportedFileTypes.includes('image'));

const initialState: StegToolState = {
  carrierFile: null,
  fileName: null,
  filePreviewUrl: null,
  messageToEmbed: "",
  extractedMessage: null,
  selectedAlgorithmId: null,
  aiSuggestion: null,
  isProcessing: false, // Covers embedding and extracting
  isExporting: false, // Covers exporting stego file and saving extracted text
  isAdvisorLoading: false,
  operationMode: 'embed',
  statusMessage: null,
};

export default function ImageStegPage() {
  const [state, setState] = useState<StegToolState>(initialState);
  const { toast } = useToast();

  const resetStatus = () => {
    setState(prev => ({ ...prev, statusMessage: null }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ variant: "destructive", title: "Type de fichier non supporté", description: "Veuillez sélectionner un fichier image (PNG, JPG)." });
        // Clear the input
        event.target.value = ""; 
        setState(prev => ({
          ...prev,
          carrierFile: null,
          fileName: null,
          filePreviewUrl: null,
        }));
        return;
      }
      const filePreviewUrl = URL.createObjectURL(file);
      setState(prev => ({
        ...prev,
        carrierFile: file,
        fileName: file.name,
        filePreviewUrl,
        statusMessage: null,
        extractedMessage: null, // Reset extracted message on new file
      }));
    } else {
      setState(prev => ({
        ...prev,
        carrierFile: null,
        fileName: null,
        filePreviewUrl: null,
        statusMessage: null,
        extractedMessage: null,
      }));
    }
  };

  const handleMessageToEmbedChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState(prev => ({ ...prev, messageToEmbed: event.target.value, statusMessage: null }));
  };

  const handleAlgorithmChange = (algorithmId: string) => {
    setState(prev => ({ ...prev, selectedAlgorithmId: algorithmId, statusMessage: null }));
  };

  const handleOperationModeChange = (mode: OperationMode) => {
    setState(prev => ({ ...prev, operationMode: mode, statusMessage: null, extractedMessage: null }));
  };

  const handleAiSuggestion = useCallback((suggestion: AlgorithmAdvisorOutput) => {
    setState(prev => ({ ...prev, aiSuggestion: suggestion, isAdvisorLoading: false }));
    const suggestedAlgo = imageAlgorithms.find(algo => algo.name.toLowerCase().includes(suggestion.algorithm.toLowerCase().split(" ")[0]));
    if (suggestedAlgo) {
      setState(prev => ({ ...prev, selectedAlgorithmId: suggestedAlgo.id }));
      toast({
        title: "Suggestion IA appliquée",
        description: `${suggestion.algorithm} a été sélectionné.`,
      });
    }
  }, [toast]);
  
  const handleEmbed = () => {
    if (!state.carrierFile || !state.messageToEmbed || !state.selectedAlgorithmId) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un fichier, saisir un message et choisir un algorithme." });
      return;
    }
    setState(prev => ({ ...prev, isProcessing: true, statusMessage: null }));
    setTimeout(() => {
      setState(prev => ({ ...prev, isProcessing: false, statusMessage: {type: 'success', text:"Message intégré dans le fichier (simulé)."} }));
      toast({ title: "Succès (Simulé)", description: "Message intégré dans le fichier porteur." });
    }, 1500);
  };

  const handleExportStegoFile = () => {
    if (!state.carrierFile || state.statusMessage?.text !== "Message intégré dans le fichier (simulé).") { // Check specific success message
      toast({ variant: "destructive", title: "Erreur", description: "Aucun message intégré à exporter ou fichier manquant." });
      return;
    }
    setState(prev => ({ ...prev, isExporting: true }));
    setTimeout(() => {
      const url = URL.createObjectURL(state.carrierFile!);
      const a = document.createElement('a');
      a.href = url;
      a.download = `steg_${state.fileName}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setState(prev => ({ ...prev, isExporting: false }));
      toast({ title: "Exporté (Simulé)", description: `Fichier ${state.fileName} téléchargé.` });
    }, 1500);
  };

  const handleExtract = () => {
    if (!state.carrierFile || !state.selectedAlgorithmId) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un fichier et choisir un algorithme." });
      return;
    }
    setState(prev => ({ ...prev, isProcessing: true, statusMessage: null, extractedMessage: null }));
    setTimeout(() => {
      const simulatedExtractedText = "Ceci est un message secret extrait (simulation).";
      setState(prev => ({ ...prev, isProcessing: false, extractedMessage: simulatedExtractedText, statusMessage: {type: 'success', text:"Message extrait du fichier (simulé)."} }));
      toast({ title: "Extraction Réussie (Simulée)", description: "Message extrait avec succès." });
    }, 1500);
  };

  const handleSaveExtractedMessage = () => {
    if (!state.extractedMessage) {
      toast({ variant: "destructive", title: "Erreur", description: "Aucun message extrait à sauvegarder." });
      return;
    }
    setState(prev => ({ ...prev, isExporting: true }));
    setTimeout(() => {
      const blob = new Blob([state.extractedMessage!], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `message_extrait_${state.fileName?.split('.')[0] || 'fichier'}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setState(prev => ({ ...prev, isExporting: false }));
      toast({ title: "Sauvegardé (Simulé)", description: "Message extrait sauvegardé en .txt." });
    }, 1500);
  };
  
  useEffect(() => {
    const currentPreviewUrl = state.filePreviewUrl;
    return () => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }
    };
  }, [state.filePreviewUrl]);

  const isEmbedPossible = !!state.carrierFile && !!state.messageToEmbed && !!state.selectedAlgorithmId;
  const isExportStegoFilePossible = !!state.carrierFile && state.statusMessage?.text === "Message intégré dans le fichier (simulé).";
  const isExtractPossible = !!state.carrierFile && !!state.selectedAlgorithmId;
  const isSaveExtractedMessagePossible = !!state.extractedMessage;

  return (
    <div className="space-y-8">
       <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">Outil de Stéganographie d'Image</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
           <FileUploadCard
            carrierFile={state.carrierFile}
            fileName={state.fileName}
            filePreviewUrl={state.filePreviewUrl}
            onFileChange={handleFileChange}
            messageToEmbed={state.messageToEmbed}
            onMessageToEmbedChange={handleMessageToEmbedChange}
            extractedMessage={state.extractedMessage}
            operationMode={state.operationMode}
          />
        </div>
        
        <div className="space-y-8">
          <AlgorithmActionsCard
            algorithms={imageAlgorithms}
            selectedAlgorithmId={state.selectedAlgorithmId}
            onAlgorithmChange={handleAlgorithmChange}
            operationMode={state.operationMode}
            onOperationModeChange={handleOperationModeChange}
            onEmbed={handleEmbed}
            onExportStegoFile={handleExportStegoFile}
            onExtract={handleExtract}
            onSaveExtractedMessage={handleSaveExtractedMessage}
            isProcessing={state.isProcessing}
            isExporting={state.isExporting}
            isEmbedPossible={isEmbedPossible}
            isExportStegoFilePossible={isExportStegoFilePossible}
            isExtractPossible={isExtractPossible}
            isSaveExtractedMessagePossible={isSaveExtractedMessagePossible}
            statusMessage={state.statusMessage}
          />
          <AlgorithmAdvisorCard 
            onSuggestion={handleAiSuggestion} 
            // Pass context that this is for images, so advisor can refine if needed
            // For now, the advisor card still has its own fileType selector
            // but we're filtering algorithms passed to AlgorithmActionsCard
          />
        </div>
      </div>
    </div>
  );
}
