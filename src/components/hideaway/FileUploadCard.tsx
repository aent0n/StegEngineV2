
"use client";

import type React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { FileQuestion, Image as ImageIconLucide, Music, Video, FileText as FileTextIcon, AlertCircle } from "lucide-react";
import Image from "next/image";
import type { OperationMode, CapacityInfo } from '@/types';
import { cn } from '@/lib/utils';

interface FileUploadCardProps {
  carrierFile: File | null;
  fileName: string | null;
  filePreviewUrl: string | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  
  messageToEmbed: string;
  onMessageToEmbedChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  
  operationMode: OperationMode;
  acceptedFileTypes: string; // Nouvelle prop pour les types de fichiers acceptés
  supportedFileTypesMessage?: string;
  capacityInfo: CapacityInfo | null;
}

const FileIconDisplay = ({ fileType }: { fileType: string | null }) => {
  if (!fileType) return <FileQuestion className="w-16 h-16 text-muted-foreground" />;
  if (fileType.startsWith("image/")) return <ImageIconLucide className="w-16 h-16 text-muted-foreground" />;
  if (fileType.startsWith("audio/")) return <Music className="w-16 h-16 text-muted-foreground" />;
  if (fileType.startsWith("video/")) return <Video className="w-16 h-16 text-muted-foreground" />;
  if (fileType.startsWith("text/") || fileType === "application/pdf") return <FileTextIcon className="w-16 h-16 text-muted-foreground" />;
  return <FileQuestion className="w-16 h-16 text-muted-foreground" />;
};


export default function FileUploadCard({
  carrierFile,
  fileName,
  filePreviewUrl,
  onFileChange,
  messageToEmbed,
  onMessageToEmbedChange,
  operationMode,
  acceptedFileTypes, // Utilisation de la nouvelle prop
  supportedFileTypesMessage = "Types supportés pour cet outil : Images (PNG, JPG).",
  capacityInfo,
}: FileUploadCardProps) {
  
  const messageBytes = operationMode === 'embed' && messageToEmbed ? new TextEncoder().encode(messageToEmbed).length : 0;
  const percentageUsed = capacityInfo && capacityInfo.capacityBytes > 0 
    ? Math.min(100, Math.max(0, (messageBytes / capacityInfo.capacityBytes) * 100)) 
    : 0;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="text-xl">Fichier Porteur {operationMode === 'embed' ? '& Message Secret' : ''}</CardTitle>
        <CardDescription>
          {operationMode === 'embed' 
            ? `Téléchargez le fichier (${supportedFileTypesMessage.toLowerCase().replace('fichiers ', '').replace(' pour cet outil.', '')}) pour cacher votre message, et saisissez votre message.`
            : `Téléchargez le fichier (${supportedFileTypesMessage.toLowerCase().replace('fichiers ', '').replace(' pour cet outil.', '')}) contenant un message caché pour l'extraire.`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="carrierFile" className="text-base">1. Télécharger le Fichier Porteur</Label>
          <Input
            id="carrierFile"
            type="file"
            accept={acceptedFileTypes} // Utilisation de la prop dynamique
            onChange={onFileChange}
            className="file:text-primary-foreground file:bg-primary hover:file:bg-primary/90 file:rounded-md file:border-0 file:px-3 file:py-2 file:mr-3 cursor-pointer"
            aria-describedby="fileHelp"
          />
          <p id="fileHelp" className="text-sm text-muted-foreground">
            {supportedFileTypesMessage}
          </p>
          {fileName && (
            <div className="mt-4 p-4 border rounded-lg bg-secondary/50 flex flex-col sm:flex-row items-center gap-4">
              {filePreviewUrl && carrierFile?.type.startsWith('image/') ? (
                <Image 
                  src={filePreviewUrl} 
                  alt="Aperçu du fichier" 
                  width={80} 
                  height={80} 
                  className="rounded object-contain border"
                  data-ai-hint="uploaded content" // Plus générique
                />
              ) : (
                <FileIconDisplay fileType={carrierFile?.type || null} />
              )}
              <div className="text-sm w-full">
                <p className="font-medium text-secondary-foreground">{fileName}</p>
                {carrierFile && <p className="text-xs text-muted-foreground">Type: {carrierFile.type}, Taille: {(carrierFile.size / 1024).toFixed(2)} KB</p>}
                {capacityInfo && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {capacityInfo.width > 0 && capacityInfo.height > 0 && ( // Afficher les dimensions seulement si elles sont pertinentes
                      <p>Dimensions: {capacityInfo.width}x{capacityInfo.height}px</p>
                    )}
                    {operationMode === 'embed' && (
                      <>
                        <p className="mt-1">
                          Message : {messageBytes} octets / Capacité max : {capacityInfo.capacityBytes} octets
                        </p>
                        <div className="w-full mt-1 relative"> {/* Progress bar container */}
                          <Progress 
                            value={percentageUsed} 
                            className="w-full h-2.5" 
                            aria-label={`Espace utilisé pour le message ${percentageUsed.toFixed(1)}%`}
                          />
                        </div>
                        {messageBytes > 0 && capacityInfo.capacityBytes > 0 && (
                          <p className={cn(
                            "text-xs text-center mt-2",
                            messageBytes > capacityInfo.capacityBytes ? "text-red-500" : "text-muted-foreground"
                          )}>
                            Utilisation : {percentageUsed.toFixed(1)}%
                          </p>
                        )}
                        {messageBytes > capacityInfo.capacityBytes && (
                            <p className="text-xs text-red-500 flex items-center justify-center gap-1 mt-1">
                                <AlertCircle size={14} />
                                Le message est trop long.
                            </p>
                        )}
                      </>
                    )}
                     {operationMode === 'extract' && (
                       <p className="mt-1">Capacité stéganographique estimée : {capacityInfo.capacityBytes} octets</p>
                     )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {operationMode === 'embed' && (
          <div className="space-y-2">
            <Label htmlFor="secretMessage" className="text-base">2. Votre Message Secret à Cacher</Label>
            <Textarea
              id="secretMessage"
              value={messageToEmbed}
              onChange={onMessageToEmbedChange}
              placeholder="Saisissez le message que vous souhaitez cacher..."
              rows={5}
              className="text-base"
              aria-label="Saisie du message secret à cacher"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
