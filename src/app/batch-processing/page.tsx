
"use client";

import type React from 'react';
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { mockAlgorithms, type SteganographyAlgorithm, type CapacityInfo } from "@/types";
import { Upload, Settings, Play, Loader2, CheckCircle, XCircle, FileText as FileTextLucide, ImageIcon, MusicIcon, FileQuestionIcon as PdfIcon, AlertTriangle, Download } from "lucide-react";

import { getCapacityInfo as getImageCapacityInfo, embedMessageInImage, convertObjectUrlToDataUri as convertImageObjectUrlToDataUri } from '@/lib/steganography';
import { getAudioCapacityInfo, embedMessageInAudio, convertObjectUrlToDataUri as convertAudioObjectUrlToDataUri } from '@/lib/audioSteganography';
import { getTextCapacityInfo, embedMessageInText } from '@/lib/textSteganography';
import { getPdfCapacityInfo, embedMessageInPdf, convertObjectUrlToDataUri as convertPdfObjectUrlToDataUri } from '@/lib/pdfSteganography';


interface BatchFile {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'success' | 'error' | 'incompatible' | 'no_algorithm' | 'capacity_error';
  resultMessage?: string;
  capacityInfo?: { realCapacityBytes?: number; messageFits?: boolean };
  stegoFileDataUri?: string; // For image, audio, pdf (Data URI)
  stegoTextContent?: string; // For text files
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
  const prevIsProcessingRef = useRef<boolean | null>(null);


  useEffect(() => {
    if (prevIsProcessingRef.current === true && isProcessing === false) {
      console.log("[Batch Effect] Processing just finished. Current selectedFiles:", selectedFiles);
      const finalSuccessCount = selectedFiles.filter(f => f.status === 'success').length;
      const finalErrorCount = selectedFiles.filter(f => f.status === 'error' || f.status === 'capacity_error').length;
      const finalIncompatibleCount = selectedFiles.filter(f => f.status === 'incompatible').length;
      const finalNoAlgoCount = selectedFiles.filter(f => f.status === 'no_algorithm').length;

      let processedCount = 0;
      selectedFiles.forEach(f => {
          if (['success', 'error', 'capacity_error', 'incompatible', 'no_algorithm'].includes(f.status)) {
              processedCount++;
          }
      });
       console.log(`[Batch Effect] Counts: Success=${finalSuccessCount}, Error=${finalErrorCount}, Incompatible=${finalIncompatibleCount}, NoAlgo=${finalNoAlgoCount}, ProcessedTotal=${processedCount}`);

      if (processedCount > 0 || selectedFiles.length > 0) {
          toast({
              title: "Traitement par lots terminé",
              description: `${finalSuccessCount} succès, ${finalErrorCount} échecs, ${finalIncompatibleCount} incompatibles, ${finalNoAlgoCount} sans algo sélectionnés.`
          });
      }
    }
    prevIsProcessingRef.current = isProcessing;
  }, [isProcessing, selectedFiles, toast]);


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
      id: `${file.name}-${file.lastModified}-${file.size}-${Math.random().toString(36).substring(2, 15)}`,
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
      const existingFileKeys = new Set(
        prevFiles.map(f => `${f.file.name}|${f.file.size}|${f.file.lastModified}`)
      );
      
      const filesToAdd = newBatchFiles.filter(bf => {
        const key = `${bf.file.name}|${bf.file.size}|${bf.file.lastModified}`;
        return !existingFileKeys.has(key);
      });

      if (prevFiles.length === 0 && newBatchFiles.length > 0) {
        return newBatchFiles; 
      }
      if (filesToAdd.length > 0) {
        return [...prevFiles, ...filesToAdd];
      }
      return prevFiles;
    });
    event.target.value = ""; 
  };

  const removeFile = (idToRemove: string) => {
    const fileToRemove = selectedFiles.find(f => f.id === idToRemove);
    if (fileToRemove?.stegoFileDataUri && fileToRemove.stegoFileDataUri.startsWith('blob:')) {
        // This was for object URLs, but we are now aiming for data URIs for storage in BatchFile
        // URL.revokeObjectURL(fileToRemove.stegoFileDataUri); 
    }

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
                 return { ...bf, status: 'pending', resultMessage: undefined, capacityInfo: undefined, stegoFileDataUri: undefined, stegoTextContent: undefined };
            }
        }
        return bf;
    }));
  };


  const handleMessageToEmbedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessageToEmbed(event.target.value);
  };

  const messageToEmbedBytes = useMemo(() => new TextEncoder().encode(messageToEmbed).length, [messageToEmbed]);

  const handleDownload = async (batchFile: BatchFile) => {
    if (!batchFile.file || !batchFile.file.name) {
        toast({ variant: "destructive", title: "Erreur de téléchargement", description: "Nom de fichier manquant." });
        return;
    }
    const originalFileName = batchFile.file.name;
    const originalExtension = originalFileName.split('.').pop() || '';
    const fileNameBase = originalExtension ? originalFileName.substring(0, originalFileName.length - (originalExtension.length + 1)) : originalFileName;
    const downloadName = `steg_${fileNameBase}${originalExtension ? '.' + originalExtension : ''}`;

    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';

    try {
        if (batchFile.stegoFileDataUri) {
            a.href = batchFile.stegoFileDataUri;
            a.download = downloadName;
            a.click();
            toast({ title: "Téléchargé", description: `${downloadName} a été téléchargé.` });
        } else if (batchFile.stegoTextContent) {
            const blob = new Blob([batchFile.stegoTextContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            a.href = url;
            a.download = `steg_${fileNameBase}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: "Téléchargé", description: `steg_${fileNameBase}.txt a été téléchargé.` });
        } else {
            toast({ variant: "destructive", title: "Erreur de téléchargement", description: "Aucune donnée à télécharger pour ce fichier." });
        }
    } catch (error: any) {
        console.error("Erreur de téléchargement:", error);
        toast({ variant: "destructive", title: "Erreur de téléchargement", description: error.message });
    } finally {
        document.body.removeChild(a);
    }
};


  const handleStartBatch = async () => {
    console.log("[Batch Start] Initiated. Message to embed:", messageToEmbed, `(${messageToEmbedBytes} bytes)`);
    console.log("[Batch Start] Current selectedFiles (at start of handleStartBatch):", JSON.parse(JSON.stringify(selectedFiles.map(f=>({name:f.file.name, id:f.id, status:f.status, msg:f.resultMessage})))));
    console.log("[Batch Start] Current algorithmSelections:", algorithmSelections);


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
     console.log("[Batch Start] Files with missing algo selection:", filesWithMissingAlgoSelection);

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
                    console.log(`[Batch Init Status] NO ALGO - Marked ${bf.file.name} as 'no_algorithm'`);
                    return {...bf, status: 'no_algorithm', resultMessage: "Aucun algorithme sélectionné pour ce type."};
                }
            }
            return bf;
        }));
        return;
    }

    setIsProcessing(true); 

    const filesToProcessMapped = selectedFiles.map(bf => {
      const majorType = getMajorFileType(bf.file.type);
      const algoId = algorithmSelections[majorType];
      let newStatus = bf.status;
      let newResultMessage = bf.resultMessage;
      let newStegoDataUri = bf.stegoFileDataUri;
      let newStegoText = bf.stegoTextContent;


      if (bf.status !== 'pending' && bf.status !== 'error' && bf.status !== 'capacity_error' && bf.status !== 'no_algorithm') {
         // If already success, incompatible etc., keep its state
         return bf;
      }
      // Reset stego data for files being re-processed due to error/capacity_error/no_algorithm
      newStegoDataUri = undefined;
      newStegoText = undefined;

      if (!algoId || algoId === 'none') {
        if (getCompatibleAlgorithms(majorType).length === 0) {
          newStatus = 'incompatible';
          newResultMessage = `Aucun algorithme compatible pour ${getFileTypeLabel(majorType)}.`;
          console.log(`[Batch Init Status] INCOMPATIBLE (no compatible algos) - Marked ${bf.file.name} as '${newStatus}'`);
        } else { 
          newStatus = 'no_algorithm';
          newResultMessage = "Aucun algorithme sélectionné.";
           console.log(`[Batch Init Status] NO ALGO (user did not select) - Marked ${bf.file.name} as '${newStatus}'`);
        }
      } else {
        const algoDetails = mockAlgorithms.find(a => a.id === algoId);
        if (algoDetails && algoDetails.supportedFileTypes.includes(bf.file.type)) {
          newStatus = 'processing';
          newResultMessage = 'En attente de traitement...';
          console.log(`[Batch Init Status] PROCESSING - Marked ${bf.file.name} as '${newStatus}'`);
        } else if (algoDetails && !algoDetails.supportedFileTypes.includes(bf.file.type)) {
          newStatus = 'incompatible';
          newResultMessage = `Type (${bf.file.type}) incompatible avec ${algoDetails.name}.`;
          console.log(`[Batch Init Status] INCOMPATIBLE (type mismatch) - Marked ${bf.file.name} as '${newStatus}'`);
        } else if (!algoDetails) { 
          newStatus = 'error';
          newResultMessage = 'Erreur: Détails de l\'algorithme non trouvés.';
          console.log(`[Batch Init Status] ERROR (algo details not found) - Marked ${bf.file.name} as '${newStatus}'`);
        }
      }
      return { ...bf, status: newStatus, resultMessage: newResultMessage, stegoFileDataUri: newStegoDataUri, stegoTextContent: newStegoText };
    });

    setSelectedFiles(filesToProcessMapped);

    const filesReadyForProcessingLoop = filesToProcessMapped.filter(f => f.status === 'processing');
    console.log('[Batch Start] Files marked for processing loop:', filesReadyForProcessingLoop.map(f => f.file.name));

    if (filesReadyForProcessingLoop.length > 0) {
        toast({ title: "Traitement par lots démarré", description: `Vérification de capacité et traitement de ${filesReadyForProcessingLoop.length} fichiers compatibles...` });
    } else {
        const anyPending = filesToProcessMapped.some(f => f.status === 'pending');
        if (!anyPending && selectedFiles.length > 0) { 
             toast({ title: "Traitement par lots", description: "Aucun fichier compatible à traiter après sélection des algorithmes." });
        } else if (selectedFiles.length > 0) { 
             toast({ title: "Traitement par lots", description: "Vérifiez les sélections d'algorithmes." });
        }
        setIsProcessing(false); 
        return;
    }


    for (const batchFile of filesReadyForProcessingLoop) { 
      console.log(`[Batch Loop Iteration - START] File: ${batchFile.file.name} (ID: ${batchFile.id})`);
      
      const majorType = getMajorFileType(batchFile.file.type);
      const algorithmId = algorithmSelections[majorType]!; 
      const algorithmDetails = mockAlgorithms.find(algo => algo.id === algorithmId)!;

      setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, resultMessage: 'Vérification de capacité...' } : f));
      console.log(`[Batch Capacity Check - START] File: ${batchFile.file.name}, Algo: ${algorithmDetails.name}`);
      await new Promise(resolve => setTimeout(resolve, 50)); 

      let realCapacityBytes = -1;
      let capacityCheckError: string | null = null;

      try {
        if (algorithmDetails.isMetadataBased || algorithmDetails.id === 'pdf_metadata_simulated') {
          if (algorithmDetails.estimatedCapacity) {
            realCapacityBytes = algorithmDetails.estimatedCapacity;
          } else {
            capacityCheckError = `Capacité estimée non disponible pour ${algorithmDetails.name}.`;
          }
        } else if (majorType === 'image') {
          const capacity = await getImageCapacityInfo(batchFile.file, algorithmId);
          realCapacityBytes = capacity.capacityBytes;
        } else if (majorType === 'audio') {
          const capacity = await getAudioCapacityInfo(batchFile.file, algorithmId);
          realCapacityBytes = capacity.capacityBytes;
        } else if (majorType === 'text') {
          const textContent = await batchFile.file.text();
          const capacity = await getTextCapacityInfo(textContent, algorithmId);
          realCapacityBytes = capacity.capacityBytes;
        } else {
          capacityCheckError = `Type de fichier non supporté pour vérification de capacité: ${majorType}`;
        }
      } catch (e: any) {
        console.error(`[Batch Capacity Check - ERROR] File: ${batchFile.file.name} (${algorithmDetails.name}):`, e);
        capacityCheckError = `Erreur capacité: ${e.message.substring(0, 100)}`;
      }
      console.log(`[Batch Capacity Check - END] File: ${batchFile.file.name}, Capacity: ${realCapacityBytes}, Error: ${capacityCheckError}`);


      if (capacityCheckError) {
        setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, status: 'error', resultMessage: capacityCheckError } : f));
        continue; 
      }

      if (realCapacityBytes !== -1 && messageToEmbedBytes > realCapacityBytes) {
        const capErrorMsg = `Message trop long (${messageToEmbedBytes}o). Capacité: ${realCapacityBytes}o.`;
        setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, status: 'capacity_error', resultMessage: capErrorMsg } : f));
        console.log(`[Batch Capacity Check - FAIL] File: ${batchFile.file.name}, ${capErrorMsg}`);
        continue; 
      }

      setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, resultMessage: `Intégration (${algorithmDetails.name})...` } : f));
      console.log(`[Batch Embed - START] File: ${batchFile.file.name}, Algo: ${algorithmDetails.name}`);

      try {
        let processedFileData: string | undefined = undefined;
        let processedTextContent: string | undefined = undefined;
        let objectUrlToRevoke: string | null = null;

        if (majorType === 'image') {
          const result = await embedMessageInImage(batchFile.file, messageToEmbed, algorithmId);
          if (result.startsWith('data:')) { // LSB PNG returns data URI
            processedFileData = result;
          } else { // Metadata PNG returns object URL
            objectUrlToRevoke = result;
            processedFileData = await convertImageObjectUrlToDataUri(result);
          }
        } else if (majorType === 'audio') {
          objectUrlToRevoke = await embedMessageInAudio(batchFile.file, messageToEmbed, algorithmId);
          processedFileData = await convertAudioObjectUrlToDataUri(objectUrlToRevoke);
        } else if (majorType === 'text') {
          const textContent = await batchFile.file.text(); 
          processedTextContent = await embedMessageInText(textContent, messageToEmbed, algorithmId);
        } else if (majorType === 'application/pdf') {
          objectUrlToRevoke = await embedMessageInPdf(batchFile.file, messageToEmbed, algorithmId);
          processedFileData = await convertPdfObjectUrlToDataUri(objectUrlToRevoke);
        }
        
        if (objectUrlToRevoke) {
            URL.revokeObjectURL(objectUrlToRevoke);
        }

        setSelectedFiles(prev =>
          prev.map(f =>
            f.id === batchFile.id
              ? { 
                  ...f, 
                  status: 'success', 
                  resultMessage: `Message intégré via ${algorithmDetails.name}.`,
                  stegoFileDataUri: processedFileData,
                  stegoTextContent: processedTextContent,
                }
              : f
          )
        );
        console.log(`[Batch Embed - SUCCESS] File: ${batchFile.file.name}`);
      } catch (embedError: any) {
        console.error(`[Batch Embed - ERROR] File: ${batchFile.file.name} (${algorithmDetails.name}):`, embedError);
        setSelectedFiles(prev =>
          prev.map(f =>
            f.id === batchFile.id
              ? { ...f, status: 'error', resultMessage: `Échec intégration: ${embedError.message.substring(0,150)}` }
              : f
          )
        );
      }
      console.log(`[Batch Loop Iteration - END] File: ${batchFile.file.name}`);
    } 

    setIsProcessing(false); 
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
                            {batchFile.status === 'success' && (batchFile.stegoFileDataUri || batchFile.stegoTextContent) && (
                                <Button variant="outline" size="icon" onClick={() => handleDownload(batchFile)} className="h-7 w-7">
                                    <Download className="h-4 w-4 text-primary" />
                                    <span className="sr-only">Télécharger</span>
                                </Button>
                            )}
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

