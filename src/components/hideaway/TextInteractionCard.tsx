
"use client";

import type React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, FileText } from "lucide-react";
import type { OperationMode, CapacityInfo } from '@/types';

interface TextInteractionCardProps {
  coverText: string;
  onCoverTextChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  
  messageToEmbed: string;
  onMessageToEmbedChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  
  stegoText: string | null; // Used to display stego text after embedding
  
  operationMode: OperationMode;
  capacityInfo: CapacityInfo | null;
  statusMessage?: { type: 'success' | 'error' | 'info', text: string } | null; // Optional status message
}

export default function TextInteractionCard({
  coverText,
  onCoverTextChange,
  messageToEmbed,
  onMessageToEmbedChange,
  stegoText,
  operationMode,
  capacityInfo,
  statusMessage,
}: TextInteractionCardProps) {
  
  const messageBytes = operationMode === 'embed' && messageToEmbed ? new TextEncoder().encode(messageToEmbed).length : 0;
  const percentageUsed = capacityInfo && capacityInfo.capacityBytes > 0 && !capacityInfo.isEstimate
    ? Math.min(100, Math.max(0, (messageBytes / capacityInfo.capacityBytes) * 100)) 
    : 0;

  const displayCapacityInfo = capacityInfo; // Always display if available
  const showProgressBar = operationMode === 'embed' && capacityInfo && !capacityInfo.isEstimate && capacityInfo.capacityBytes > 0;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">
          {operationMode === 'embed' ? 'Texte Porteur & Message Secret' : 'Texte Stéganographié'}
        </CardTitle>
        <CardDescription>
          {operationMode === 'embed' 
            ? "Saisissez le texte porteur et le message à cacher."
            : "Saisissez le texte contenant un message caché pour l'extraire."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Textarea for Cover Text (Embed mode) or Stego Text (Extract mode) */}
        <div className="space-y-2">
          <Label htmlFor="coverOrStegoText" className="text-base">
            {operationMode === 'embed' ? '1. Texte Porteur' : '1. Texte Stéganographié à Analyser'}
          </Label>
          <Textarea
            id="coverOrStegoText"
            value={operationMode === 'embed' ? coverText : stegoText || coverText} // In extract mode, user pastes stego text here
            onChange={onCoverTextChange} // This will update coverText, which is used as stego input in extract mode
            placeholder={operationMode === 'embed' ? "Collez votre texte porteur ici..." : "Collez le texte stéganographié ici..."}
            rows={8}
            className="text-base"
            aria-label={operationMode === 'embed' ? 'Texte porteur' : 'Texte stéganographié'}
          />
          {capacityInfo && displayCapacityInfo && (
            <div className="mt-2 p-3 border rounded-lg bg-secondary/50 text-sm w-full">
              <div className="font-medium text-secondary-foreground flex items-center gap-2">
                <FileText size={16}/> Informations sur le Texte
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Nombre de lignes : {coverText.split('\n').length}
              </p>
              {operationMode === 'embed' && (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Message : {messageBytes} octets / 
                    {capacityInfo.isEstimate ? " Capacité estimée" : " Capacité max"} : {capacityInfo.capacityBytes} octets
                  </p>
                  {showProgressBar && (
                    <div className="w-full mt-1 relative">
                      <Progress 
                        value={percentageUsed} 
                        className="w-full h-2.5" 
                        aria-label={`Espace utilisé pour le message ${percentageUsed.toFixed(1)}%`}
                      />
                      <p className="text-xs text-center mt-1">
                        Utilisation : {percentageUsed.toFixed(1)}%
                      </p>
                    </div>
                  )}
                  {messageBytes > 0 && capacityInfo.capacityBytes > 0 && messageBytes > capacityInfo.capacityBytes && !capacityInfo.isEstimate && (
                      <p className="text-xs text-red-500 flex items-center justify-center gap-1 mt-1">
                          <AlertCircle size={14} />
                          Le message est trop long.
                      </p>
                  )}
                </>
              )}
               {operationMode === 'extract' && (
                 <p className="mt-1 text-xs text-muted-foreground">
                   {capacityInfo.isEstimate ? "Capacité stéganographique estimée" : "Capacité stéganographique calculée"} : {capacityInfo.capacityBytes} octets
                 </p>
               )}
            </div>
          )}
        </div>

        {/* Textarea for Secret Message (Embed mode only) */}
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

        {/* Display Area for Stego Text (Embed mode, after embedding) */}
        {operationMode === 'embed' && stegoText && (
          <div className="space-y-2">
            <Label htmlFor="stegoResultText" className="text-base">Texte Stéganographié Résultant :</Label>
            <Textarea
              id="stegoResultText"
              value={stegoText}
              readOnly
              rows={8}
              className="text-base bg-muted/50"
              aria-label="Texte stéganographié résultant"
            />
          </div>
        )}
         {statusMessage && (
          <p className={`text-sm font-medium ${
            statusMessage.type === 'success' ? 'text-green-600 dark:text-green-400' :
            statusMessage.type === 'error' ? 'text-red-600 dark:text-red-400' :
            'text-blue-600 dark:text-blue-400' 
          } text-center`}>
            {statusMessage.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
