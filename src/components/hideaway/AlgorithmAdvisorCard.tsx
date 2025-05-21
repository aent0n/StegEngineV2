// File overview: Component that provides an AI-powered steganography algorithm advisor.
// Users input file type and message description to get a suggestion.
"use client";

import type React from 'react';
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wand2, Sparkles, Loader2 } from "lucide-react";
import type { AlgorithmAdvisorInput, AlgorithmAdvisorOutput } from "@/ai/flows/algorithm-advisor";
import { suggestAlgorithm as getAiSuggestion } from "@/ai/flows/algorithm-advisor";
import { useToast } from "@/hooks/use-toast";
import { fileTypeOptions, type FileTypeOption, mockAlgorithms } from "@/types";


const advisorSchema = z.object({
  fileType: z.enum(['image', 'audio', 'text', 'pdf'], { // Removed 'video'
    required_error: "Le type de fichier est requis.",
  }),
  message: z.string().min(1, "Le message ne peut pas être vide.").max(500, "Message trop long (max 500 caractères)."),
});

type AdvisorFormValues = z.infer<typeof advisorSchema>;

interface AlgorithmAdvisorCardProps {
  onSuggestion: (suggestion: AlgorithmAdvisorOutput) => void;
}

export default function AlgorithmAdvisorCard({ onSuggestion }: AlgorithmAdvisorCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AlgorithmAdvisorOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<AdvisorFormValues>({
    resolver: zodResolver(advisorSchema),
    defaultValues: {
      fileType: undefined,
      message: "",
    },
  });

  const onSubmit: SubmitHandler<AdvisorFormValues> = async (data) => {
    setIsLoading(true);
    setSuggestion(null);
    try {
      const algorithmNames = mockAlgorithms.map(algo => algo.name);
      const advisorInput: AlgorithmAdvisorInput = {
        fileType: data.fileType,
        message: data.message,
        availableAlgorithms: algorithmNames,
      };
      const result = await getAiSuggestion(advisorInput);
      setSuggestion(result);
      onSuggestion(result); 
      toast({
        title: "Suggestion IA Reçue",
        description: `Algorithme : ${result.algorithm}`,
      });
    } catch (error) {
      console.error("Erreur lors de la récupération de la suggestion IA :", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Échec de la récupération de la suggestion IA. Veuillez réessayer.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2"><Wand2 className="text-accent" /> Conseiller d'Algorithme IA</CardTitle>
        <CardDescription>Laissez notre IA suggérer le meilleur algorithme pour vos besoins en fonction du type de fichier et du contenu du message, parmi ceux disponibles dans l'outil.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="fileType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Type de Fichier</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger aria-label="Sélectionner le type de fichier pour le conseiller IA">
                        <SelectValue placeholder="Sélectionnez le type de votre fichier porteur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fileTypeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Contenu du Message (ou similaire)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez brièvement votre message ou collez un court extrait."
                      {...field}
                      rows={3}
                      disabled={isLoading}
                      aria-label="Contenu du message pour le conseiller IA"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            <Button type="submit" disabled={isLoading} className="w-full text-base" size="lg">
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-5 w-5" />
              )}
              Obtenir une Suggestion
            </Button>
            {suggestion && !isLoading && (
              <Alert variant="default" className="bg-secondary/30 border-secondary/60">
                <Sparkles className="h-5 w-5 text-primary" />
                <AlertTitle className="font-semibold text-foreground">Suggestion IA :</AlertTitle>
                <AlertDescription className="text-foreground space-y-1">
                  <p><strong>Algorithme :</strong> {suggestion.algorithm}</p>
                  <p><strong>Justification :</strong> {suggestion.rationale}</p>
                </AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
