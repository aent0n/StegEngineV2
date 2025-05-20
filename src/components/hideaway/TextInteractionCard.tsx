
"use client";

import type React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, FileText, Sparkles, Loader2 } from "lucide-react";
import type { OperationMode, CapacityInfo, SteganographyAlgorithm } from '@/types';
import { Button } from '@/components/ui/button';
import { whitespaceTextAlgorithm, zeroWidthCharsTextAlgorithm } from '@/types';


interface TextInteractionCardProps {
  coverText: string; // This will be the primary text area: cover text in embed, stego text in extract
  onCoverTextChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  
  messageToEmbed: string;
  onMessageToEmbedChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  
  stegoText: string | null; 
  
  operationMode: OperationMode;
  capacityInfo: CapacityInfo | null;
  statusMessage?: { type: 'success' | 'error' | 'info', text: string } | null;
  onGenerateAICoverText: (topic?: string) => Promise<void>;
  isGeneratingCoverText?: boolean;
  selectedAlgorithmId: string | null;
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
  onGenerateAICoverText,
  isGeneratingCoverText,
  selectedAlgorithmId,
}: TextInteractionCardProps) {
  
  const messageBytes = operationMode === 'embed' && messageToEmbed ? new TextEncoder().encode(messageToEmbed).length : 0;
  const percentageUsed = capacityInfo && capacityInfo.capacityBytes > 0 && !capacityInfo.isEstimate
    ? Math.min(100, Math.max(0, (messageBytes / capacityInfo.capacityBytes) * 100)) 
    : 0;

  const displayCapacityInfo = capacityInfo; 
  const showProgressBar = operationMode === 'embed' && capacityInfo && !capacityInfo.isEstimate && capacityInfo.capacityBytes > 0;

  const getCapacityDetailsText = () => {
    if (!capacityInfo) return "";
    if (selectedAlgorithmId === whitespaceTextAlgorithm.id) {
      return `(${coverText.split('\n').length} lignes)`;
    } else if (selectedAlgorithmId === zeroWidthCharsTextAlgorithm.id) {
      const cleanTextLength = coverText.replace(new RegExp(`[\u200B\u200C]`, 'g'), '').length;
      return `(${cleanTextLength} caractères porteurs)`;
    }
    return "";
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">
          {operationMode === 'embed' ? 'Texte Porteur & Message Secret' : 'Texte Stéganographié à Analyser'}
        </CardTitle>
        <CardDescription>
          {operationMode === 'embed' 
            ? "Saisissez le texte porteur et le message à cacher. Utilisez l'IA pour générer un texte porteur si besoin."
            : "Saisissez le texte contenant un message caché pour l'extraire."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="space-y-2">
          <Label htmlFor="coverOrStegoText" className="text-base">
            {operationMode === 'embed' ? '1. Texte Porteur' : '1. Texte Stéganographié'}
          </Label>
          <Textarea
            id="coverOrStegoText"
            value={coverText} 
            onChange={onCoverTextChange} 
            placeholder={operationMode === 'embed' ? "Collez votre texte porteur ici ou générez-en un..." : "Collez le texte stéganographié ici..."}
            rows={operationMode === 'embed' ? 8 : 12}
            className="text-base"
            aria-label={operationMode === 'embed' ? 'Texte porteur' : 'Texte stéganographié'}
          />
           {operationMode === 'embed' && (
             <Button 
                onClick={() => onGenerateAICoverText()} 
                disabled={isGeneratingCoverText}
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
            >
                {isGeneratingCoverText ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Génération IA...</>
                ) : (
                    <><Sparkles className="mr-2 h-4 w-4" />Générer Texte Porteur (IA)</>
                )}
             </Button>
           )}
          {capacityInfo && displayCapacityInfo && (
            <div className="mt-2 p-3 border rounded-lg bg-secondary/50 text-sm w-full">
              <div className="font-medium text-secondary-foreground flex items-center gap-2">
                <FileText size={16}/> Informations sur le Texte
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                 {capacityInfo.isEstimate ? "Capacité stéganographique estimée" : "Capacité stéganographique"} : {capacityInfo.capacityBytes} octets {getCapacityDetailsText()}
              </p>
              {operationMode === 'embed' && (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Message : {messageBytes} octets 
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
         {statusMessage && (
          <p className={`text-sm font-medium ${
            statusMessage.type === 'success' ? 'text-green-600 dark:text-green-400' :
            statusMessage.type === 'error' ? 'text-red-600 dark:text-red-400' :
            'text-blue-600 dark:text-blue-400' 
          } text-center pt-2`}>
            {statusMessage.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
    
