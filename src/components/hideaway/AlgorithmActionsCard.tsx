"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SteganographyAlgorithm } from "@/types";
import { Download, ShieldCheck, Shuffle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AlgorithmActionsCardProps {
  algorithms: SteganographyAlgorithm[];
  selectedAlgorithmId: string | null;
  onAlgorithmChange: (algorithmId: string) => void;
  onEmbed: () => void;
  onExport: () => void;
  isEmbedding: boolean;
  isExporting: boolean;
  isEmbedPossible: boolean;
  isExportPossible: boolean;
  isMessageEmbedded: boolean;
}

export default function AlgorithmActionsCard({
  algorithms,
  selectedAlgorithmId,
  onAlgorithmChange,
  onEmbed,
  onExport,
  isEmbedding,
  isExporting,
  isEmbedPossible,
  isExportPossible,
  isMessageEmbedded,
}: AlgorithmActionsCardProps) {
  const selectedAlgorithm = algorithms.find(algo => algo.id === selectedAlgorithmId);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Algorithme & Actions</CardTitle>
        <CardDescription>Choisissez un algorithme et effectuez des opérations de stéganographie.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="algorithmSelect" className="text-base">3. Sélectionner l'Algorithme</Label>
          <Select value={selectedAlgorithmId || ""} onValueChange={onAlgorithmChange} disabled={algorithms.length === 0}>
            <SelectTrigger id="algorithmSelect" className="text-base" aria-label="Sélectionner l'algorithme de stéganographie">
              <SelectValue placeholder="Sélectionner un algorithme" />
            </SelectTrigger>
            <SelectContent>
              {algorithms.length > 0 ? (
                algorithms.map((algo) => (
                  <SelectItem key={algo.id} value={algo.id} className="text-base">
                    {algo.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="loading" disabled>Chargement des algorithmes...</SelectItem>
              )}
            </SelectContent>
          </Select>
          {selectedAlgorithm && (
            <p className="text-sm text-muted-foreground mt-2 p-2 bg-secondary/30 rounded-md">
              {selectedAlgorithm.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={onEmbed}
            disabled={!isEmbedPossible || isEmbedding || isMessageEmbedded}
            size="lg"
            className="w-full text-base"
            aria-label="Intégrer le message dans le fichier"
          >
            {isEmbedding ? (
              <><Skeleton className="w-4 h-4 mr-2 rounded-full animate-spin" /> Intégration...</>
            ) : isMessageEmbedded ? (
              <><ShieldCheck className="mr-2 h-5 w-5" /> Intégré</>
            ) : (
              <><Shuffle className="mr-2 h-5 w-5" /> Intégrer le Message</>
            )}
          </Button>
          <Button
            onClick={onExport}
            disabled={!isExportPossible || isExporting}
            variant="outline"
            size="lg"
            className="w-full text-base"
            aria-label="Exporter le fichier stéganographié"
          >
            {isExporting ? (
              <><Skeleton className="w-4 h-4 mr-2 rounded-full animate-spin" /> Exportation...</>
            ) : (
              <><Download className="mr-2 h-5 w-5" /> Exporter le Fichier</>
            )}
          </Button>
        </div>
        {isMessageEmbedded && !isExporting && (
          <p className="text-sm text-center text-green-600 dark:text-green-400 font-medium">
            Message intégré avec succès ! Vous pouvez maintenant exporter le fichier.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
