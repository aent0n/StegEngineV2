
"use client";

import type React from 'react';
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { mockAlgorithms, type SteganographyAlgorithm } from "@/types";
import { Upload, Settings, Play, Loader2, CheckCircle, XCircle, FileText, ImageIcon, MusicIcon, FileQuestionIcon, AlertTriangle } from "lucide-react";

interface BatchFile {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'success' | 'error' | 'incompatible';
  resultMessage?: string;
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-primary" />;
  if (fileType.startsWith('audio/')) return <MusicIcon className="h-5 w-5 text-primary" />;
  if (fileType === 'application/pdf') return <FileQuestionIcon className="h-5 w-5 text-primary" />;
  if (fileType.startsWith('text/')) return <FileText className="h-5 w-5 text-primary" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
};

export default function BatchProcessingPage() {
  const [selectedFiles, setSelectedFiles] = useState<BatchFile[]>([]);
  const [selectedAlgorithmId, setSelectedAlgorithmId] = useState<string | null>(null);
  const [messageToEmbed, setMessageToEmbed] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { toast } = useToast();

  const selectedAlgorithmDetails = useMemo(() => {
    return mockAlgorithms.find(algo => algo.id === selectedAlgorithmId) || null;
  }, [selectedAlgorithmId]);

  const acceptedFileTypes = useMemo(() => {
    if (selectedAlgorithmDetails) {
      return selectedAlgorithmDetails.supportedFileTypes.join(',');
    }
    // If no algorithm selected, accept all types from all mock algorithms
    const allTypes = new Set<string>();
    mockAlgorithms.forEach(algo => algo.supportedFileTypes.forEach(type => allTypes.add(type)));
    return Array.from(allTypes).join(',');
  }, [selectedAlgorithmDetails]);

  const supportedFileTypesMessage = useMemo(() => {
    if (selectedAlgorithmDetails) {
      return `Types de fichiers acceptés pour ${selectedAlgorithmDetails.name}: ${selectedAlgorithmDetails.supportedFileTypes.join(', ')}`;
    }
    return "Sélectionnez un algorithme pour filtrer les types de fichiers, ou téléchargez des fichiers compatibles.";
  }, [selectedAlgorithmDetails]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles: BatchFile[] = Array.from(event.target.files).map(file => ({
        file,
        id: `${file.name}-${file.lastModified}-${file.size}-${Math.random()}`, // Ensure more uniqueness
        status: 'pending',
      }));
      setSelectedFiles(prevFiles => {
        const updatedFiles = [...prevFiles];
        newFiles.forEach(nf => {
          if (!updatedFiles.some(ef => ef.id === nf.id || (ef.file.name === nf.file.name && ef.file.lastModified === nf.file.lastModified && ef.file.size === nf.file.size) )) {
            updatedFiles.push(nf);
          }
        });
        return updatedFiles;
      });
      event.target.value = ""; 
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prevFiles => prevFiles.filter(f => f.id !== id));
  };

  const handleAlgorithmChange = (algorithmId: string) => {
    setSelectedAlgorithmId(algorithmId);
    // Reset status of files if algorithm changes, as compatibility might change
    setSelectedFiles(prev => prev.map(f => ({ ...f, status: 'pending', resultMessage: undefined })));
  };

  const handleMessageToEmbedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessageToEmbed(event.target.value);
  };

  const handleStartBatch = async () => {
    if (selectedFiles.length === 0) {
      toast({ variant: "destructive", title: "Aucun fichier", description: "Veuillez sélectionner des fichiers à traiter." });
      return;
    }
    if (!selectedAlgorithmId || !selectedAlgorithmDetails) {
      toast({ variant: "destructive", title: "Aucun algorithme", description: "Veuillez sélectionner un algorithme." });
      return;
    }
    if (!messageToEmbed) {
        toast({ variant: "destructive", title: "Message manquant", description: "Veuillez saisir un message à cacher pour le traitement par lots." });
        return;
    }

    setIsProcessing(true);
    
    const filesToProcess = selectedFiles.map(batchFile => {
      const isCompatible = selectedAlgorithmDetails.supportedFileTypes.includes(batchFile.file.type);
      if (!isCompatible) {
        return { 
          ...batchFile, 
          status: 'incompatible' as 'incompatible', // Correctly type 'incompatible'
          resultMessage: `Type de fichier (${batchFile.file.type}) incompatible avec ${selectedAlgorithmDetails.name}.`
        };
      }
      return { ...batchFile, status: 'processing' as 'processing', resultMessage: undefined };
    });
    setSelectedFiles(filesToProcess);

    toast({ title: "Traitement par lots démarré", description: `Traitement de ${filesToProcess.filter(f=> f.status === 'processing').length} fichiers compatibles...` });

    for (let i = 0; i < filesToProcess.length; i++) {
      const currentFile = filesToProcess[i];
      if (currentFile.status !== 'processing') continue; // Skip incompatible or already processed

      // Simulate API call or heavy processing
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      
      const isSuccess = Math.random() > 0.2; 

      setSelectedFiles(prev =>
        prev.map(f =>
          f.id === currentFile.id
            ? {
                ...f,
                status: isSuccess ? 'success' : 'error',
                resultMessage: isSuccess 
                  ? `Message intégré avec succès via ${selectedAlgorithmDetails.name}.` 
                  : `Échec de l'intégration via ${selectedAlgorithmDetails.name}. (simulé)`,
              }
            : f
        )
      );
    }

    setIsProcessing(false);
    const finalSuccessCount = selectedFiles.filter(f => f.status === 'success').length;
    const finalErrorCount = selectedFiles.filter(f => f.status === 'error').length;
    const finalIncompatibleCount = selectedFiles.filter(f => f.status === 'incompatible').length;

    toast({ 
      title: "Traitement par lots terminé", 
      description: `${finalSuccessCount} succès, ${finalErrorCount} échecs, ${finalIncompatibleCount} incompatibles. Vérifiez les résultats.` 
    });
  };

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
              <p className="text-sm text-muted-foreground mt-1">{supportedFileTypesMessage}</p>
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
              <Label htmlFor="batchMessage" className="text-base">3. Message à Cacher</Label>
              <Input
                id="batchMessage"
                type="text"
                placeholder="Saisissez le message secret..."
                value={messageToEmbed}
                onChange={handleMessageToEmbedChange}
                disabled={isProcessing}
              />
               <p className="text-sm text-muted-foreground mt-1">
                Ce message sera intégré dans les fichiers compatibles. Pour traiter du texte brut, sauvegardez-le en fichier .txt et téléchargez-le. L'extraction par lot n'est pas encore implémentée.
              </p>
            </div>

            <Button onClick={handleStartBatch} disabled={isProcessing || selectedFiles.length === 0 || !selectedAlgorithmId || !messageToEmbed} className="w-full" size="lg">
              {isProcessing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Traitement en cours...</>
              ) : (
                <><Play className="mr-2 h-5 w-5" /> Démarrer le Traitement</>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="text-primary"/> Fichiers Sélectionnés et Résultats</CardTitle>
            <CardDescription>Liste des fichiers en attente, en traitement, ou traités.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedFiles.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Aucun fichier sélectionné pour le moment.</p>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <ul className="space-y-3">
                  {selectedFiles.map((batchFile) => (
                    <li key={batchFile.id} className="p-3 border rounded-md bg-secondary/20 flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(batchFile.file.type)}
                        <div className="truncate">
                          <p className="font-medium text-sm truncate" title={batchFile.file.name}>{batchFile.file.name}</p>
                          <p className="text-xs text-muted-foreground">{(batchFile.file.size / 1024).toFixed(2)} KB - {batchFile.file.type || "Type inconnu"}</p>
                           {batchFile.resultMessage && (
                            <p className={`text-xs truncate ${
                                batchFile.status === 'success' ? 'text-green-600' : 
                                batchFile.status === 'error' ? 'text-red-600' : 
                                batchFile.status === 'incompatible' ? 'text-orange-600' : 'text-blue-600'
                            }`} title={batchFile.resultMessage}>
                                {batchFile.resultMessage}
                            </p>
                           )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {batchFile.status === 'pending' && <span className="text-xs text-muted-foreground">Prêt</span>}
                        {batchFile.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                        {batchFile.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {batchFile.status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                        {batchFile.status === 'incompatible' && <AlertTriangle className="h-5 w-5 text-orange-500" />}
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

    