// File overview: Page component for the Batch Processing tool.
// Allows users to process multiple files for steganography operations (embedding or extracting messages).
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
import { Upload, Settings, Play, Loader2, CheckCircle, XCircle, FileText as FileTextLucide, ImageIcon, MusicIcon, FileQuestionIcon as PdfIcon, AlertTriangle, Download, Copy, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getCapacityInfo as getImageCapacityInfo, embedMessageInImage, extractMessageFromImage, convertObjectUrlToDataUri as convertImageObjectUrlToDataUri } from '@/lib/steganography';
import { getAudioCapacityInfo, embedMessageInAudio, extractMessageFromAudio, convertObjectUrlToDataUri as convertAudioObjectUrlToDataUri } from '@/lib/audioSteganography';
import { getTextCapacityInfo, embedMessageInText, extractMessageFromText } from '@/lib/textSteganography';
import { getPdfCapacityInfo, embedMessageInPdf, extractMessageFromPdf, convertObjectUrlToDataUri as convertPdfObjectUrlToDataUri } from '@/lib/pdfSteganography';

interface ExtractedMessageDetail {
  algorithmName: string;
  message: string;
}

interface BatchFile {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'success' | 'error' | 'incompatible' | 'no_algorithm' | 'capacity_error' | 'not_found';
  resultMessage?: string;
  capacityInfo?: { realCapacityBytes?: number; messageFits?: boolean };
  stegoFileDataUri?: string; 
  stegoTextContent?: string; 
  extractedMessages: ExtractedMessageDetail[] | null;
}

type OperationMode = 'embed' | 'extract';

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
  const [operationMode, setOperationMode] = useState<OperationMode>('embed');


  useEffect(() => {
    if (prevIsProcessingRef.current === true && isProcessing === false) {
      const finalSuccessCount = selectedFiles.filter(f => f.status === 'success').length;
      const finalErrorCount = selectedFiles.filter(f => ['error', 'capacity_error', 'not_found'].includes(f.status)).length;
      const finalIncompatibleCount = selectedFiles.filter(f => f.status === 'incompatible').length;
      const finalNoAlgoCount = selectedFiles.filter(f => f.status === 'no_algorithm').length;

      let processedCount = 0;
      selectedFiles.forEach(f => {
          if (['success', 'error', 'capacity_error', 'incompatible', 'no_algorithm', 'not_found'].includes(f.status)) {
              processedCount++;
          }
      });
      
      const operationLabel = operationMode === 'embed' ? "Intégration" : "Extraction";
      if (processedCount > 0 || selectedFiles.length > 0) {
          toast({
              title: `${operationLabel} par lots terminée`,
              description: `${finalSuccessCount} succès, ${finalErrorCount} échecs/non trouvés, ${finalIncompatibleCount} incompatibles, ${operationMode === 'embed' ? `${finalNoAlgoCount} sans algo. ` : ''}`
          });
      }
    }
    prevIsProcessingRef.current = isProcessing;
  }, [isProcessing, selectedFiles, toast, operationMode]);


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

  const handleOperationModeChange = (mode: OperationMode) => {
    setOperationMode(mode);
    setSelectedFiles(prev => prev.map(f => ({
        ...f,
        status: 'pending',
        resultMessage: undefined,
        stegoFileDataUri: undefined,
        stegoTextContent: undefined,
        extractedMessages: null,
        capacityInfo: undefined,
    })));
  };

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
      extractedMessages: null,
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
                 return { ...bf, status: 'pending', resultMessage: undefined, capacityInfo: undefined, stegoFileDataUri: undefined, stegoTextContent: undefined, extractedMessages: null };
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

const handleCopyExtracted = async (textToCopy?: string) => {
    if (!textToCopy) {
        toast({variant: "destructive", title: "Rien à copier", description: "Aucun message extrait pour ce fichier."});
        return;
    }
    try {
        await navigator.clipboard.writeText(textToCopy);
        toast({title: "Copié", description: "Message extrait copié dans le presse-papiers."});
    } catch (err) {
        toast({variant: "destructive", title: "Erreur de copie", description: "Impossible de copier le message."});
    }
};

  const handleStartBatch = async () => {
    if (selectedFiles.length === 0) {
      toast({ variant: "destructive", title: "Aucun fichier", description: "Veuillez sélectionner des fichiers à traiter." });
      return;
    }
    if (operationMode === 'embed' && !messageToEmbed) {
        toast({ variant: "destructive", title: "Message manquant", description: "Veuillez saisir un message à cacher." });
        return;
    }

    if (operationMode === 'embed') {
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
    }

    setIsProcessing(true); 
    console.log("[Batch Processing] Démarrage du traitement. Mode:", operationMode);

    const filesToProcessMapped = selectedFiles.map(bf => {
        let newStatus = bf.status;
        if (bf.status !== 'pending' && bf.status !== 'incompatible') {
             newStatus = 'pending';
        }
        
        let updatedBf: BatchFile = { ...bf, status: newStatus, resultMessage: undefined, stegoFileDataUri: undefined, stegoTextContent: undefined, extractedMessages: null };
            
        if (operationMode === 'embed') {
            const majorType = getMajorFileType(updatedBf.file.type);
            const algoId = algorithmSelections[majorType];
            if (!algoId || algoId === 'none') {
                if (getCompatibleAlgorithms(majorType).length === 0) {
                    updatedBf.status = 'incompatible';
                    updatedBf.resultMessage = `Aucun algorithme compatible pour ${getFileTypeLabel(majorType)}.`;
                } else { 
                    updatedBf.status = 'no_algorithm';
                    updatedBf.resultMessage = "Aucun algorithme sélectionné.";
                }
            } else {
                const algoDetails = mockAlgorithms.find(a => a.id === algoId);
                if (algoDetails && algoDetails.supportedFileTypes.includes(updatedBf.file.type)) {
                    updatedBf.status = 'processing';
                    updatedBf.resultMessage = 'En attente de traitement...';
                } else if (algoDetails && !algoDetails.supportedFileTypes.includes(updatedBf.file.type)) {
                    updatedBf.status = 'incompatible';
                    updatedBf.resultMessage = `Type (${updatedBf.file.type}) incompatible avec ${algoDetails.name}.`;
                } else if (!algoDetails) { 
                    updatedBf.status = 'error';
                    updatedBf.resultMessage = 'Erreur: Détails de l\'algorithme non trouvés.';
                }
            }
        } else { // Extract mode
             updatedBf.status = 'processing';
             updatedBf.resultMessage = 'En attente d\'extraction...';
        }
        return updatedBf;
    });

    setSelectedFiles(filesToProcessMapped);
    console.log("[Batch Processing] Fichiers après mappage initial des statuts:", filesToProcessMapped.map(f => ({name: f.file.name, status: f.status, result: f.resultMessage})));

    const filesReadyForProcessingLoop = filesToProcessMapped.filter(f => f.status === 'processing');
    
    if (filesReadyForProcessingLoop.length > 0) {
        const toastTitle = operationMode === 'embed' ? "Traitement par lots démarré" : "Extraction par lots démarrée";
        const toastDescription = operationMode === 'embed' 
            ? `Vérification de capacité et traitement de ${filesReadyForProcessingLoop.length} fichiers compatibles...`
            : `Tentative d'extraction sur ${filesReadyForProcessingLoop.length} fichiers...`;
        toast({ title: toastTitle, description: toastDescription });
    } else {
        const anyPending = filesToProcessMapped.some(f => f.status === 'pending');
        if (!anyPending && selectedFiles.length > 0) { 
             toast({ title: "Traitement par lots", description: `Aucun fichier compatible à ${operationMode === 'embed' ? 'traiter' : 'analyser'} après sélection des algorithmes.` });
        } else if (selectedFiles.length > 0 && operationMode === 'embed') { 
             toast({ title: "Traitement par lots", description: "Vérifiez les sélections d'algorithmes." });
        } else if (selectedFiles.length > 0 && operationMode === 'extract') {
            toast({ title: "Extraction par lots", description: "Aucun fichier marqué pour extraction."});
        }
        setIsProcessing(false); 
        return;
    }

    console.log("[Batch Processing] Fichiers prêts pour la boucle de traitement:", filesReadyForProcessingLoop.map(f => f.file.name));

    for (const batchFile of filesReadyForProcessingLoop) { 
      console.log(`[Batch Processing] Traitement de: ${batchFile.file.name}`);
      if (operationMode === 'embed') {
        const majorType = getMajorFileType(batchFile.file.type);
        const algorithmId = algorithmSelections[majorType]!; 
        const algorithmDetails = mockAlgorithms.find(algo => algo.id === algorithmId)!;

        console.log(`[Batch Embed] File: ${batchFile.file.name}, Algo: ${algorithmDetails.name}, ID: ${algorithmId}`);
        setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, resultMessage: 'Vérification de capacité...' } : f));
        
        let realCapacityBytes = -1;
        let capacityCheckError: string | null = null;

        try {
            console.log(`[Batch Embed Capacity Check] File: ${batchFile.file.name}, isMetadataBased: ${algorithmDetails.isMetadataBased}, estimatedCapacity: ${algorithmDetails.estimatedCapacity}`);
            if (algorithmDetails.isMetadataBased || algorithmDetails.estimatedCapacity) {
                if (algorithmDetails.estimatedCapacity) {
                    realCapacityBytes = algorithmDetails.estimatedCapacity;
                    console.log(`[Batch Embed Capacity Check] Using estimatedCapacity: ${realCapacityBytes}`);
                } else {
                    capacityCheckError = `Capacité estimée non disponible pour ${algorithmDetails.name}.`;
                    console.warn(`[Batch Embed Capacity Check] ${capacityCheckError}`);
                }
            } else if (majorType === 'image') {
                const capacity = await getImageCapacityInfo(batchFile.file, algorithmId);
                realCapacityBytes = capacity.capacityBytes;
                 console.log(`[Batch Embed Capacity Check - Image] Real capacity: ${realCapacityBytes}`);
            } else if (majorType === 'audio') {
                const capacity = await getAudioCapacityInfo(batchFile.file, algorithmId);
                realCapacityBytes = capacity.capacityBytes;
                console.log(`[Batch Embed Capacity Check - Audio] Real capacity: ${realCapacityBytes}`);
            } else if (majorType === 'text') {
                const textContent = await batchFile.file.text();
                const capacity = await getTextCapacityInfo(textContent, algorithmId);
                realCapacityBytes = capacity.capacityBytes;
                console.log(`[Batch Embed Capacity Check - Text] Real capacity: ${realCapacityBytes}`);
            } else if (majorType === 'application/pdf' && algorithmId === 'pdf_metadata_simulated') {
                 const capacity = await getPdfCapacityInfo(batchFile.file, algorithmId);
                 realCapacityBytes = capacity.capacityBytes;
                 console.log(`[Batch Embed Capacity Check - PDF] Real capacity: ${realCapacityBytes}`);
            } else {
                capacityCheckError = `Type de fichier non supporté pour vérification de capacité: ${majorType}`;
                 console.warn(`[Batch Embed Capacity Check] ${capacityCheckError}`);
            }
        } catch (e: any) {
            console.error(`[Batch Embed Capacity Check - ERROR] File: ${batchFile.file.name} (${algorithmDetails.name}):`, e);
            capacityCheckError = `Erreur capacité: ${e.message.substring(0, 100)}`;
        }

        if (capacityCheckError) {
            setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, status: 'error', resultMessage: capacityCheckError } : f));
            continue; 
        }

        if (realCapacityBytes !== -1 && messageToEmbedBytes > realCapacityBytes) {
            const capErrorMsg = `Message trop long (${messageToEmbedBytes}o). Capacité: ${realCapacityBytes}o.`;
            console.warn(`[Batch Embed Capacity Check - Capacity Error] File: ${batchFile.file.name}, ${capErrorMsg}`);
            setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, status: 'capacity_error', resultMessage: capErrorMsg } : f));
            continue; 
        }

        console.log(`[Batch Embed] File: ${batchFile.file.name}, Capacité OK. Message: ${messageToEmbedBytes}o, Capacité Fichier: ${realCapacityBytes}o. Intégration...`);
        setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, resultMessage: `Intégration (${algorithmDetails.name})...` } : f));
        
        try {
            let processedFileData: string | undefined = undefined;
            let processedTextContent: string | undefined = undefined;
            let objectUrlToRevoke: string | null = null;

            if (majorType === 'image') {
                const result = await embedMessageInImage(batchFile.file, messageToEmbed, algorithmId);
                if (result.startsWith('data:')) { 
                    processedFileData = result;
                } else { 
                    objectUrlToRevoke = result;
                    processedFileData = await convertImageObjectUrlToDataUri(result);
                }
                console.log(`[Batch Embed - Image] Succès: ${batchFile.file.name}`);
            } else if (majorType === 'audio') {
                objectUrlToRevoke = await embedMessageInAudio(batchFile.file, messageToEmbed, algorithmId);
                processedFileData = await convertAudioObjectUrlToDataUri(objectUrlToRevoke);
                 console.log(`[Batch Embed - Audio] Succès: ${batchFile.file.name}`);
            } else if (majorType === 'text') {
                const textContent = await batchFile.file.text(); 
                processedTextContent = await embedMessageInText(textContent, messageToEmbed, algorithmId);
                console.log(`[Batch Embed - Text] Succès: ${batchFile.file.name}`);
            } else if (majorType === 'application/pdf') {
                objectUrlToRevoke = await embedMessageInPdf(batchFile.file, messageToEmbed, algorithmId);
                processedFileData = await convertPdfObjectUrlToDataUri(objectUrlToRevoke);
                console.log(`[Batch Embed - PDF] Succès: ${batchFile.file.name}`);
            }
            
            if (objectUrlToRevoke) {
                URL.revokeObjectURL(objectUrlToRevoke);
                console.log(`[Batch Embed] Object URL révoqué pour ${batchFile.file.name}`);
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
        } catch (embedError: any) {
            console.error(`[Batch Embed - ERROR] File: ${batchFile.file.name}, Algo: ${algorithmDetails.name}`, embedError);
            setSelectedFiles(prev =>
            prev.map(f =>
                f.id === batchFile.id
                ? { ...f, status: 'error', resultMessage: `Échec intégration: ${embedError.message.substring(0,150)}` }
                : f
            )
            );
        }
      } else { // operationMode === 'extract'
          const majorType = getMajorFileType(batchFile.file.type);
          const compatibleAlgorithms = getCompatibleAlgorithms(majorType);
          console.log(`[Batch Extract] File: ${batchFile.file.name}, Algorithmes compatibles: ${compatibleAlgorithms.map(a=>a.name).join(', ')}`);
          setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, resultMessage: `Analyse (${compatibleAlgorithms.length} algos)...` } : f));
          
          const foundMessagesForFile: ExtractedMessageDetail[] = [];
          let extractionError: string | null = null;

          if (compatibleAlgorithms.length === 0) {
              console.warn(`[Batch Extract] File: ${batchFile.file.name}, Aucun algorithme compatible.`);
              setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, status: 'incompatible', resultMessage: `Aucun algorithme compatible pour extraction.` } : f));
              continue;
          }

          for (const algo of compatibleAlgorithms) {
              console.log(`[Batch Extract] File: ${batchFile.file.name}, Tentative avec ${algo.name}...`);
              setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, resultMessage: `Tentative avec ${algo.name}...` } : f));
              try {
                  let currentExtractedText = "";
                  if (majorType === 'image') {
                      currentExtractedText = await extractMessageFromImage(batchFile.file, algo.id);
                  } else if (majorType === 'audio') {
                      currentExtractedText = await extractMessageFromAudio(batchFile.file, algo.id);
                  } else if (majorType === 'text') {
                      const textContent = await batchFile.file.text();
                      currentExtractedText = await extractMessageFromText(textContent, algo.id);
                  } else if (majorType === 'application/pdf') {
                      currentExtractedText = await extractMessageFromPdf(batchFile.file, algo.id);
                  }

                  if (currentExtractedText && currentExtractedText.trim().length > 0) {
                      console.log(`[Batch Extract] File: ${batchFile.file.name}, Message trouvé avec ${algo.name}: "${currentExtractedText.substring(0,30)}..."`);
                      foundMessagesForFile.push({ algorithmName: algo.name, message: currentExtractedText });
                  }
              } catch (e: any) {
                  console.warn(`[Batch Extract Attempt Error] File: ${batchFile.file.name}, Algo: ${algo.name}, Error: ${e.message}`);
                  extractionError = e.message; 
              }
          }

          if (foundMessagesForFile.length > 0) {
              console.log(`[Batch Extract] File: ${batchFile.file.name}, Succès. ${foundMessagesForFile.length} message(s) extrait(s).`);
              setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? {
                  ...f,
                  status: 'success',
                  resultMessage: `${foundMessagesForFile.length} message(s) extrait(s).`,
                  extractedMessages: foundMessagesForFile,
              } : f));
          } else {
              console.log(`[Batch Extract] File: ${batchFile.file.name}, Aucun message trouvé.`);
              setSelectedFiles(prev => prev.map(f => f.id === batchFile.id ? {
                  ...f,
                  status: 'not_found',
                  resultMessage: `Aucun message trouvé après ${compatibleAlgorithms.length} tentatives. ${extractionError ? `Dernière erreur: ${extractionError.substring(0,50)}` : ''}`.trim(),
                  extractedMessages: null,
              } : f));
          }
      }
      console.log(`[Batch Processing] Traitement de ${batchFile.file.name} terminé.`);
    } 
    console.log("[Batch Processing] Boucle de traitement principale terminée.");
    setIsProcessing(false); 
    console.log("[Batch Processing] isProcessing mis à false.");
  };

  const allRequiredAlgorithmsSelected = operationMode === 'extract' || detectedFileTypes.length === 0 || detectedFileTypes.every(type => {
    const compatibleAlgos = getCompatibleAlgorithms(type);
    return compatibleAlgos.length === 0 || (!!algorithmSelections[type] && algorithmSelections[type] !== 'none');
  });


  return (
    <div className="space-y-8">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">Traitement par Lots</h1>
      
      <Tabs value={operationMode} onValueChange={(v) => handleOperationModeChange(v as OperationMode)} className="w-full max-w-md mx-auto mb-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="embed">Cacher un Message</TabsTrigger>
          <TabsTrigger value="extract">Extraire des Messages</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="text-primary"/> Sélection et Configuration</CardTitle>
            <CardDescription>
              {operationMode === 'embed' 
                ? "Téléchargez vos fichiers, choisissez les algorithmes par type, et saisissez le message à cacher."
                : "Téléchargez vos fichiers pour tenter d'en extraire des messages cachés."
              }
            </CardDescription>
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

            {operationMode === 'embed' && detectedFileTypes.length > 0 && (
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

            {operationMode === 'embed' && (
                <div>
                <Label htmlFor="batchMessage" className="text-base">{detectedFileTypes.length > 0 ? '3.' : '2.'} Message à Cacher</Label>
                <Input
                    id="batchMessage"
                    type="text"
                    placeholder="Saisissez le message secret..."
                    value={messageToEmbed}
                    onChange={handleMessageToEmbedChange}
                    disabled={isProcessing}
                />
                <p className="text-sm text-muted-foreground mt-1">
                    Ce message ({messageToEmbedBytes} octets) sera intégré. Pour le texte, utilisez des fichiers .txt.
                </p>
                </div>
            )}

            <Button
                onClick={handleStartBatch}
                disabled={isProcessing || selectedFiles.length === 0 || (operationMode === 'embed' && (!allRequiredAlgorithmsSelected || !messageToEmbed))}
                className="w-full"
                size="lg"
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Traitement en cours...</>
              ) : (
                <>
                    {operationMode === 'embed' ? <Play className="mr-2 h-5 w-5" /> : <Search className="mr-2 h-5 w-5" />}
                    {operationMode === 'embed' ? 'Démarrer le Traitement' : 'Démarrer l\'Extraction'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileTextLucide className="text-primary"/> Fichiers Sélectionnés et Résultats</CardTitle>
            <CardDescription>Liste des fichiers et leur état de {operationMode === 'embed' ? 'traitement' : 'd\'extraction'}.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedFiles.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Aucun fichier sélectionné pour le moment.</p>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <ul className="space-y-3">
                  {selectedFiles.map((batchFile) => {
                    const majorType = getMajorFileType(batchFile.file.type);
                    const algorithmDetails = operationMode === 'embed' && algorithmSelections[majorType] 
                                            ? mockAlgorithms.find(a => a.id === algorithmSelections[majorType]) 
                                            : null;
                    const estimatedCapacity = algorithmDetails?.estimatedCapacity;
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
                            {(batchFile.status === 'error' || batchFile.status === 'capacity_error' || batchFile.status === 'not_found') && <XCircle className="h-5 w-5 text-red-500" />}
                            {batchFile.status === 'incompatible' && <AlertTriangle className="h-5 w-5 text-orange-500" />}
                            {batchFile.status === 'no_algorithm' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                            
                            {operationMode === 'embed' && batchFile.status === 'success' && (batchFile.stegoFileDataUri || batchFile.stegoTextContent) && (
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
                        {operationMode === 'embed' && algorithmDetails && (batchFile.status === 'pending' || (batchFile.status === 'processing' && batchFile.resultMessage?.includes('Vérification de capacité'))) && (
                          <div className="text-xs text-muted-foreground mt-1 border-t pt-1">
                            {algorithmDetails.isMetadataBased || algorithmDetails.estimatedCapacity ? (
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
                              batchFile.status === 'error' || batchFile.status === 'capacity_error' || batchFile.status === 'not_found' ? 'text-red-600' :
                              batchFile.status === 'incompatible' ? 'text-orange-600' :
                              batchFile.status === 'no_algorithm' ? 'text-yellow-600' :
                              batchFile.status === 'processing' ? 'text-blue-600' : 'text-muted-foreground'
                          }`} title={batchFile.resultMessage}>
                              {batchFile.resultMessage}
                          </p>
                        )}
                        {operationMode === 'extract' && batchFile.status === 'success' && batchFile.extractedMessages && batchFile.extractedMessages.length > 0 && (
                            <div className="mt-1 pt-1 border-t space-y-2">
                                {batchFile.extractedMessages.map((extracted, index) => (
                                    <div key={index} className="bg-muted/30 p-1.5 rounded-sm">
                                        <div className="flex justify-between items-start">
                                            <p className="text-xs font-semibold text-primary">Message Extrait (via {extracted.algorithmName}):</p>
                                            <Button variant="outline" size="icon" onClick={() => handleCopyExtracted(extracted.message)} className="h-6 w-6">
                                                <Copy className="h-3 w-3 text-primary" />
                                                <span className="sr-only">Copier</span>
                                            </Button>
                                        </div>
                                        <p className="text-xs text-foreground mt-0.5 max-h-20 overflow-y-auto whitespace-pre-wrap break-all">{extracted.message}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                         {operationMode === 'extract' && batchFile.status === 'not_found' && (
                             <p className="text-xs text-muted-foreground mt-1 border-t pt-1">Aucun message détectable avec les algorithmes compatibles.</p>
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
