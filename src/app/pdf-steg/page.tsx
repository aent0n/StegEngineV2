// Résumé du fichier : Composant de page pour l'outil de Stéganographie PDF.
// Permet aux utilisateurs d'intégrer et d'extraire des messages dans les métadonnées PDF (champ Sujet).
"use client";

import type React from 'react';
import { useState, useEffect } from "react";
import FileUploadCard from "@/components/StegEngine/FileUploadCard";
import AlgorithmActionsCard from "@/components/StegEngine/AlgorithmActionsCard";
import type { StegToolState, OperationMode, SteganographyAlgorithm, CapacityInfo, ExtractedMessageDetail } from "@/types";
import { pdfMetadataAlgorithm } from "@/types"; 
import { useToast } from "@/hooks/use-toast";
import { embedMessageInPdf, extractMessageFromPdf, getPdfCapacityInfo, convertObjectUrlToDataUri } from '@/lib/pdfSteganography';

const availableAlgorithms: SteganographyAlgorithm[] = [pdfMetadataAlgorithm];

const initialState: StegToolState = {
  carrierFile: null,
  fileName: null,
  filePreviewUrl: null, 
  stegoFileDataUri: null, 
  messageToEmbed: "",
  extractedMessages: null,
  selectedAlgorithmId: availableAlgorithms.length > 0 ? availableAlgorithms[0].id : null,
  aiSuggestion: null, 
  isProcessing: false,
  isExporting: false,
  isAdvisorLoading: false, 
  operationMode: 'embed',
  statusMessage: null,
  capacityInfo: null,
};

export default function PdfStegPage() {
  const [state, setState] = useState<StegToolState>(initialState);
  const { toast } = useToast();
  const [objectUrlToRevoke, setObjectUrlToRevoke] = useState<string | null>(null);

  const selectedAlgorithmForUI = availableAlgorithms.find(algo => algo.id === state.selectedAlgorithmId);

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
      extractedMessages: null,
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
         toast({ variant: "destructive", title: "Type de fichier non supporté", description: `Veuillez sélectionner un type de fichier compatible avec l'algorithme ${currentSelectedAlgo?.name || 'sélectionné'} (${currentSelectedAlgo?.supportedFileTypes.join(', ') || 'application/pdf'}).` });
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
        extractedMessages: null,
        capacityInfo: null, 
      }));

      if (state.selectedAlgorithmId) {
        try {
          const info = await getPdfCapacityInfo(file, state.selectedAlgorithmId);
          const algoForCapacityToast = availableAlgorithms.find(a => a.id === state.selectedAlgorithmId) || availableAlgorithms[0];
          const capacityText = `Capacité estimée pour ${algoForCapacityToast?.name}: env. ${info.capacityBytes} octets.`;
          setState(prev => ({ ...prev, capacityInfo: info, statusMessage: {type: 'info', text: capacityText} }));
        } catch (error: any) {
          toast({ variant: "destructive", title: "Erreur de Capacité PDF", description: error.message });
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
    setState(prev => ({ ...prev, selectedAlgorithmId: algorithmId, statusMessage: null, capacityInfo: null, extractedMessages: null, stegoFileDataUri: null }));
    
    const newSelectedAlgorithm = availableAlgorithms.find(algo => algo.id === algorithmId);
    if (state.carrierFile && newSelectedAlgorithm) {
         if (!newSelectedAlgorithm.supportedFileTypes.includes(state.carrierFile.type)) {
            toast({ variant: "destructive", title: "Type de fichier incompatible", description: `Le fichier actuel (${state.carrierFile.name}) n'est pas compatible avec ${newSelectedAlgorithm.name}. Veuillez changer de fichier.` });
            return;
        }
      try {
        const info = await getPdfCapacityInfo(state.carrierFile, algorithmId);
        const capacityText = `Capacité estimée pour ${newSelectedAlgorithm?.name}: env. ${info.capacityBytes} octets.`;
        setState(prev => ({ ...prev, capacityInfo: info, statusMessage: {type: 'info', text: capacityText} }));
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erreur de Capacité PDF", description: error.message });
      }
    }
  };

  const handleOperationModeChange = (mode: OperationMode) => {
    setState(prev => ({ 
      ...prev, 
      operationMode: mode, 
      statusMessage: null, 
      extractedMessages: null,
    }));
  };

  const handleEmbed = async () => {
    if (!state.carrierFile || !state.messageToEmbed || !state.selectedAlgorithmId || !selectedAlgorithmForUI) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un fichier PDF, saisir un message et choisir un algorithme." });
      return;
    }
    
    const messageBytes = new TextEncoder().encode(state.messageToEmbed).length;
    if (state.capacityInfo && state.capacityInfo.isEstimate && messageBytes > state.capacityInfo.capacityBytes) {
      toast({ variant: "default", title: "Avertissement de Capacité", description: `Le message (${messageBytes} octets) pourrait dépasser la capacité estimée (${state.capacityInfo.capacityBytes} octets) pour ${selectedAlgorithmForUI.name}. L'intégration pourrait échouer.` });
    }

    setState(prev => ({ ...prev, isProcessing: true, statusMessage: {type: 'info', text:`Intégration (${selectedAlgorithmForUI.name}) en cours...`} }));
    try {
      const stegoObjectUrl = await embedMessageInPdf(state.carrierFile, state.messageToEmbed, state.selectedAlgorithmId);
      
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
      setObjectUrlToRevoke(stegoObjectUrl); 

      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        stegoFileDataUri: stegoObjectUrl, 
        statusMessage: {type: 'success', text:`Message intégré avec succès (${selectedAlgorithmForUI.name}).`} 
      }));
      toast({ title: "Succès", description: `Message intégré via ${selectedAlgorithmForUI.name}.` });
    } catch (error: any) {
      console.error(`Erreur d'intégration PDF (${selectedAlgorithmForUI.name}):`, error);
      setState(prev => ({ ...prev, isProcessing: false, statusMessage: {type: 'error', text: `Erreur d'intégration (${selectedAlgorithmForUI.name}): ${error.message}`} }));
      toast({ variant: "destructive", title: `Erreur d'Intégration (${selectedAlgorithmForUI.name})`, description: error.message });
    }
  };
  
  const handleExportStegoFile = async () => {
    if (!state.stegoFileDataUri || !state.fileName) {
      toast({ variant: "destructive", title: "Erreur", description: "Aucun fichier PDF stéganographié à exporter." });
      return;
    }
    setState(prev => ({ ...prev, isExporting: true }));
    
    try {
        const a = document.createElement('a');
        a.href = state.stegoFileDataUri; 
        const fileNameBase = state.fileName.substring(0, state.fileName.lastIndexOf('.')) || state.fileName;
        a.download = `steg_${fileNameBase}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        toast({ title: "Exporté", description: `Fichier PDF ${state.fileName} avec message intégré téléchargé.` });
    } catch (error: any) {
        console.error("Erreur d'exportation PDF:", error);
        toast({ variant: "destructive", title: "Erreur d'Exportation", description: `Impossible d'exporter le fichier: ${error.message}` });
    } finally {
        setState(prev => ({ ...prev, isExporting: false }));
    }
  };

  const handleExtract = async () => {
    let fileForExtraction: File | null = null;

    if (state.stegoFileDataUri && state.operationMode === 'extract') {
        try {
            console.log("[PdfStegPage] Extraction: Utilisation de stegoFileDataUri:", state.stegoFileDataUri);
            const response = await fetch(state.stegoFileDataUri);
            if (!response.ok) {
                 throw new Error(`Échec de la récupération du fichier stéganographié: ${response.status} ${response.statusText}`);
            }
            const blob = await response.blob();
            const fileName = state.fileName || "stego_document.pdf"; 
            fileForExtraction = new File([blob], fileName, { type: "application/pdf" });
            console.log("[PdfStegPage] Fichier pour extraction (depuis stegoFileDataUri):", fileForExtraction.name, fileForExtraction.size);
        } catch (fetchError: any) {
            console.error("Erreur de récupération du fichier stéganographié depuis Object URL:", fetchError);
            toast({ variant: "destructive", title: "Erreur interne", description: `Impossible de charger le fichier modifié pour extraction: ${fetchError.message}` });
            setState(prev => ({ ...prev, isProcessing: false, statusMessage: {type: 'error', text: `Erreur interne: ${fetchError.message}`}}));
            return;
        }
    } else if (state.carrierFile) {
        console.log("[PdfStegPage] Extraction: Utilisation de carrierFile:", state.carrierFile.name);
        fileForExtraction = state.carrierFile;
    }

    if (!fileForExtraction) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un fichier PDF." });
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, statusMessage: {type: 'info', text:`Extraction en cours...`}, extractedMessages: null }));
    
    const foundMessages: ExtractedMessageDetail[] = [];
    let extractionErrorOccurred = false;
    let lastErrorMessage = "";

    for (const algo of availableAlgorithms) {
        if (!fileForExtraction.type || !algo.supportedFileTypes.includes(fileForExtraction.type)) {
            console.log(`Skipping ${algo.name} for ${fileForExtraction.name} as it does not support ${fileForExtraction.type}`);
            continue;
        }
        try {
          setState(prev => ({...prev, statusMessage: {type: 'info', text: `Tentative avec ${algo.name}...`}}));
          const extractedTextResult = await extractMessageFromPdf(fileForExtraction, algo.id);
          console.log("[PdfStegPage] Texte extrait reçu de la fonction:", `"${extractedTextResult}"`);
          if (extractedTextResult && extractedTextResult.trim().length > 0) {
            foundMessages.push({ algorithmName: algo.name, message: extractedTextResult });
          }
        } catch (error: any) {
          console.error(`Erreur d'extraction PDF avec ${algo.name}:`, error);
          extractionErrorOccurred = true;
          lastErrorMessage = error.message;
        }
    }
    
    if (foundMessages.length > 0) {
        setState(prev => ({ 
            ...prev, 
            isProcessing: false, 
            extractedMessages: foundMessages, 
            statusMessage: {type: 'success', text:`${foundMessages.length} message(s) extrait(s) avec succès.`} 
          }));
          toast({ title: "Extraction Réussie", description: `${foundMessages.length} message(s) extrait(s).` });
    } else {
        const finalMessage = extractionErrorOccurred 
        ? `Aucun message trouvé. Dernière erreur: ${lastErrorMessage}` 
        : "Aucun message trouvé après avoir essayé tous les algorithmes compatibles.";
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        extractedMessages: [], 
        statusMessage: {type: extractionErrorOccurred ? 'error' : 'info', text: finalMessage}
      }));
      toast({ 
        variant: extractionErrorOccurred ? "destructive" : "default", 
        title: extractionErrorOccurred ? "Erreur d'Extraction" : "Aucun Message Trouvé", 
        description: finalMessage 
      });
    }
  };
  
  const handleCopyExtractedMessage = async (message: string) => {
    if (!message) {
      toast({ variant: "destructive", title: "Erreur", description: "Aucun message à copier." });
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
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
  const isCapacityExceeded = state.capacityInfo && state.capacityInfo.isEstimate && (messageBytesForEmbed > state.capacityInfo.capacityBytes); 
    
  const isEmbedPossible = !!state.carrierFile && !!state.messageToEmbed && !!state.selectedAlgorithmId && !!state.capacityInfo ;
  const isExportStegoFilePossible = !!state.stegoFileDataUri;
  const isExtractPossible = !!(state.carrierFile || (state.stegoFileDataUri && state.operationMode === 'extract'));

  return (
    <div className="space-y-8">
       <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">Outil de Stéganographie PDF</h1>
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
            acceptedFileTypes={selectedAlgorithmForUI?.supportedFileTypes.join(',') || "application/pdf"}
            supportedFileTypesMessage={`Fichiers compatibles: ${selectedAlgorithmForUI?.supportedFileTypes.join(', ') || 'PDF'}.`}
            capacityInfo={state.capacityInfo}
            isMetadataAlgorithm={selectedAlgorithmForUI?.isMetadataBased || false}
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
            statusMessage={state.statusMessage}
            extractedMessages={state.extractedMessages}
          />
        </div>
      </div>
    </div>
  );
}
