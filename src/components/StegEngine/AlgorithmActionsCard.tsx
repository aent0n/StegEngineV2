// Résumé du fichier : Composant pour sélectionner les algorithmes de stéganographie et effectuer des actions
// comme l'intégration, l'extraction, l'exportation et la copie de messages. Adapte son UI en fonction du mode opératoire.
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import type { SteganographyAlgorithm, OperationMode, ExtractedMessageDetail } from "@/types";
import { Download, ShieldCheck, Shuffle, Search, Copy as CopyIcon, Loader2, FileText as FileTextIcon, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea"; 

interface AlgorithmActionsCardProps {
  algorithms: SteganographyAlgorithm[];
  selectedAlgorithmId: string | null;
  onAlgorithmChange: (algorithmId: string) => void;
  
  operationMode: OperationMode;
  onOperationModeChange: (mode: OperationMode) => void;

  onEmbed: () => void;
  onExportStegoFile: () => void;
  onExtract: () => void;
  onCopyExtractedMessage: (message: string) => void;

  isProcessing: boolean;
  isExporting: boolean; 

  isEmbedPossible: boolean;
  isExportStegoFilePossible: boolean;
  isExtractPossible: boolean;

  statusMessage: { type: 'success' | 'error' | 'info', text: string } | null;
  extractedMessages: ExtractedMessageDetail[] | null;
  
  isTextTool?: boolean;
  onCopyStegoText?: () => void;
  isCopyStegoTextPossible?: boolean;
  stegoText?: string | null; 
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
  onCopyExtractedMessage,
  isProcessing,
  isExporting,
  isEmbedPossible,
  isExportStegoFilePossible,
  isExtractPossible,
  statusMessage,
  extractedMessages,
  isTextTool = false,
  onCopyStegoText,
  isCopyStegoTextPossible,
  stegoText, 
}: AlgorithmActionsCardProps) {
  const selectedAlgorithm = algorithms.find(algo => algo.id === selectedAlgorithmId);

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="text-xl">Mode Opératoire & Actions</CardTitle>
        <CardDescription>
          {operationMode === 'embed' 
            ? "Choisissez un algorithme, puis lancez l'opération."
            : "Lancez l'extraction pour rechercher des messages cachés."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={operationMode} onValueChange={(value) => onOperationModeChange(value as OperationMode)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="embed">Cacher</TabsTrigger>
            <TabsTrigger value="extract">Extraire</TabsTrigger>
          </TabsList>
        </Tabs>

        {operationMode === 'embed' && (
          <div className="space-y-2">
            <Label htmlFor="algorithmSelect" className="text-base">Sélectionner l'Algorithme</Label>
            <Select 
              value={selectedAlgorithmId || ""} 
              onValueChange={onAlgorithmChange} 
              disabled={algorithms.length === 0 || isProcessing }
            >
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
        )}
        
        {operationMode === 'extract' && (
             <p className="text-sm text-muted-foreground mt-2 p-2 bg-secondary/30 rounded-md">
                L'extraction tentera d'utiliser tous les algorithmes compatibles pour ce type de fichier.
            </p>
        )}


        {operationMode === 'embed' && (
          <div className="space-y-4"> 
            <Button
              onClick={onEmbed}
              disabled={!isEmbedPossible || isProcessing}
              size="lg"
              className="w-full text-base"
              aria-label="Intégrer le message"
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Intégration...</>
              ) : (
                <><Shuffle className="mr-2 h-5 w-5" /> Intégrer le Message</>
              )}
            </Button>

            {isTextTool && stegoText && !isProcessing && (
              <div className="space-y-2">
                <Label htmlFor="stegoResultTextDisplay" className="text-base font-medium">Texte Stéganographié :</Label>
                <Textarea
                  id="stegoResultTextDisplay"
                  value={stegoText}
                  readOnly
                  rows={6} 
                  className="text-sm bg-muted/50"
                  aria-label="Texte stéganographié résultant"
                />
              </div>
            )}
            
            {isTextTool && onCopyStegoText && (
                 <Button
                    onClick={onCopyStegoText}
                    disabled={!isCopyStegoTextPossible || isProcessing}
                    variant="outline"
                    size="lg" 
                    className="w-full text-base"
                    aria-label="Copier le texte stéganographié"
                >
                    <CopyIcon className="mr-2 h-5 w-5" /> Copier Texte Stegano
                </Button>
            )}
            <Button
              onClick={onExportStegoFile}
              disabled={!isExportStegoFilePossible || isExporting || isProcessing}
              variant="outline"
              size="lg"
              className="w-full text-base"
              aria-label="Exporter le fichier/texte stéganographié"
            >
              {isExporting ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Exportation...</>
              ) : (
                <>
                  {isTextTool ? <FileTextIcon className="mr-2 h-5 w-5" /> : <Download className="mr-2 h-5 w-5" />} 
                  {isTextTool ? "Exporter en .txt" : "Exporter Fichier Stegano"}
                </>
              )}
            </Button>
          </div>
        )}

        {operationMode === 'extract' && (
           <div className="space-y-4">
            <Button
              onClick={onExtract}
              disabled={!isExtractPossible || isProcessing}
              size="lg"
              className="w-full text-base"
              aria-label="Extraire le message"
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Extraction...</>
              ) : (
                <><Search className="mr-2 h-5 w-5" /> Tenter l'Extraction</> 
              )}
            </Button>
            
            <div>
              <Label htmlFor="extractedMessageDisplay" className="text-base font-medium">
                {extractedMessages && extractedMessages.length > 0 ? `Message(s) Extrait(s) (${extractedMessages.length}) :` : "Message(s) Extrait(s) :"}
              </Label>
              <div 
                id="extractedMessageDisplay"
                className="mt-2 p-3 border rounded-md bg-muted/50 min-h-[100px] text-sm text-foreground space-y-3"
                aria-label="Message(s) extrait(s)"
              >
                {isProcessing ? (
                  <p>Extraction en cours...</p>
                ) : extractedMessages && extractedMessages.length > 0 ? (
                  extractedMessages.map((item, index) => (
                    <div key={index} className="border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs font-semibold text-primary">
                          Extrait via : {item.algorithmName}
                        </p>
                        <Button
                          onClick={() => onCopyExtractedMessage(item.message)}
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={!item.message || isProcessing}
                          aria-label={`Copier le message extrait via ${item.algorithmName}`}
                        >
                          <CopyIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="whitespace-pre-wrap break-all text-xs">{item.message}</p>
                    </div>
                  ))
                ) : (
                  <p>Aucun message trouvé ou le message extrait apparaîtra ici...</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {statusMessage && (
          <p className={`text-sm text-center font-medium ${
            statusMessage.type === 'success' ? 'text-green-600 dark:text-green-400' :
            statusMessage.type === 'error' ? 'text-red-600 dark:text-red-400' :
            'text-blue-600 dark:text-blue-400' 
          } pt-2`}>
            {statusMessage.type === 'success' && <ShieldCheck className="inline mr-1 h-4 w-4" />}
            {statusMessage.type === 'error' && <AlertTriangle className="inline mr-1 h-4 w-4" />}
            {statusMessage.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
