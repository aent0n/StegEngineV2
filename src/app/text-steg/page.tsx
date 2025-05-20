
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
import { generateCoverText, type CoverTextGeneratorInput } from '@/ai/flows/cover-text-generator'; // Importation du nouveau flux

const availableAlgorithms: SteganographyAlgorithm[] = [whitespaceTextAlgorithm]; 

const initialCoverText = `Ceci est un exemple de texte porteur pour la stéganographie.
Chaque ligne de ce texte peut potentiellement dissimuler une information.
Le principe est simple : un bit est encodé par la présence
d'un ou deux espaces à la fin de la ligne.
Cette technique est discrète mais sa capacité est limitée.
Plus le texte porteur est long, plus le message caché peut l'être.
Il est important que le texte semble naturel.
Les paragraphes aident à structurer le contenu.
Veillez à ne pas utiliser de lignes trop courtes.
Cela pourrait rendre la détection plus aisée.
Pensez également à la sémantique du texte.
Un texte incohérent pourrait attirer l'attention.
La stéganographie textuelle est un art subtil.
Elle requiert discrétion et ingéniosité.
Ce texte a été généré pour servir d'exemple.
Il contient suffisamment de lignes pour un message court.
N'hésitez pas à le remplacer par votre propre contenu.
Ou utilisez l'assistant IA pour en générer un nouveau.
L'objectif est de fournir un canevas de base.
Les possibilités sont nombreuses et variées.
L'exploration de différentes méthodes est encouragée.
La sécurité des données est primordiale.
Choisissez vos techniques avec soin.
Considérez l'impact sur la taille et la discrétion.
La stéganographie n'est pas une science exacte.
Elle évolue constamment avec les technologies.
Assurez-vous de bien comprendre les implications.
Un message bien caché est un message bien protégé.
La longueur du message est stockée au début.
Cela permet à l'extracteur de savoir quand s'arrêter.
Ce mécanisme est crucial pour la fiabilité.
Sans cela, l'extraction serait aléatoire.
La gestion des erreurs est aussi un aspect important.
Que se passe-t-il si le texte est altéré ?
Ce sont des questions à considérer.
Pour l'instant, concentrons-nous sur l'intégration.
Le message secret attend d'être dissimulé.
Le texte porteur est prêt à le recevoir.
L'opération peut commencer dès que vous le souhaitez.
Vérifiez bien la capacité avant de procéder.
Un message trop long ne pourra pas être intégré.
Le système vous avertira si c'est le cas.
Soyez attentif aux indicateurs fournis.
Ils sont là pour vous guider.
Bonne stéganographie à tous !
Ceci est la quarante-neuvième ligne.
Et voici la cinquantième ligne pour faire bonne mesure.`;

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
  coverText: initialCoverText,
  stegoText: null,
  isGeneratingCoverText: false, // Nouvel état pour le chargement de l'IA
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
      } catch (error: any)
{
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
  }, [state.coverText, state.selectedAlgorithmId, updateCapacity]);

  const handleCoverTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCoverText = event.target.value;
    setState(prev => ({ 
        ...prev, 
        coverText: newCoverText, 
        statusMessage: null, 
        extractedMessage: null, 
        stegoText: null 
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
        capacityInfo: null 
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
    if (!state.coverText || !state.selectedAlgorithmId || !selectedAlgorithm) { 
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

  const handleGenerateAICoverText = async (topic?: string) => {
    setState(prev => ({ ...prev, isGeneratingCoverText: true, statusMessage: {type: 'info', text:"Génération du texte porteur par l'IA..."} }));
    try {
      const input: CoverTextGeneratorInput = { topic: topic || undefined };
      const result = await generateCoverText(input);
      if (result && result.generatedText) {
        setState(prev => ({ ...prev, coverText: result.generatedText, stegoText: null, extractedMessage: null, statusMessage: {type: 'success', text:"Texte porteur généré par l'IA."}}));
        toast({title: "Succès", description: "Texte porteur généré par l'IA."})
      } else {
        throw new Error("La réponse de l'IA ne contient pas de texte généré.");
      }
    } catch (error: any) {
      console.error("Erreur lors de la génération du texte porteur IA:", error);
      setState(prev => ({ ...prev, statusMessage: {type: 'error', text:`Erreur IA: ${error.message}`} }));
      toast({variant: "destructive", title: "Erreur IA", description: `Impossible de générer le texte porteur: ${error.message}`});
    } finally {
      setState(prev => ({ ...prev, isGeneratingCoverText: false }));
    }
  };


  const messageBytesForEmbed = state.messageToEmbed ? new TextEncoder().encode(state.messageToEmbed).length : 0;
  const isCapacityExceeded = state.capacityInfo && !state.capacityInfo.isEstimate && (messageBytesForEmbed > state.capacityInfo.capacityBytes);
  const isEmbedPossible = !!state.coverText && !!state.messageToEmbed && !!state.selectedAlgorithmId && !!state.capacityInfo && !isCapacityExceeded;
  const isExportStegoFilePossible = !!state.stegoText;
  const isExtractPossible = !!state.coverText && !!state.selectedAlgorithmId; 
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
            onGenerateAICoverText={handleGenerateAICoverText}
            isGeneratingCoverText={state.isGeneratingCoverText}
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
            isTextTool={true} 
            onCopyStegoText={handleCopyStegoText} 
            isCopyStegoTextPossible={isCopyStegoTextPossible} 
          />
        </div>
      </div>
    </div>
  );
}

    