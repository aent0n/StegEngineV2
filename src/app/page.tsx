
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import FileUploadCard from "@/components/hideaway/FileUploadCard";
import AlgorithmActionsCard from "@/components/hideaway/AlgorithmActionsCard";
import AlgorithmAdvisorCard from "@/components/hideaway/AlgorithmAdvisorCard";
import WhyChooseUsSection from "@/components/hideaway/WhyChooseUsSection";
import type { HideawayState } from "@/types";
import { mockAlgorithms } from "@/types";
import { useToast } from "@/hooks/use-toast";
import type { AlgorithmAdvisorOutput } from '@/ai/flows/algorithm-advisor';

const initialState: HideawayState = {
  carrierFile: null,
  fileName: null,
  filePreviewUrl: null,
  message: "",
  selectedAlgorithmId: null,
  aiSuggestion: null,
  isEmbedding: false,
  isExporting: false,
  isAdvisorLoading: false, 
  isMessageEmbedded: false,
};

export default function StegEnginePage() {
  const [state, setState] = useState<HideawayState>(initialState);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const filePreviewUrl = URL.createObjectURL(file);
      setState(prev => ({
        ...prev,
        carrierFile: file,
        fileName: file.name,
        filePreviewUrl,
        isMessageEmbedded: false, 
      }));
    } else {
      setState(prev => ({
        ...prev,
        carrierFile: null,
        fileName: null,
        filePreviewUrl: null,
        isMessageEmbedded: false,
      }));
    }
  };

  const handleMessageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState(prev => ({ ...prev, message: event.target.value, isMessageEmbedded: false }));
  };

  const handleAlgorithmChange = (algorithmId: string) => {
    setState(prev => ({ ...prev, selectedAlgorithmId: algorithmId, isMessageEmbedded: false }));
  };

  const handleAiSuggestion = useCallback((suggestion: AlgorithmAdvisorOutput) => {
    setState(prev => ({ ...prev, aiSuggestion: suggestion }));
    const suggestedAlgo = mockAlgorithms.find(algo => algo.name.toLowerCase().includes(suggestion.algorithm.toLowerCase().split(" ")[0]));
    if (suggestedAlgo) {
      setState(prev => ({ ...prev, selectedAlgorithmId: suggestedAlgo.id, isMessageEmbedded: false }));
      toast({
        title: "Suggestion IA appliquée",
        description: `${suggestion.algorithm} a été sélectionné.`,
      });
    }
  }, [toast]);

  const handleEmbed = () => {
    if (!state.carrierFile || !state.message || !state.selectedAlgorithmId) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez sélectionner un fichier, saisir un message et choisir un algorithme." });
      return;
    }
    setState(prev => ({ ...prev, isEmbedding: true }));
    setTimeout(() => {
      setState(prev => ({ ...prev, isEmbedding: false, isMessageEmbedded: true }));
      toast({ title: "Succès (Simulé)", description: "Message intégré dans le fichier porteur." });
    }, 1500);
  };

  const handleExport = () => {
    if (!state.carrierFile || !state.isMessageEmbedded) {
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
  
  useEffect(() => {
    const currentPreviewUrl = state.filePreviewUrl;
    return () => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }
    };
  }, [state.filePreviewUrl]);

  const isEmbedPossible = !!state.carrierFile && !!state.message && !!state.selectedAlgorithmId;
  const isExportPossible = !!state.carrierFile && state.isMessageEmbedded;

  return (
    <div className="space-y-12">
      {/* Hero Section adapted from HTML example */}
      <div className="flex flex-col md:flex-row items-start text-center md:text-left mb-8 md:mb-12 gap-6 md:gap-8 py-8">
        <div className="flex-shrink-0 mx-auto md:mx-0">
          <Image 
            src="/stegengine_hero.svg" 
            alt="Logo Steg'Engine Hero" 
            width={192} // h-48 equivalent
            height={192} // h-48 equivalent
            className="h-32 w-32 md:h-48 md:w-48 object-contain"
            data-ai-hint="abstract geometric"
            onError={(e) => { // Fallback in case the SVG isn't there or errors
              (e.target as HTMLImageElement).onerror = null; 
              (e.target as HTMLImageElement).src = 'https://placehold.co/192x192.png';
            }}
          />
        </div>
        <div className="flex-grow">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Bienvenue sur Steg'Engine
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto md:mx-0 mb-6">
            Steg'Engine est une application web moderne de stéganographie, permettant de dissimuler des informations dans différents types de fichiers. L'application combine une interface utilisateur intuitive avec un backend robuste pour un traitement sécurisé des données.
          </p>
          <div className="text-muted-foreground text-left max-w-2xl mx-auto md:mx-0">
            <h2 className="text-xl font-semibold text-foreground mb-3">🌟 Fonctionnalités Actuelles</h2>
            <h3 className="text-lg font-medium text-foreground mt-2 mb-1">Stéganographie d'Image :</h3>
            <ul className="list-disc list-inside space-y-1 pl-4 text-sm">
              <li>Technique LSB (Least Significant Bit)</li>
              <li>Support des formats PNG</li>
              <li>Interface drag & drop</li>
              <li>Prévisualisation en temps réel</li>
              <li>Statistiques de capacité</li>
              <li>Compression des données</li>
              <li>Chiffrement AES</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Existing 3-column tool layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
           <FileUploadCard
            carrierFile={state.carrierFile}
            fileName={state.fileName}
            filePreviewUrl={state.filePreviewUrl}
            onFileChange={handleFileChange}
            message={state.message}
            onMessageChange={handleMessageChange}
          />
        </div>
        
        <div className="space-y-8">
          <AlgorithmAdvisorCard onSuggestion={handleAiSuggestion} />
          <AlgorithmActionsCard
            algorithms={mockAlgorithms}
            selectedAlgorithmId={state.selectedAlgorithmId}
            onAlgorithmChange={handleAlgorithmChange}
            onEmbed={handleEmbed}
            onExport={handleExport}
            isEmbedding={state.isEmbedding}
            isExporting={state.isExporting}
            isEmbedPossible={isEmbedPossible}
            isExportPossible={isExportPossible}
            isMessageEmbedded={state.isMessageEmbedded}
          />
        </div>
      </div>

      {/* "Why Choose Us" Section */}
      <WhyChooseUsSection />
    </div>
  );
}
