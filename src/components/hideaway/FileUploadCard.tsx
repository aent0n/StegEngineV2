"use client";

import type React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, FileText, Image as ImageIcon, Music, Video, FileQuestion } from "lucide-react";
import Image from "next/image";

interface FileUploadCardProps {
  carrierFile: File | null;
  fileName: string | null;
  filePreviewUrl: string | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  message: string;
  onMessageChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const FileIcon = ({ fileType }: { fileType: string | null }) => {
  if (!fileType) return <FileQuestion className="w-16 h-16 text-muted-foreground" />;
  if (fileType.startsWith("image/")) return <ImageIcon className="w-16 h-16 text-muted-foreground" />;
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
  message,
  onMessageChange,
}: FileUploadCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="text-xl">Fichier Porteur & Message Secret</CardTitle>
        <CardDescription>Téléchargez le fichier dans lequel cacher votre message, et saisissez votre message secret.</CardDescription>
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
            Types supportés : Images, Audio, Vidéo, Texte, PDF.
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
                <FileIcon fileType={carrierFile?.type || null} />
              )}
              <div>
                <p className="font-medium text-secondary-foreground">{fileName}</p>
                {carrierFile && <p className="text-xs text-muted-foreground">Type: {carrierFile.type}, Taille: {(carrierFile.size / 1024).toFixed(2)} KB</p>}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="secretMessage" className="text-base">2. Votre Message Secret</Label>
          <Textarea
            id="secretMessage"
            value={message}
            onChange={onMessageChange}
            placeholder="Saisissez le message que vous souhaitez cacher..."
            rows={5}
            className="text-base"
            aria-label="Saisie du message secret"
          />
        </div>
      </CardContent>
    </Card>
  );
}
