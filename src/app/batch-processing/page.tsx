
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
import { Upload, Settings, Play, Loader2, CheckCircle, XCircle, FileText as FileTextLucide, ImageIcon, MusicIcon, FileQuestionIcon as PdfIcon, AlertTriangle } from "lucide-react";

import { getCapacityInfo as getImageCapacityInfo, embedMessageInImage } from '@/lib/steganography';
import { getAudioCapacityInfo, embedMessageInAudio } from '@/lib/audioSteganography';
import { getTextCapacityInfo, embedMessageInText } from '@/lib/textSteganography';
import { getPdfCapacityInfo, embedMessageInPdf } from '@/lib/pdfSteganography';


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
  if (fileType === 'application/pdf') return <PdfIcon className="h-5 w-5 text-primary" />;
  if (fileType.startsWith('text/')) return <FileTextLucide className="h-5 w-5 text-primary" />;
  return <FileTextLucide className="h-5 w-5 text-muted-foreground" />;
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
      event.target.value = ""; 
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

    newBatchFiles.forEach(batchFile => {
      const majorType = getMajorFileType(batchFile.file.type);
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

    setSelectedFiles(currentSelectedFiles => {
        const filesToAdd: BatchFile[] = [];
        const existingFileKeys = new Set(
            currentSelectedFiles.map(f => `${f.file.name}|${f.file.size}|${f.file.lastModified}`)
        );

        for (const bf of newBatchFiles) {
            const key = `${bf.file.name}|${bf.file.size}|${bf.file.lastModified}`;
            if (!existingFileKeys.has(key)) {
                filesToAdd.push(bf);
            }
        }
        
        if (currentSelectedFiles.length === 0 && newBatchFiles.length > 0) {
            return newBatchFiles; // Directly return new files if current list is empty
        }
        if (filesToAdd.length > 0) {
            return [...currentSelectedFiles, ...filesToAdd];
        }
        return currentSelectedFiles;
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
    setAlgorithmSelections(prev => ({ ...prev, [majorType]: algorithmId }));
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

    const filesWithMissingAlgoSelection: string[] = [];
    let allAlgorithmsValidlySelectedForProcessing = true;

    selectedFiles.forEach(batchFile => {
        if (batchFile.status === 'pending' || batchFile.status === 'no_algorithm') { 
            const majorType = getMajorFileType(batchFile.file.type);
            const compatibleAlgos = getCompatibleAlgorithms(majorType);
            if (compatibleAlgos.length > 0 && (!algorithmSelections[majorType] || algorithmSelections[majorType] === 'none')) {
                 filesWithMissingAlgoSelection.push(batchFile.file.name);
                 allAlgorithmsValidlySelectedForProcessing = false;
            }
        }
    });

    if (!allAlgorithmsValidlySelectedForProcessing) {
        toast({
            variant: "destructive",
            title: "Algorithme manquant",
            description: `Veuillez sélectionner un algorithme pour tous les types de fichiers pour lesquels des options sont disponibles. Problème pour: ${filesWithMissingAlgoSelection.slice(0,3).join(', ')}${filesWithMissingAlgoSelection.length > 3 ? '...' : ''}`
        });
        setSelectedFiles(prevFiles => prevFiles.map(bf => {
            const majorType = getMajorFileType(bf.file.type);
            if (getCompatibleAlgorithms(majorType).length > 0 && (!algorithmSelections[majorType] || algorithmSelections[majorType] === 'none')) {
                if (bf.status === 'pending' || bf.status === 'no_algorithm') {
                    return {...bf, status: 'no_algorithm', resultMessage: "Aucun algorithme sélectionné pour ce type."};
                }
            }
            return bf;
        }));
        return;
    }

    setIsProcessing(true);

    const filesToProcessInitially = selectedFiles.filter(bf => {
      const majorType = getMajorFileType(bf.file.type);
      const algoId = algorithmSelections[majorType];
      if (!algoId || algoId === 'none') return false; 
      
      const algoDetails = mockAlgorithms.find(a => a.id === algoId);
      if (!algoDetails) return false; 

      return algoDetails.supportedFileTypes.includes(bf.file.type); 
    });

    if (filesToProcessInitially.length > 0) {
        toast({ title: "Traitement par lots démarré", description: `Vérification de capacité et traitement de ${filesToProcessInitially.length} fichiers compatibles...` });
    } else {
         const incompatibleFilesCount = selectedFiles.filter(bf => {
            const majorType = getMajorFileType(bf.file.type);
            const algoId = algorithmSelections[majorType];
            if (!algoId || algoId === 'none') return true; 
            
            const algoDetails = mockAlgorithms.find(a => a.id === algoId);
            return !algoDetails || !algoDetails.supportedFileTypes.includes(bf.file.type); 
        }).length;

        if (incompatibleFilesCount > 0 && selectedFiles.filter(f => f.status === 'no_algorithm').length === 0) {
             toast({ title: "Traitement par lots", description: "Aucun fichier compatible à traiter après sélection de l'algorithme." });
        } else if (selectedFiles.filter(f => f.status === 'no_algorithm').length > 0) {
            // This case is handled by the "Algorithme manquant" toast earlier.
        } else if (selectedFiles.length > 0) { 
            toast({ title: "Traitement par lots", description: "Aucun fichier ne sera traité avec les sélections actuelles." });
        }
    }
    
    setSelectedFiles(prevFiles => prevFiles.map(bf => {
        const majorType = getMajorFileType(bf.file.type);
        const algoId = algorithmSelections[majorType];

        if (!algoId || algoId === 'none') {
             if (getCompatibleAlgorithms(majorType).length === 0) {
                return { ...bf, status: 'incompatible', resultMessage: `Aucun algorithme compatible pour ${getFileTypeLabel(majorType)}.` };
             } else if (bf.status === 'pending' && (!algoId || algoId === 'none')) { 
                return { ...bf, status: 'no_algorithm', resultMessage: "Aucun algorithme sélectionné." };
             }
        } else {
            const algoDetails = mockAlgorithms.find(a => a.id === algoId);
            if (algoDetails && algoDetails.supportedFileTypes.includes(bf.file.type)) {
                if (filesToProcessInitially.some(f => f.id === bf.id)) {
                    return { ...bf, status: 'processing', resultMessage: 'En attente de traitement...' };
                } else { 
                    return { ...bf, status: 'incompatible', resultMessage: `Type (${bf.file.type}) incompatible avec ${algoDetails.name}.` };
                }
            } else if (algoDetails && !algoDetails.supportedFileTypes.includes(bf.file.type)) {
                return { ...bf, status: 'incompatible', resultMessage: `Type (${bf.file.type}) incompatible avec ${algoDetails.name}.` };
            }
        }
        return bf; 
    }));


    for (const batchFile of selectedFiles) {
      if (batchFile.status !== 'processing') { 
          continue;
      }

      const majorType = getMajorFileType(batchFile.file.type);
      const algorithmId = algorithmSelections[majorType];
      
      if (!algorithmId || algorithmId === 'none') {
        setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, status: 'error', resultMessage: 'Erreur interne: Algorithme non trouvé pendant traitement.' } : f));
        continue;
      }
      const algorithmDetails = mockAlgorithms.find(algo => algo.id === algorithmId)!;

      setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, resultMessage: 'Vérification de capacité...' } : f));
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for UI update

      let realCapacityBytes = -1;
      let capacityCheckError: string | null = null;

      try {
        if (algorithmDetails.isMetadataBased || algorithmDetails.id === 'pdf_metadata_simulated') {
          if (algorithmDetails.estimatedCapacity) {
            realCapacityBytes = algorithmDetails.estimatedCapacity;
          } else {
            capacityCheckError = "Capacité estimée non définie pour l'algorithme de métadonnées.";
          }
        } else { 
          if (majorType === 'image') {
            const capacity = await getImageCapacityInfo(batchFile.file, algorithmId);
            realCapacityBytes = capacity.capacityBytes;
          } else if (majorType === 'audio') {
            const capacity = await getAudioCapacityInfo(batchFile.file, algorithmId);
            realCapacityBytes = capacity.capacityBytes;
          } else if (majorType === 'text') {
            const textContent = await batchFile.file.text(); // Read text file content for capacity check
            const capacity = await getTextCapacityInfo(textContent, algorithmId);
            realCapacityBytes = capacity.capacityBytes;
          }
        }
      } catch (e: any) {
        console.error(`Erreur de vérification de capacité pour ${batchFile.file.name} (${algorithmDetails.name}):`, e);
        capacityCheckError = `Erreur capacité: ${e.message.substring(0, 100)}`;
      }

      if (capacityCheckError) {
        setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, status: 'error', resultMessage: capacityCheckError } : f));
        continue; 
      }

      if (realCapacityBytes !== -1 && messageToEmbedBytes > realCapacityBytes) {
        setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, status: 'capacity_error', resultMessage: `Message trop long (${messageToEmbedBytes}o). Capacité: ${realCapacityBytes}o.` } : f));
        continue; 
      }
      
      setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, resultMessage: `Intégration (${algorithmDetails.name})...` } : f));
      
      try {
        if (majorType === 'image') {
          await embedMessageInImage(batchFile.file, messageToEmbed, algorithmId);
        } else if (majorType === 'audio') {
          await embedMessageInAudio(batchFile.file, messageToEmbed, algorithmId);
        } else if (majorType === 'text') {
          const textContent = await batchFile.file.text();
          await embedMessageInText(textContent, messageToEmbed, algorithmId);
        } else if (majorType === 'application/pdf') {
          await embedMessageInPdf(batchFile.file, messageToEmbed, algorithmId);
        }
        // If embed function completes without error, it's a success for batch context
        setSelectedFiles(prev =>
          prev.map(f =>
            f.id === batchFile.id
              ? { ...f, status: 'success', resultMessage: `Message intégré via ${algorithmDetails.name}.` }
              : f
          )
        );
      } catch (embedError: any) {
        console.error(`Erreur d'intégration pour ${batchFile.file.name} (${algorithmDetails.name}):`, embedError);
        setSelectedFiles(prev =>
          prev.map(f =>
            f.id === batchFile.id
              ? { ...f, status: 'error', resultMessage: `Échec intégration: ${embedError.message.substring(0,150)}` }
              : f
          )
        );
      }
    } 

    setIsProcessing(false);
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
        return currentSelectedFiles; 
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
            <CardTitle className="flex items-center gap-2"><FileTextLucide className="text-primary"/> Fichiers Sélectionnés et Résultats</CardTitle>
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
                    const estimatedCapacity = algorithmDetails?.isMetadataBased || algorithmDetails?.id === 'pdf_metadata_simulated' ? algorithmDetails.estimatedCapacity : null;
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
                        {algorithmDetails && (batchFile.status === 'pending' || (batchFile.status === 'processing' && batchFile.resultMessage?.includes('Vérification de capacité'))) && (
                          <div className="text-xs text-muted-foreground mt-1 border-t pt-1">
                            {algorithmDetails.isMetadataBased || algorithmDetails.id === 'pdf_metadata_simulated' ? (
                              <>
                                {estimatedCapacity != null && ( 
                                  <>
                                    <p>Message: {messageToEmbedBytes} o / Capacité estimée ({algorithmDetails.name}): {estimatedCapacity} o</p>
                                    {estimatedCapacity > 0 && <Progress value={percentageUsed} className="h-1.5 mt-0.5" />}
                                    {messageToEmbedBytes > estimatedCapacity && <p className="text-orange-600 text-xs">Le message dépasse la capacité estimée.</p>}
                                  </>
                                )}
                              </>
                            ) : ( 
                              <>
                                <p>Message à intégrer: {messageToEmbedBytes} o ({algorithmDetails.name})</p>
                                <p>Capacité réelle vérifiée lors du traitement.</p>
                              </>
                            )}
                          </div>
                        )}
                        {batchFile.resultMessage && (
                          <p className={`text-xs truncate mt-1 ${
                              batchFile.status === 'success' ? 'text-green-600' :
                              batchFile.status === 'error' || batchFile.status === 'capacity_error' ? 'text-red-600' :
                              batchFile.status === 'incompatible' ? 'text-orange-600' :
                              batchFile.status === 'no_algorithm' ? 'text-yellow-600' : 
                              batchFile.status === 'processing' ? 'text-blue-600' : 'text-muted-foreground'
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

    