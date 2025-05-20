
"use client";

import type React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, FileText, Image as ImageIconLucide, Music, Video, FileQuestion } from "lucide-react";
import Image from "next/image";
import type { OperationMode } from '@/types';

interface FileUploadCardProps {
  carrierFile: File | null;
  fileName: string | null;
  filePreviewUrl: string | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  
  messageToEmbed: string;
  onMessageToEmbedChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  
  extractedMessage: string | null;
  operationMode: OperationMode;
}

const FileIconDisplay = ({ fileType }: { fileType: string | null }) => {
  if (!fileType) return <FileQuestion className="w-16 h-16 text-muted-foreground" />;
  if (fileType.startsWith("image/")) return <ImageIconLucide className="w-16 h-16 text-muted-foreground" />;
  if (fileType.startsWith("audio/")) return <Music className="w-16 h-16 text-muted-foreground" />;
  if (fileType.startsWith("video/")) return <Video className="w-16 h-16 text-muted-foreground" />;
  if (fileType.startsWith("text/") || fileType === "application/pdf") return <FileText className="w-16 h-16 text-muted-foreground" />;
  return <FileQuestion className="w-16 h-16 text-muted-foreground" />;
};


export default function FileUploadCard({
  carrierFile,
  fileName,
  filePreviewUrl,
  onFileChange,
  messageToEmbed,
  onMessageToEmbedChange,
  extractedMessage,
  operationMode,
}: FileUploadCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="text-xl">Fichier Porteur {operationMode === 'extract' ? ' & Message Extrait' : '& Message Secret'}</CardTitle>
        <CardDescription>
          {operationMode === 'embed' 
            ? "Téléchargez le fichier pour cacher votre message, et saisissez votre message."
            : "Téléchargez le fichier contenant un message caché pour l'extraire."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="carrierFile" className="text-base">1. Télécharger le Fichier Porteur</Label>
          <Input
            id="carrierFile"
            type="file"
            onChange={onFileChange}
            className="file:text-primary-foreground file:bg-primary hover:file:bg-primary/90 file:rounded-md file:border-0 file:px-3 file:py-2 file:mr-3 cursor-pointer"
            aria-describedby="fileHelp"
          />
          <p id="fileHelp" className="text-sm text-muted-foreground">
            Types supportés pour cet outil : Images (PNG, JPG).
          </p>
          {fileName && (
            <div className="mt-4 p-4 border rounded-lg bg-secondary/50 flex items-center gap-4">
              {filePreviewUrl && carrierFile?.type.startsWith('image/') ? (
                <Image 
                  src={filePreviewUrl} 
                  alt="Aperçu du fichier" 
                  width={64} 
                  height={64} 
                  className="rounded object-cover"
                  data-ai-hint="abstract texture" 
                />
              ) : (
                <FileIconDisplay fileType={carrierFile?.type || null} />
              )}
              <div>
                <p className="font-medium text-secondary-foreground">{fileName}</p>
                {carrierFile && <p className="text-xs text-muted-foreground">Type: {carrierFile.type}, Taille: {(carrierFile.size / 1024).toFixed(2)} KB</p>}
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

        {operationMode === 'extract' && (
          <div className="space-y-2">
            <Label htmlFor="extractedMessageDisplay" className="text-base">2. Message Extrait</Label>
            {extractedMessage !== null ? (
              <Textarea
                id="extractedMessageDisplay"
                value={extractedMessage}
                readOnly
                rows={5}
                className="text-base bg-muted/50"
                aria-label="Message extrait"
                placeholder="Aucun message extrait pour le moment."
              />
            ) : (
              <div 
                id="extractedMessageDisplay"
                className="p-4 border rounded-lg bg-muted/50 min-h-[100px] text-muted-foreground flex items-center justify-center text-sm"
                aria-label="Message extrait"
              >
                Le message extrait apparaîtra ici...
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
