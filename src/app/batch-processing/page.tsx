
"use client";

import type React from 'react';
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { mockAlgorithms, type SteganographyAlgorithm } from "@/types";
import { Upload, Settings, Play, Loader2, CheckCircle, XCircle, FileText, ImageIcon, MusicIcon, FileQuestionIcon, AlertTriangle } from "lucide-react";
import { getCapacityInfo as getImageCapacityInfo } from '@/lib/steganography';
import { getAudioCapacityInfo } from '@/lib/audioSteganography';
import { getTextCapacityInfo } from '@/lib/textSteganography';
// PDF capacity is estimated, no specific function needed here for pre-check beyond algorithm's estimatedCapacity

interface BatchFile {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'success' | 'error' | 'incompatible' | 'no_algorithm' | 'capacity_error';
  resultMessage?: string;
  capacityInfo?: { realCapacityBytes?: number; messageFits?: boolean };
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-primary" />;
  if (fileType.startsWith('audio/')) return <MusicIcon className="h-5 w-5 text-primary" />;
  if (fileType === 'application/pdf') return <FileQuestionIcon className="h-5 w-5 text-primary" />;
  if (fileType.startsWith('text/')) return <FileTextIcon className="h-5 w-5 text-primary" />;
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
    if (!event.target.files || event.target.files.length === 0) {
      event.target.value = ""; // Clear the input visually if user cancels or selects no files
      return;
    }
    
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
        if (!(majorType in updatedAlgorithmSelections)) {
          const compatibleAlgosForNewType = getCompatibleAlgorithms(majorType);
          updatedAlgorithmSelections[majorType] = compatibleAlgosForNewType.length > 0 ? null : 'none';
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
  };

  const removeFile = (idToRemove: string) => {
    const remainingFiles = selectedFiles.filter(f => f.id !== idToRemove);
    setSelectedFiles(remainingFiles);

    const remainingMajorTypes = new Set<string>();
    remainingFiles.forEach(f => remainingMajorTypes.add(getMajorFileType(f.file.type)));

    const newDetectedTypes = Array.from(remainingMajorTypes).sort();
    setDetectedFileTypes(newDetectedTypes);

    const newAlgorithmSelections = { ...algorithmSelections };
    Object.keys(newAlgorithmSelections).forEach(typeKey => {
        if (!newDetectedTypes.includes(typeKey)) {
            delete newAlgorithmSelections[typeKey];
        }
    });
    setAlgorithmSelections(newAlgorithmSelections);
  };

  const handleAlgorithmSelectionChange = (majorFileType: string, algorithmId: string) => {
    setAlgorithmSelections(prev => ({ ...prev, [majorFileType]: algorithmId }));
    setSelectedFiles(prevFiles => prevFiles.map(bf => {
        if (getMajorFileType(bf.file.type) === majorFileType) {
            if (bf.status === 'incompatible' || bf.status === 'no_algorithm' || bf.status === 'capacity_error') {
                 return { ...bf, status: 'pending', resultMessage: undefined, capacityInfo: undefined };
            }
        }
        return bf;
    }));
  };


  const handleMessageToEmbedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessageToEmbed(event.target.value);
  };

  const messageToEmbedBytes = useMemo(() => new TextEncoder().encode(messageToEmbed).length, [messageToEmbed]);

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
    let allAlgorithmsValidlySelectedForProcessing = true;

    selectedFiles.forEach(batchFile => {
        if (batchFile.status === 'pending' || batchFile.status === 'no_algorithm') { // Only check files that are candidates for processing
            const majorType = getMajorFileType(batchFile.file.type);
            const compatibleAlgos = getCompatibleAlgorithms(majorType);
            if (compatibleAlgos.length > 0 && (!algorithmSelections[majorType] || algorithmSelections[majorType] === 'none')) {
                 filesWithIssues.push(batchFile.file.name);
                 allAlgorithmsValidlySelectedForProcessing = false;
            }
        }
    });

    if (!allAlgorithmsValidlySelectedForProcessing) {
        toast({
            variant: "destructive",
            title: "Algorithme manquant",
            description: `Veuillez sélectionner un algorithme pour tous les types de fichiers pour lesquels des options sont disponibles. Problème pour: ${filesWithIssues.slice(0,3).join(', ')}${filesWithIssues.length > 3 ? '...' : ''}`
        });
        setSelectedFiles(prevFiles => prevFiles.map(bf => {
            const majorType = getMajorFileType(bf.file.type);
            if (getCompatibleAlgorithms(majorType).length > 0 && (!algorithmSelections[majorType] || algorithmSelections[majorType] === 'none')) {
                return {...bf, status: 'no_algorithm', resultMessage: "Aucun algorithme sélectionné pour ce type."};
            }
            return bf;
        }));
        return;
    }

    setIsProcessing(true);

    const filesToProcess = selectedFiles.filter(bf => {
      const majorType = getMajorFileType(bf.file.type);
      const algoId = algorithmSelections[majorType];
      if (!algoId || algoId === 'none') return false;
      const algoDetails = mockAlgorithms.find(a => a.id === algoId);
      return algoDetails && algoDetails.supportedFileTypes.includes(bf.file.type);
    });

    if (filesToProcess.length > 0) {
        toast({ title: "Traitement par lots démarré", description: `Vérification de capacité et traitement de ${filesToProcess.length} fichiers compatibles...` });
    } else {
         const incompatibleFiles = selectedFiles.filter(bf => {
            const majorType = getMajorFileType(bf.file.type);
            const algoId = algorithmSelections[majorType];
            if (!algoId || algoId === 'none') return true; // No algo or 'none' selected
            const algoDetails = mockAlgorithms.find(a => a.id === algoId);
            return !algoDetails || !algoDetails.supportedFileTypes.includes(bf.file.type); // Algo found but not compatible
        }).length;

        if (incompatibleFiles > 0 && selectedFiles.filter(f => f.status === 'no_algorithm').length === 0) {
             toast({ title: "Traitement par lots", description: "Aucun fichier compatible à traiter après sélection de l'algorithme." });
        } else if (selectedFiles.filter(f => f.status === 'no_algorithm').length > 0) {
            // This case is handled by the "Algorithme manquant" toast earlier.
        } else {
            toast({ title: "Traitement par lots", description: "Aucun fichier à traiter." });
        }
    }
    
    // Initial status update for files that are about to be processed
    setSelectedFiles(prevFiles => prevFiles.map(bf => {
        const majorType = getMajorFileType(bf.file.type);
        const algoId = algorithmSelections[majorType];
        if (!algoId || algoId === 'none') {
             if (getCompatibleAlgorithms(majorType).length === 0) {
                return { ...bf, status: 'incompatible', resultMessage: `Aucun algorithme compatible pour ${getFileTypeLabel(majorType)}.` };
             } else if (bf.status === 'pending' && (!algoId || algoId === 'none')) { // Explicitly not selected by user
                return { ...bf, status: 'no_algorithm', resultMessage: "Aucun algorithme sélectionné." };
             }
        } else {
            const algoDetails = mockAlgorithms.find(a => a.id === algoId);
            if (algoDetails && algoDetails.supportedFileTypes.includes(bf.file.type)) {
                return { ...bf, status: 'processing', resultMessage: 'En attente de traitement...' };
            } else if (algoDetails && !algoDetails.supportedFileTypes.includes(bf.file.type)) {
                return { ...bf, status: 'incompatible', resultMessage: `Type (${bf.file.type}) incompatible avec ${algoDetails.name}.` };
            }
        }
        return bf; // Keep existing status for already processed or error files
    }));


    for (let i = 0; i < selectedFiles.length; i++) {
      const currentFile = selectedFiles[i]; // Get the most up-to-date file info
      
      // Skip files not pending or not matching initial filtering criteria
      const majorType = getMajorFileType(currentFile.file.type);
      const algorithmId = algorithmSelections[majorType];
      if (!algorithmId || algorithmId === 'none' || currentFile.status !== 'processing') { // status should be 'processing' from above
          if (currentFile.status === 'pending' && algorithmId && algorithmId !== 'none') { // File was pending but might have been deemed incompatible by the previous mapping
                const algoDetails = mockAlgorithms.find(a => a.id === algorithmId);
                if(algoDetails && !algoDetails.supportedFileTypes.includes(currentFile.file.type)) {
                     setSelectedFiles(prev => prev.map(f => f.id === currentFile.id ? { ...f, status: 'incompatible', resultMessage: `Type (${f.file.type}) incompatible avec ${algoDetails.name}.` } : f));
                } else if (!algoDetails) {
                    setSelectedFiles(prev => prev.map(f => f.id === currentFile.id ? { ...f, status: 'error', resultMessage: `Algorithme ${algorithmId} non trouvé.` } : f));
                }
          }
          continue;
      }

      const algorithmDetails = mockAlgorithms.find(algo => algo.id === algorithmId)!;

      setSelectedFiles(prev => prev.map(f => f.id === currentFile.id ? { ...f, status: 'processing', resultMessage: 'Vérification de capacité...' } : f));
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate small delay for UI update

      let realCapacityBytes = -1;
      let capacityCheckError: string | null = null;

      try {
        if (!algorithmDetails.isMetadataBased) {
          if (majorType === 'image') {
            const capacity = await getImageCapacityInfo(currentFile.file, algorithmId);
            realCapacityBytes = capacity.capacityBytes;
          } else if (majorType === 'audio') {
            const capacity = await getAudioCapacityInfo(currentFile.file, algorithmId);
            realCapacityBytes = capacity.capacityBytes;
          } else if (majorType === 'text') {
            const textContent = await currentFile.file.text();
            const capacity = await getTextCapacityInfo(textContent, algorithmId);
            realCapacityBytes = capacity.capacityBytes;
          }
        } else if (algorithmDetails.estimatedCapacity) {
            realCapacityBytes = algorithmDetails.estimatedCapacity; // Use estimate for metadata
        }
      } catch (e: any) {
        console.error(`Erreur de vérification de capacité pour ${currentFile.file.name}:`, e);
        capacityCheckError = `Erreur capacité: ${e.message}`;
      }

      if (capacityCheckError) {
        setSelectedFiles(prev => prev.map(f => f.id === currentFile.id ? { ...f, status: 'error', resultMessage: capacityCheckError } : f));
        continue;
      }

      if (realCapacityBytes !== -1 && messageToEmbedBytes > realCapacityBytes) {
        setSelectedFiles(prev => prev.map(f => f.id === currentFile.id ? { ...f, status: 'capacity_error', resultMessage: `Message trop long (${messageToEmbedBytes}o). Capacité: ${realCapacityBytes}o.` } : f));
        continue;
      }
      
      // If capacity is fine, proceed to simulate embedding
      setSelectedFiles(prev => prev.map(f => f.id === currentFile.id ? { ...f, status: 'processing', resultMessage: `Intégration (${algorithmDetails.name})...` } : f));
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000)); // Simulate embedding

      const isSuccess = Math.random() > 0.2; // Simulate success/failure
      const resultMsg = isSuccess ? `Message intégré via ${algorithmDetails.name}.` : `Échec de l'intégration via ${algorithmDetails.name}. (simulé)`;

      setSelectedFiles(prev =>
        prev.map(f =>
          f.id === currentFile.id
            ? {
                ...f,
                status: isSuccess ? 'success' : 'error',
                resultMessage: resultMsg,
              }
            : f
        )
      );
    }

    setIsProcessing(false);
    // Re-fetch selectedFiles from state to get the very latest status for the summary toast
    setSelectedFiles(currentSelectedFiles => {
        const finalSuccessCount = currentSelectedFiles.filter(f => f.status === 'success').length;
        const finalErrorCount = currentSelectedFiles.filter(f => f.status === 'error' || f.status === 'capacity_error').length;
        const finalIncompatibleCount = currentSelectedFiles.filter(f => f.status === 'incompatible').length;
        const finalNoAlgoCount = currentSelectedFiles.filter(f => f.status === 'no_algorithm').length;
        
        let processedCount = 0;
        currentSelectedFiles.forEach(f => {
            if (['success', 'error', 'capacity_error', 'incompatible', 'no_algorithm'].includes(f.status)) {
                processedCount++;
            }
        });

        if (processedCount > 0 || currentSelectedFiles.length > 0) {
             toast({
                title: "Traitement par lots terminé",
                description: `${finalSuccessCount} succès, ${finalErrorCount} échecs, ${finalIncompatibleCount} incompatibles, ${finalNoAlgoCount} sans algo.`
            });
        }
        return currentSelectedFiles; // Return unchanged, just using this to read the latest state
    });
  };

  const allRequiredAlgorithmsSelected = detectedFileTypes.length === 0 || detectedFileTypes.every(type => {
    const compatibleAlgos = getCompatibleAlgorithms(type);
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
                Ce message ({messageToEmbedBytes} octets) sera intégré. Pour le texte, utilisez des fichiers .txt. L'extraction par lot n'est pas implémentée.
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
                  {selectedFiles.map((batchFile) => {
                    const majorType = getMajorFileType(batchFile.file.type);
                    const selectedAlgoId = algorithmSelections[majorType];
                    const algorithmDetails = selectedAlgoId ? mockAlgorithms.find(a => a.id === selectedAlgoId) : null;
                    const estimatedCapacity = algorithmDetails?.isMetadataBased ? algorithmDetails.estimatedCapacity : null;
                    const percentageUsed = estimatedCapacity && messageToEmbedBytes > 0 && estimatedCapacity > 0
                                          ? Math.min(100, (messageToEmbedBytes / estimatedCapacity) * 100)
                                          : 0;

                    return (
                      <li key={batchFile.id} className="p-3 border rounded-md bg-secondary/20 flex flex-col gap-2">
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {getFileIcon(batchFile.file.type)}
                            <div className="truncate">
                              <p className="font-medium text-sm truncate" title={batchFile.file.name}>{batchFile.file.name}</p>
                              <p className="text-xs text-muted-foreground">{(batchFile.file.size / 1024).toFixed(2)} KB - {batchFile.file.type || "Type inconnu"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {batchFile.status === 'pending' && <span className="text-xs text-muted-foreground">Prêt</span>}
                            {batchFile.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                            {batchFile.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                            {(batchFile.status === 'error' || batchFile.status === 'capacity_error') && <XCircle className="h-5 w-5 text-red-500" />}
                            {batchFile.status === 'incompatible' && <AlertTriangle className="h-5 w-5 text-orange-500" />}
                            {batchFile.status === 'no_algorithm' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                            <Button variant="ghost" size="icon" onClick={() => removeFile(batchFile.id)} disabled={isProcessing} className="h-7 w-7">
                              <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              <span className="sr-only">Retirer</span>
                            </Button>
                          </div>
                        </div>
                        {/* Capacity Info Display */}
                        {algorithmDetails && batchFile.status === 'pending' && (
                          <div className="text-xs text-muted-foreground mt-1 border-t pt-1">
                            {algorithmDetails.isMetadataBased && estimatedCapacity ? (
                              <>
                                <p>Message: {messageToEmbedBytes} o / Capacité estimée ({algorithmDetails.name}): {estimatedCapacity} o</p>
                                {estimatedCapacity > 0 && <Progress value={percentageUsed} className="h-1.5 mt-0.5" />}
                                {messageToEmbedBytes > estimatedCapacity && <p className="text-orange-600 text-xs">Le message dépasse la capacité estimée.</p>}
                              </>
                            ) : !algorithmDetails.isMetadataBased ? (
                              <>
                                <p>Message à intégrer: {messageToEmbedBytes} o ({algorithmDetails.name})</p>
                                <p>Capacité réelle vérifiée lors du traitement.</p>
                              </>
                            ) : null}
                          </div>
                        )}
                        {batchFile.resultMessage && (
                          <p className={`text-xs truncate mt-1 ${
                              batchFile.status === 'success' ? 'text-green-600' :
                              batchFile.status === 'error' || batchFile.status === 'capacity_error' ? 'text-red-600' :
                              batchFile.status === 'incompatible' ? 'text-orange-600' :
                              batchFile.status === 'no_algorithm' ? 'text-yellow-600' : 
                              batchFile.status === 'processing' ? 'text-blue-600' : 'text-muted-foreground' // For pending/processing messages
                          }`} title={batchFile.resultMessage}>
                              {batchFile.resultMessage}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
