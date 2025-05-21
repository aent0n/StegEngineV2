
"use client";

import type React from 'react';
import { useState, useMemo, useCallback } from "react";
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
  status: 'pending' | 'processing' | 'success' | 'error' | 'incompatible' | 'no_algorithm';
  resultMessage?: string;
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-primary" />;
  if (fileType.startsWith('audio/')) return <MusicIcon className="h-5 w-5 text-primary" />;
  if (fileType === 'application/pdf') return <FileQuestionIcon className="h-5 w-5 text-primary" />;
  if (fileType.startsWith('text/')) return <FileText className="h-5 w-5 text-primary" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
};

const getMajorFileType = (mimeType: string): string => {
  if (!mimeType) return 'unknown';
  if (mimeType === 'application/pdf') return 'application/pdf';
  return mimeType.split('/')[0];
};

const getFileTypeLabel = (majorType: string): string => {
    switch (majorType) {
        case 'image': return 'images';
        case 'audio': return 'fichiers audio';
        case 'text': return 'fichiers texte';
        case 'application/pdf': return 'fichiers PDF';
        default: return `fichiers de type ${majorType}`;
    }
};


export default function BatchProcessingPage() {
  const [selectedFiles, setSelectedFiles] = useState<BatchFile[]>([]);
  const [algorithmSelections, setAlgorithmSelections] = useState<Record<string, string | null>>({});
  const [detectedFileTypes, setDetectedFileTypes] = useState<string[]>([]);
  const [messageToEmbed, setMessageToEmbed] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { toast } = useToast();

  const getCompatibleAlgorithms = useCallback((majorFileType: string): SteganographyAlgorithm[] => {
    return mockAlgorithms.filter(algo => 
      algo.supportedFileTypes.some(supportedType => 
        majorFileType === 'application/pdf' ? supportedType === 'application/pdf' : supportedType.startsWith(majorFileType + '/')
      )
    );
  }, []);
  
  const initialAcceptedFileTypes = useMemo(() => {
    const allTypes = new Set<string>();
    mockAlgorithms.forEach(algo => algo.supportedFileTypes.forEach(type => allTypes.add(type)));
    return Array.from(allTypes).join(',');
  }, []);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFilesArray = Array.from(event.target.files);
      const newBatchFiles: BatchFile[] = newFilesArray.map(file => ({
        file,
        id: `${file.name}-${file.lastModified}-${file.size}-${Math.random()}`,
        status: 'pending',
      }));

      const currentMajorTypes = new Set(detectedFileTypes);
      const updatedAlgorithmSelections = { ...algorithmSelections };

      newFilesArray.forEach(file => {
        const majorType = getMajorFileType(file.type);
        if (!currentMajorTypes.has(majorType)) {
          currentMajorTypes.add(majorType);
          // Initialize algorithm selection for new type only if it's not already set
          if (!(majorType in updatedAlgorithmSelections)) {
            const compatibleAlgosForNewType = getCompatibleAlgorithms(majorType);
            updatedAlgorithmSelections[majorType] = compatibleAlgosForNewType.length > 0 ? null : 'none'; // 'none' if no compatible algos
          }
        }
      });
      
      setDetectedFileTypes(Array.from(currentMajorTypes).sort());
      setAlgorithmSelections(updatedAlgorithmSelections);

      setSelectedFiles(prevFiles => {
        const updatedFiles = [...prevFiles];
        newBatchFiles.forEach(nf => {
          if (!updatedFiles.some(ef => ef.id === nf.id || (ef.file.name === nf.file.name && ef.file.lastModified === nf.file.lastModified && ef.file.size === nf.file.size) )) {
            updatedFiles.push(nf);
          }
        });
        return updatedFiles;
      });
      event.target.value = ""; 
    }
  };

  const removeFile = (idToRemove: string) => {
    const removedFile = selectedFiles.find(f => f.id === idToRemove);
    if (!removedFile) return;

    const remainingFiles = selectedFiles.filter(f => f.id !== idToRemove);
    setSelectedFiles(remainingFiles);

    // Update detectedFileTypes and algorithmSelections if necessary
    const remainingMajorTypes = new Set<string>();
    remainingFiles.forEach(f => remainingMajorTypes.add(getMajorFileType(f.file.type)));
    
    setDetectedFileTypes(Array.from(remainingMajorTypes).sort());

    // Clean up algorithmSelections for types no longer present
    const newAlgorithmSelections = { ...algorithmSelections };
    Object.keys(newAlgorithmSelections).forEach(typeKey => {
        if (!remainingMajorTypes.has(typeKey)) {
            delete newAlgorithmSelections[typeKey];
        }
    });
    setAlgorithmSelections(newAlgorithmSelections);
  };
  
  const handleAlgorithmSelectionChange = (majorFileType: string, algorithmId: string) => {
    setAlgorithmSelections(prev => ({ ...prev, [majorFileType]: algorithmId }));
    setSelectedFiles(prevFiles => prevFiles.map(bf => {
        if (getMajorFileType(bf.file.type) === majorFileType) {
            if (bf.status === 'incompatible' || bf.status === 'no_algorithm') {
                 return { ...bf, status: 'pending', resultMessage: undefined };
            }
        }
        return bf;
    }));
  };


  const handleMessageToEmbedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessageToEmbed(event.target.value);
  };

  const handleStartBatch = async () => {
    if (selectedFiles.length === 0) {
      toast({ variant: "destructive", title: "Aucun fichier", description: "Veuillez sélectionner des fichiers à traiter." });
      return;
    }
    if (!messageToEmbed) {
        toast({ variant: "destructive", title: "Message manquant", description: "Veuillez saisir un message à cacher." });
        return;
    }
    
    const filesWithIssues: string[] = [];
    let allAlgorithmsValidlySelected = true;

    selectedFiles.forEach(batchFile => {
        const majorType = getMajorFileType(batchFile.file.type);
        if (!algorithmSelections[majorType] || algorithmSelections[majorType] === 'none') {
             const compatibleAlgos = getCompatibleAlgorithms(majorType);
            if (compatibleAlgos.length > 0) { // Only an issue if there were algos to choose from
                 filesWithIssues.push(batchFile.file.name);
                 allAlgorithmsValidlySelected = false;
            }
        }
    });

    if (!allAlgorithmsValidlySelected) {
        toast({ 
            variant: "destructive", 
            title: "Algorithme manquant", 
            description: `Veuillez sélectionner un algorithme pour tous les types de fichiers pour lesquels des options sont disponibles. Problème pour: ${filesWithIssues.slice(0,3).join(', ')}${filesWithIssues.length > 3 ? '...' : ''}`
        });
        setSelectedFiles(prevFiles => prevFiles.map(bf => {
            const majorType = getMajorFileType(bf.file.type);
            if ((!algorithmSelections[majorType] || algorithmSelections[majorType] === 'none') && getCompatibleAlgorithms(majorType).length > 0) {
                return {...bf, status: 'no_algorithm', resultMessage: "Aucun algorithme sélectionné pour ce type."};
            }
            return bf;
        }));
        return;
    }

    setIsProcessing(true);
    
    let filesToProcessCount = 0;
    const updatedFilesStatus = selectedFiles.map(batchFile => {
      const majorType = getMajorFileType(batchFile.file.type);
      const algorithmId = algorithmSelections[majorType];

      if (!algorithmId || algorithmId === 'none') { // No algorithm available or selected for this type
        return { ...batchFile, status: 'incompatible' as 'incompatible', resultMessage: "Aucun algorithme compatible pour ce type." };
      }

      const algorithmDetails = mockAlgorithms.find(algo => algo.id === algorithmId);

      if (!algorithmDetails) { 
        return { ...batchFile, status: 'error' as 'error', resultMessage: "Erreur interne: Algorithme non trouvé." };
      }
      
      const isCompatible = algorithmDetails.supportedFileTypes.includes(batchFile.file.type);
      if (!isCompatible) {
        return { 
          ...batchFile, 
          status: 'incompatible' as 'incompatible',
          resultMessage: `Type (${batchFile.file.type}) incompatible avec ${algorithmDetails.name}.`
        };
      }
      filesToProcessCount++;
      return { ...batchFile, status: 'processing' as 'processing', resultMessage: undefined };
    });
    setSelectedFiles(updatedFilesStatus);

    if (filesToProcessCount > 0) {
        toast({ title: "Traitement par lots démarré", description: `Traitement de ${filesToProcessCount} fichiers compatibles...` });
    } else {
        toast({ title: "Traitement par lots", description: "Aucun fichier compatible à traiter après vérification." });
    }


    for (let i = 0; i < updatedFilesStatus.length; i++) {
      const currentFile = updatedFilesStatus[i];
      if (currentFile.status !== 'processing') continue;

      const majorType = getMajorFileType(currentFile.file.type);
      const algorithmId = algorithmSelections[majorType];
      const algorithmDetails = mockAlgorithms.find(algo => algo.id === algorithmId)!;

      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000)); 
      
      const isSuccess = Math.random() > 0.2; 

      setSelectedFiles(prev =>
        prev.map(f =>
          f.id === currentFile.id
            ? {
                ...f,
                status: isSuccess ? 'success' : 'error',
                resultMessage: isSuccess 
                  ? `Message intégré via ${algorithmDetails.name}.` 
                  : `Échec de l'intégration via ${algorithmDetails.name}. (simulé)`,
              }
            : f
        )
      );
    }

    setIsProcessing(false);
    const finalFiles = selectedFiles; // Read state again after async operations
    const finalSuccessCount = finalFiles.filter(f => f.status === 'success').length;
    const finalErrorCount = finalFiles.filter(f => f.status === 'error').length;
    const finalIncompatibleCount = finalFiles.filter(f => f.status === 'incompatible').length;
    const finalNoAlgoCount = finalFiles.filter(f => f.status === 'no_algorithm').length;

    if (filesToProcessCount > 0 || finalFiles.some(f => f.status !== 'pending')) {
         toast({ 
            title: "Traitement par lots terminé", 
            description: `${finalSuccessCount} succès, ${finalErrorCount} échecs, ${finalIncompatibleCount} incompatibles, ${finalNoAlgoCount} sans algo. sélectionné.` 
        });
    }
  };
  
  const allRequiredAlgorithmsSelected = detectedFileTypes.length === 0 || detectedFileTypes.every(type => {
    const compatibleAlgos = getCompatibleAlgorithms(type);
    // If there are no compatible algos, this type doesn't need a selection.
    // Otherwise, an algorithm must be selected (not null and not 'none').
    return compatibleAlgos.length === 0 || (!!algorithmSelections[type] && algorithmSelections[type] !== 'none');
  });


  return (
    <div className="space-y-8">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">Traitement par Lots</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="text-primary"/> Sélection et Configuration</CardTitle>
            <CardDescription>Téléchargez vos fichiers et choisissez les algorithmes par type.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="batchFiles" className="text-base">1. Télécharger les Fichiers</Label>
              <Input
                id="batchFiles"
                type="file"
                multiple
                onChange={handleFileChange}
                accept={initialAcceptedFileTypes}
                className="file:text-primary-foreground file:bg-primary hover:file:bg-primary/90 file:rounded-md file:border-0 file:px-3 file:py-2 file:mr-3 cursor-pointer"
                disabled={isProcessing}
              />
              <p className="text-sm text-muted-foreground mt-1">Les types de fichiers seront filtrés par les algorithmes choisis ci-dessous.</p>
            </div>

            {detectedFileTypes.length > 0 && (
              <div className="space-y-4">
                <Label className="text-base">2. Sélectionner les Algorithmes par Type de Fichier</Label>
                {detectedFileTypes.map(majorType => {
                  const compatibleAlgorithms = getCompatibleAlgorithms(majorType);
                  if (compatibleAlgorithms.length === 0) {
                    return (
                        <div key={majorType} className="p-3 bg-muted/30 rounded-md">
                            <p className="text-sm text-muted-foreground">Aucun algorithme compatible trouvé pour les {getFileTypeLabel(majorType)}. Ces fichiers ne seront pas traités.</p>
                        </div>
                    );
                  }
                  return (
                    <div key={majorType} className="space-y-1">
                      <Label htmlFor={`algo-select-${majorType}`} className="text-sm font-medium">
                        Pour les {getFileTypeLabel(majorType)} :
                      </Label>
                      <Select
                        value={algorithmSelections[majorType] || ""}
                        onValueChange={(algoId) => handleAlgorithmSelectionChange(majorType, algoId)}
                        disabled={isProcessing}
                      >
                        <SelectTrigger id={`algo-select-${majorType}`} aria-label={`Sélectionner l'algorithme pour ${getFileTypeLabel(majorType)}`}>
                          <SelectValue placeholder="Choisir un algorithme" />
                        </SelectTrigger>
                        <SelectContent>
                          {compatibleAlgorithms.map(algo => (
                            <SelectItem key={algo.id} value={algo.id}>
                              {algo.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}
            
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

            <Button 
                onClick={handleStartBatch} 
                disabled={isProcessing || selectedFiles.length === 0 || !allRequiredAlgorithmsSelected || !messageToEmbed} 
                className="w-full" 
                size="lg"
            >
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
            <CardDescription>Liste des fichiers et leur état de traitement.</CardDescription>
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
                                batchFile.status === 'incompatible' ? 'text-orange-600' :
                                batchFile.status === 'no_algorithm' ? 'text-yellow-600' : 'text-blue-600'
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
                        {batchFile.status === 'no_algorithm' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
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

    