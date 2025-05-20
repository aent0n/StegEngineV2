"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from "react";
import FileUploadCard from "@/components/hideaway/FileUploadCard";
import AlgorithmActionsCard from "@/components/hideaway/AlgorithmActionsCard";
import AlgorithmAdvisorCard from "@/components/hideaway/AlgorithmAdvisorCard";
import type { HideawayState, SteganographyAlgorithm } from "@/types";
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
        isMessageEmbedded: false, // Reset embed status on new file
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
    // Optionally auto-select the suggested algorithm if found in mockAlgorithms
    const suggestedAlgo = mockAlgorithms.find(algo => algo.name.toLowerCase().includes(suggestion.algorithm.toLowerCase().split(" ")[0]));
    if (suggestedAlgo) {
      setState(prev => ({ ...prev, selectedAlgorithmId: suggestedAlgo.id, isMessageEmbedded: false }));
      toast({
        title: "AI Suggestion Applied",
        description: `${suggestion.algorithm} has been selected.`,
      });
    }
  }, [toast]);

  const handleEmbed = () => {
    if (!state.carrierFile || !state.message || !state.selectedAlgorithmId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a file, enter a message, and choose an algorithm." });
      return;
    }
    setState(prev => ({ ...prev, isEmbedding: true }));
    // Simulate embedding process
    setTimeout(() => {
      setState(prev => ({ ...prev, isEmbedding: false, isMessageEmbedded: true }));
      toast({ title: "Success (Simulated)", description: "Message embedded into the carrier file." });
    }, 1500);
  };

  const handleExport = () => {
    if (!state.carrierFile || !state.isMessageEmbedded) {
      toast({ variant: "destructive", title: "Error", description: "No embedded message to export or file missing." });
      return;
    }
    setState(prev => ({ ...prev, isExporting: true }));
    // Simulate export process
    setTimeout(() => {
      // In a real app, this would be the steganographically modified file
      const url = URL.createObjectURL(state.carrierFile!);
      const a = document.createElement('a');
      a.href = url;
      a.download = `steg_${state.fileName}`; // Add a prefix to the downloaded file
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setState(prev => ({ ...prev, isExporting: false }));
      toast({ title: "Exported (Simulated)", description: `File ${state.fileName} downloaded.` });
    }, 1500);
  };
  
  // Cleanup object URL on unmount or when file changes
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
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl md:text-6xl">
          Hide Your Secrets in Plain Sight
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-muted-foreground sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Use modern steganography techniques to embed messages within your files. Secure, simple, and smart with Steg'Engine's AI-powered algorithm suggestions.
        </p>
      </div>

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
    </div>
  );
}
