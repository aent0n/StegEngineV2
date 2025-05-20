
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { SteganographyAlgorithm, OperationMode } from "@/types";
import { Download, ShieldCheck, Shuffle, Search, Save, Loader2 } from "lucide-react";

interface AlgorithmActionsCardProps {
  algorithms: SteganographyAlgorithm[];
  selectedAlgorithmId: string | null;
  onAlgorithmChange: (algorithmId: string) => void;
  
  operationMode: OperationMode;
  onOperationModeChange: (mode: OperationMode) => void;

  onEmbed: () => void;
  onExportStegoFile: () => void;
  onExtract: () => void;
  onSaveExtractedMessage: () => void;

  isProcessing: boolean; // Covers embedding and extracting
  isExporting: boolean; // Covers exporting stego file and saving extracted text

  isEmbedPossible: boolean;
  isExportStegoFilePossible: boolean;
  isExtractPossible: boolean;
  isSaveExtractedMessagePossible: boolean;

  statusMessage: { type: 'success' | 'error' | 'info', text: string } | null;
}

export default function AlgorithmActionsCard({
  algorithms,
  selectedAlgorithmId,
  onAlgorithmChange,
  operationMode,
  onOperationModeChange,
  onEmbed,
  onExportStegoFile,
  onExtract,
  onSaveExtractedMessage,
  isProcessing,
  isExporting,
  isEmbedPossible,
  isExportStegoFilePossible,
  isExtractPossible,
  isSaveExtractedMessagePossible,
  statusMessage,
}: AlgorithmActionsCardProps) {
  const selectedAlgorithm = algorithms.find(algo => algo.id === selectedAlgorithmId);

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="text-xl">Mode Opératoire & Actions</CardTitle>
        <CardDescription>Choisissez un mode, un algorithme, puis lancez l'opération.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={operationMode} onValueChange={(value) => onOperationModeChange(value as OperationMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="embed">Cacher</TabsTrigger>
            <TabsTrigger value="extract">Extraire</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="algorithmSelect" className="text-base">Sélectionner l'Algorithme</Label>
          <Select value={selectedAlgorithmId || ""} onValueChange={onAlgorithmChange} disabled={algorithms.length === 0 || isProcessing}>
            <SelectTrigger id="algorithmSelect" className="text-base" aria-label="Sélectionner l'algorithme de stéganographie">
              <SelectValue placeholder="Sélectionner un algorithme" />
            </SelectTrigger>
            <SelectContent>
              {algorithms.length > 0 ? (
                algorithms.map((algo) => (
                  <SelectItem key={algo.id} value={algo.id} className="text-base">
                    {algo.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="loading" disabled>Chargement des algorithmes...</SelectItem>
              )}
            </SelectContent>
          </Select>
          {selectedAlgorithm && (
            <p className="text-sm text-muted-foreground mt-2 p-2 bg-secondary/30 rounded-md">
              {selectedAlgorithm.description}
            </p>
          )}
        </div>

        {operationMode === 'embed' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={onEmbed}
              disabled={!isEmbedPossible || isProcessing}
              size="lg"
              className="w-full text-base"
              aria-label="Intégrer le message dans le fichier"
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Intégration...</>
              ) : (
                <><Shuffle className="mr-2 h-5 w-5" /> Intégrer le Message</>
              )}
            </Button>
            <Button
              onClick={onExportStegoFile}
              disabled={!isExportStegoFilePossible || isExporting || isProcessing}
              variant="outline"
              size="lg"
              className="w-full text-base"
              aria-label="Exporter le fichier stéganographié"
            >
              {isExporting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Exportation...</>
              ) : (
                <><Download className="mr-2 h-5 w-5" /> Exporter Fichier Stegano</>
              )}
            </Button>
          </div>
        )}

        {operationMode === 'extract' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={onExtract}
              disabled={!isExtractPossible || isProcessing}
              size="lg"
              className="w-full text-base"
              aria-label="Extraire le message du fichier"
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Extraction...</>
              ) : (
                <><Search className="mr-2 h-5 w-5" /> Extraire le Message</>
              )}
            </Button>
            <Button
              onClick={onSaveExtractedMessage}
              disabled={!isSaveExtractedMessagePossible || isExporting || isProcessing}
              variant="outline"
              size="lg"
              className="w-full text-base"
              aria-label="Sauvegarder le message extrait"
            >
              {isExporting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sauvegarde...</>
              ) : (
                <><Save className="mr-2 h-5 w-5" /> Sauvegarder Message</>
              )}
            </Button>
          </div>
        )}
        
        {statusMessage && (
          <p className={`text-sm text-center font-medium ${
            statusMessage.type === 'success' ? 'text-green-600 dark:text-green-400' :
            statusMessage.type === 'error' ? 'text-red-600 dark:text-red-400' :
            'text-blue-600 dark:text-blue-400' 
          }`}>
            {statusMessage.type === 'success' && <ShieldCheck className="inline mr-1 h-4 w-4" />}
            {statusMessage.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
