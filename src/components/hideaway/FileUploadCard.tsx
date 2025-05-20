
"use client";

import type React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileQuestion, Image as ImageIconLucide, Music, Video, FileText as FileTextIcon, AlertCircle } from "lucide-react"; // Renamed FileText to avoid conflict
import Image from "next/image";
import type { OperationMode, CapacityInfo } from '@/types';

interface FileUploadCardProps {
  carrierFile: File | null;
  fileName: string | null;
  filePreviewUrl: string | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  
  messageToEmbed: string;
  onMessageToEmbedChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  
  operationMode: OperationMode;
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
  supportedFileTypesMessage = "Types supportés pour cet outil : Images (PNG, JPG).",
  capacityInfo,
}: FileUploadCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="text-xl">Fichier Porteur {operationMode === 'embed' ? '& Message Secret' : ''}</CardTitle>
        <CardDescription>
          {operationMode === 'embed' 
            ? "Téléchargez le fichier PNG pour cacher votre message, et saisissez votre message."
            : "Téléchargez le fichier PNG contenant un message caché pour l'extraire."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="carrierFile" className="text-base">1. Télécharger le Fichier Porteur (PNG)</Label>
          <Input
            id="carrierFile"
            type="file"
            accept="image/png"
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
                  data-ai-hint="uploaded image"
                />
              ) : (
                <FileIconDisplay fileType={carrierFile?.type || null} />
              )}
              <div className="text-sm">
                <p className="font-medium text-secondary-foreground">{fileName}</p>
                {carrierFile && <p className="text-xs text-muted-foreground">Type: {carrierFile.type}, Taille: {(carrierFile.size / 1024).toFixed(2)} KB</p>}
                {capacityInfo && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Dimensions: {capacityInfo.width}x{capacityInfo.height}px, Capacité max: {capacityInfo.capacityBytes} octets
                  </p>
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
            {capacityInfo && messageToEmbed && (
                 (messageToEmbed.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join('').length / 8 > capacityInfo.capacityBytes) && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={14} />
                        Le message est trop long pour la capacité de l'image.
                    </p>
                )
            )}
          </div>
        )}

        {/* The extracted message display is now removed from this card and handled in AlgorithmActionsCard */}
      </CardContent>
    </Card>
  );
}

    