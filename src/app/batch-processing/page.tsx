
"use client";

import type React from 'react';
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { mockAlgorithms, type SteganographyAlgorithm } from "@/types";
import { Upload, Settings, Play, Loader2, CheckCircle, XCircle, FileText } from "lucide-react";

interface BatchFile {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  resultMessage?: string;
}

export default function BatchProcessingPage() {
  const [selectedFiles, setSelectedFiles] = useState<BatchFile[]>([]);
  const [selectedAlgorithmId, setSelectedAlgorithmId] = useState<string | null>(null);
  const [messageToEmbed, setMessageToEmbed] = useState<string>(""); // For embed mode
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles: BatchFile[] = Array.from(event.target.files).map(file => ({
        file,
        id: `${file.name}-${file.lastModified}-${file.size}`, // Basic unique ID
        status: 'pending',
      }));
      setSelectedFiles(prevFiles => [...prevFiles, ...newFiles]);
      event.target.value = ""; // Reset file input
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prevFiles => prevFiles.filter(f => f.id !== id));
  };

  const handleAlgorithmChange = (algorithmId: string) => {
    setSelectedAlgorithmId(algorithmId);
  };

  const handleMessageToEmbedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessageToEmbed(event.target.value);
  };

  const handleStartBatch = async () => {
    if (selectedFiles.length === 0) {
      toast({ variant: "destructive", title: "Aucun fichier", description: "Veuillez sélectionner des fichiers à traiter." });
      return;
    }
    if (!selectedAlgorithmId) {
      toast({ variant: "destructive", title: "Aucun algorithme", description: "Veuillez sélectionner un algorithme." });
      return;
    }
    // For embed mode, a message is required (even if it's empty for some metadata algos)
    // For extract mode, message is not needed. Here we simplify and assume embed for now.
    // A more complete solution would have an operationMode (embed/extract) selector.
    if (!messageToEmbed) {
        toast({ variant: "destructive", title: "Message manquant", description: "Veuillez saisir un message à cacher pour le traitement par lots (mode intégration)." });
        return;
    }

    setIsProcessing(true);
    setSelectedFiles(prev => prev.map(f => ({ ...f, status: 'processing', resultMessage: undefined })));
    toast({ title: "Traitement par lots démarré", description: `Traitement de ${selectedFiles.length} fichiers...` });

    // Simulate processing for each file
    for (let i = 0; i < selectedFiles.length; i++) {
      const currentFileId = selectedFiles[i].id;
      // Simulate API call or heavy processing
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      
      // Simulate success or failure
      const isSuccess = Math.random() > 0.2; // 80% success rate
      const algoName = mockAlgorithms.find(a => a.id === selectedAlgorithmId)?.name || "Algorithme inconnu";

      setSelectedFiles(prev =>
        prev.map(f =>
          f.id === currentFileId
            ? {
                ...f,
                status: isSuccess ? 'success' : 'error',
                resultMessage: isSuccess 
                  ? `Message intégré avec succès via ${algoName}.` 
                  : `Échec de l'intégration via ${algoName}. (simulé)`,
              }
            : f
        )
      );
    }

    setIsProcessing(false);
    toast({ title: "Traitement par lots terminé", description: "Vérifiez les résultats ci-dessous." });
  };

  const selectedAlgorithmDetails = mockAlgorithms.find(algo => algo.id === selectedAlgorithmId);
  const acceptedFileTypes = selectedAlgorithmDetails?.supportedFileTypes.join(',') || "*/*";

  return (
    <div className="space-y-8">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">Traitement par Lots</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="text-primary"/> Sélection des Fichiers et Configuration</CardTitle>
            <CardDescription>Téléchargez plusieurs fichiers et choisissez l'algorithme à appliquer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="batchFiles" className="text-base">1. Télécharger les Fichiers</Label>
              <Input
                id="batchFiles"
                type="file"
                multiple
                onChange={handleFileChange}
                accept={acceptedFileTypes}
                className="file:text-primary-foreground file:bg-primary hover:file:bg-primary/90 file:rounded-md file:border-0 file:px-3 file:py-2 file:mr-3 cursor-pointer"
                disabled={isProcessing}
              />
              {selectedAlgorithmDetails && <p className="text-sm text-muted-foreground mt-1">Types de fichiers acceptés pour {selectedAlgorithmDetails.name}: {selectedAlgorithmDetails.supportedFileTypes.join(', ')}</p>}
            </div>

            <div>
              <Label htmlFor="batchAlgorithm" className="text-base">2. Sélectionner l'Algorithme</Label>
              <Select value={selectedAlgorithmId || ""} onValueChange={handleAlgorithmChange} disabled={isProcessing || mockAlgorithms.length === 0}>
                <SelectTrigger id="batchAlgorithm" aria-label="Sélectionner l'algorithme de stéganographie pour le lot">
                  <SelectValue placeholder="Choisir un algorithme" />
                </SelectTrigger>
                <SelectContent>
                  {mockAlgorithms.map((algo) => (
                    <SelectItem key={algo.id} value={algo.id}>
                      {algo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAlgorithmDetails && (
                <p className="text-sm text-muted-foreground mt-2 p-2 bg-secondary/30 rounded-md">
                  {selectedAlgorithmDetails.description}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="batchMessage" className="text-base">3. Message à Cacher (pour le mode intégration)</Label>
              <Input
                id="batchMessage"
                type="text"
                placeholder="Saisissez le message secret..."
                value={messageToEmbed}
                onChange={handleMessageToEmbedChange}
                disabled={isProcessing}
              />
               <p className="text-sm text-muted-foreground mt-1">
                Ce message sera tenté d'être intégré dans tous les fichiers. L'extraction par lot n'est pas encore implémentée.
              </p>
            </div>

            <Button onClick={handleStartBatch} disabled={isProcessing || selectedFiles.length === 0 || !selectedAlgorithmId} className="w-full" size="lg">
              {isProcessing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Traitement en cours...</>
              ) : (
                <><Play className="mr-2 h-5 w-5" /> Démarrer le Traitement par Lots</>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="text-primary"/> Fichiers Sélectionnés et Résultats</CardTitle>
            <CardDescription>Liste des fichiers en attente ou traités.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedFiles.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Aucun fichier sélectionné.</p>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <ul className="space-y-3">
                  {selectedFiles.map((batchFile) => (
                    <li key={batchFile.id} className="p-3 border rounded-md bg-secondary/20 flex justify-between items-center">
                      <div className="truncate pr-2">
                        <p className="font-medium text-sm truncate" title={batchFile.file.name}>{batchFile.file.name}</p>
                        <p className="text-xs text-muted-foreground">{(batchFile.file.size / 1024).toFixed(2)} KB</p>
                        {batchFile.resultMessage && <p className={`text-xs ${batchFile.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{batchFile.resultMessage}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {batchFile.status === 'pending' && <span className="text-xs text-muted-foreground">En attente</span>}
                        {batchFile.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                        {batchFile.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {batchFile.status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                        <Button variant="ghost" size="icon" onClick={() => removeFile(batchFile.id)} disabled={isProcessing} className="h-7 w-7">
                          <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          <span className="sr-only">Retirer</span>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
