"use client";

import type React from 'react';
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input"; // Textarea is already in FileUploadCard
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wand2, Sparkles, Loader2 } from "lucide-react";
import type { AlgorithmAdvisorInput, AlgorithmAdvisorOutput } from "@/ai/flows/algorithm-advisor";
import { suggestAlgorithm as getAiSuggestion } from "@/ai/flows/algorithm-advisor";
import { useToast } from "@/hooks/use-toast";
import { fileTypeOptions, type FileTypeOption } from "@/types";


const advisorSchema = z.object({
  fileType: z.enum(['image', 'audio', 'text', 'pdf', 'video'], {
    required_error: "File type is required.",
  }),
  message: z.string().min(1, "Message cannot be empty.").max(500, "Message is too long (max 500 chars)."),
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
      const advisorInput: AlgorithmAdvisorInput = {
        fileType: data.fileType,
        message: data.message,
      };
      const result = await getAiSuggestion(advisorInput);
      setSuggestion(result);
      onSuggestion(result); // Pass suggestion to parent
      toast({
        title: "AI Suggestion Received",
        description: `Algorithm: ${result.algorithm}`,
      });
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get AI suggestion. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2"><Wand2 className="text-accent" /> AI Algorithm Advisor</CardTitle>
        <CardDescription>Let our AI suggest the best algorithm for your needs based on file type and message content.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="fileType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">File Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger aria-label="Select file type for AI advisor">
                        <SelectValue placeholder="Select the type of your carrier file" />
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
                  <FormLabel className="text-base">Message Content (or similar)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Briefly describe your message or paste a short snippet."
                      {...field}
                      rows={3}
                      disabled={isLoading}
                      aria-label="Message content for AI advisor"
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
              Get Suggestion
            </Button>
            {suggestion && !isLoading && (
              <Alert variant="default" className="bg-accent/10 border-accent/50">
                <Sparkles className="h-5 w-5 text-accent" />
                <AlertTitle className="font-semibold text-accent-foreground">AI Suggestion:</AlertTitle>
                <AlertDescription className="text-accent-foreground/90 space-y-1">
                  <p><strong>Algorithm:</strong> {suggestion.algorithm}</p>
                  <p><strong>Rationale:</strong> {suggestion.rationale}</p>
                </AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
