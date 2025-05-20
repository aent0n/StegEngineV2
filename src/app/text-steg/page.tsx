
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from "react";
import TextInteractionCard from "@/components/hideaway/TextInteractionCard";
import AlgorithmActionsCard from "@/components/hideaway/AlgorithmActionsCard";
import type { StegToolState, OperationMode, SteganographyAlgorithm } from "@/types";
import { whitespaceTextAlgorithm } from "@/types"; 
import { useToast } from "@/hooks/use-toast";
import { 
  embedMessageInText, 
  extractMessageFromText, 
  getTextCapacityInfo 
} from '@/lib/textSteganography';

const availableAlgorithms: SteganographyAlgorithm[] = [whitespaceTextAlgorithm]; 

const initialState: StegToolState = {
  carrierFile: null, // Not used for text tool
  fileName: null, // Used for exported stego text file name
  filePreviewUrl: null, 
  stegoFileDataUri: null, // Not directly used, stegoText holds the content

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
  coverText: "Ceci est un exemple de texte porteur.\nChaque ligne peut cacher un bit d'information.\nEssayez d'y cacher un message secret !\nUtilisez plusieurs lignes pour plus de capacité.\nLes espaces en fin de ligne seront utilisés discrètement.\nAssurez-vous que votre message n'est pas trop long.\nLa stéganographie textuelle peut être subtile.\nFin du texte d'exemple.",
  stegoText: null,
};

export default function TextStegPage() {
  const [state, setState] = useState<StegToolState>(initialState);
  const { toast } = useToast();

  const selectedAlgorithm = availableAlgorithms.find(algo => algo.id === state.selectedAlgorithmId);

  const updateCapacity = useCallback(async (text: string, algoId: string | null) => {
    if (text && algoId === whitespaceTextAlgorithm.id) {
      try {
        const info = await getTextCapacityInfo(text);
        const capacityText = `Capacité pour ${whitespaceTextAlgorithm.name}: ${info.capacityBytes} octets (${text.split('\n').length} lignes).`;
        setState(prev => ({ ...prev, capacityInfo: info, statusMessage: {type: 'info', text: capacityText} }));
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur de Capacité Texte", description: error.message });
        setState(prev => ({ ...prev, capacityInfo: null, statusMessage: {type: 'error', text: error.message } }));
      }
    } else {
       setState(prev => ({ ...prev, capacityInfo: null }));
    }
  }, [toast]);

  useEffect(() => {
    if (state.coverText && state.selectedAlgorithmId) {
      updateCapacity(state.coverText, state.selectedAlgorithmId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.coverText, state.selectedAlgorithmId]); // updateCapacity is memoized

  const handleCoverTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCoverText = event.target.value;
    setState(prev => ({ 
        ...prev, 
        coverText: newCoverText, 
        statusMessage: null, 
        extractedMessage: null, 
        stegoText: null // Reset stego text if cover text changes
    }));
  };

  const handleMessageToEmbedChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState(prev => ({ ...prev, messageToEmbed: event.target.value, statusMessage: null }));
  };

  const handleAlgorithmChange = (algorithmId: string) => {
    setState(prev => ({ 
        ...prev, 
        selectedAlgorithmId: algorithmId, 
        statusMessage: null, 
        extractedMessage: null, 
        stegoText: null,
        capacityInfo: null // Reset capacity on algo change
    }));
    if (state.coverText) {
        updateCapacity(state.coverText, algorithmId);
    }
  };

  const handleOperationModeChange = (mode: OperationMode) => {
    setState(prev => ({ 
      ...prev, 
      operationMode: mode, 
      statusMessage: null, 
      extractedMessage: null, 
      stegoText: null, 
    }));
  };

  const handleEmbed = async () => {
    if (!state.coverText || !state.selectedAlgorithmId || !selectedAlgorithm) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez fournir un texte porteur et choisir un algorithme." });
      return;
    }
     if (!state.messageToEmbed && state.operationMode === 'embed') {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez saisir un message à cacher." });
      return;
    }
    
    const messageBytes = new TextEncoder().encode(state.messageToEmbed).length;
    if (state.capacityInfo && (messageBytes > state.capacityInfo.capacityBytes) && !state.capacityInfo.isEstimate) {
        toast({ variant: "destructive", title: "Erreur de Capacité Texte", description: `Message trop long (${messageBytes} octets). Capacité max pour ${selectedAlgorithm.name}: ${state.capacityInfo.capacityBytes} octets.` });
        return;
    }

    setState(prev => ({ ...prev, isProcessing: true, statusMessage: {type: 'info', text:`Intégration (${selectedAlgorithm.name}) en cours...`} }));
    try {
      let resultStegoText: string | null = null;
      if (state.selectedAlgorithmId === whitespaceTextAlgorithm.id) {
        resultStegoText = await embedMessageInText(state.coverText!, state.messageToEmbed);
      } else {
        throw new Error("Algorithme d'intégration texte non supporté ou sélectionné.");
      }
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        stegoText: resultStegoText, 
        statusMessage: {type: 'success', text:`Message intégré avec succès via ${selectedAlgorithm.name}. Le résultat est affiché ci-dessous.`} 
      }));
      toast({ title: "Succès", description: `Message intégré via ${selectedAlgorithm.name}.` });
    } catch (error: any) {
      console.error(`Erreur d'intégration texte (${selectedAlgorithm.name}):`, error);
      setState(prev => ({ ...prev, isProcessing: false, stegoText: null, statusMessage: {type: 'error', text: `Erreur d'intégration (${selectedAlgorithm.name}): ${error.message}`} }));
      toast({ variant: "destructive", title: `Erreur d'Intégration (${selectedAlgorithm.name})`, description: error.message });
    }
  };
  
  const handleExportStegoFile = () => {
    if (!state.stegoText) {
      toast({ variant: "destructive", title: "Erreur", description: "Aucun texte stéganographié à exporter." });
      return;
    }
    setState(prev => ({ ...prev, isExporting: true }));
    try {
        const blob = new Blob([state.stegoText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stego_text_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({ title: "Exporté", description: `Fichier texte avec message intégré téléchargé.` });
    } catch (error: any) {
        console.error("Erreur d'exportation texte:", error);
        toast({ variant: "destructive", title: "Erreur d'Exportation", description: `Impossible d'exporter le fichier: ${error.message}` });
    } finally {
        setState(prev => ({ ...prev, isExporting: false }));
    }
  };

  const handleExtract = async () => {
    if (!state.coverText || !state.selectedAlgorithmId || !selectedAlgorithm) { // coverText holds the stego text in extract mode
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez fournir un texte stéganographié et choisir un algorithme." });
      return;
    }
    setState(prev => ({ ...prev, isProcessing: true, statusMessage: {type: 'info', text:`Extraction (${selectedAlgorithm.name}) en cours...`}, extractedMessage: null }));
    try {
      let extractedTextResult: string | null = null;
       if (state.selectedAlgorithmId === whitespaceTextAlgorithm.id) {
        extractedTextResult = await extractMessageFromText(state.coverText);
      } else {
        throw new Error("Algorithme d'extraction texte non supporté ou sélectionné.");
      }

      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        extractedMessage: extractedTextResult, 
        statusMessage: {type: 'success', text:`Message extrait avec succès via ${selectedAlgorithm.name}.`} 
      }));
      toast({ title: "Extraction Réussie", description: `Message extrait via ${selectedAlgorithm.name}.` });
    } catch (error: any) {
      console.error(`Erreur d'extraction texte (${selectedAlgorithm.name}):`, error);
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
  
  const handleCopyStegoText = async () => {
    if (!state.stegoText) {
      toast({ variant: "destructive", title: "Erreur", description: "Aucun texte stéganographié à copier." });
      return;
    }
    try {
      await navigator.clipboard.writeText(state.stegoText);
      toast({ title: "Copié", description: "Texte stéganographié copié dans le presse-papiers." });
    } catch (err) {
      console.error('Échec de la copie du texte stéganographié: ', err);
      toast({ variant: "destructive", title: "Erreur de Copie", description: "Impossible de copier le texte stéganographié." });
    }
  };

  const messageBytesForEmbed = state.messageToEmbed ? new TextEncoder().encode(state.messageToEmbed).length : 0;
  const isCapacityExceeded = state.capacityInfo && !state.capacityInfo.isEstimate && (messageBytesForEmbed > state.capacityInfo.capacityBytes);
  const isEmbedPossible = !!state.coverText && !!state.messageToEmbed && !!state.selectedAlgorithmId && !!state.capacityInfo && !isCapacityExceeded;
  const isExportStegoFilePossible = !!state.stegoText;
  const isExtractPossible = !!state.coverText && !!state.selectedAlgorithmId; // coverText holds stego text in extract mode
  const isCopyExtractedMessagePossible = !!state.extractedMessage && state.extractedMessage.length > 0;
  const isCopyStegoTextPossible = !!state.stegoText && state.stegoText.length > 0;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">Outil de Stéganographie de Texte</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
           <TextInteractionCard
            coverText={state.coverText || ''}
            onCoverTextChange={handleCoverTextChange}
            messageToEmbed={state.messageToEmbed}
            onMessageToEmbedChange={handleMessageToEmbedChange}
            stegoText={state.stegoText}
            operationMode={state.operationMode}
            capacityInfo={state.capacityInfo}
            statusMessage={state.statusMessage}
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
            statusMessage={state.statusMessage} // Pass status message also to AlgoActionsCard for unified feedback if needed
            extractedMessage={state.extractedMessage}
            isTextTool={true} // Indicate this is for the text tool
            onCopyStegoText={handleCopyStegoText} // New prop
            isCopyStegoTextPossible={isCopyStegoTextPossible} // New prop
          />
        </div>
      </div>
    </div>
  );
}
