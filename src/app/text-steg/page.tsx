
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TextStegPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">Outil de Stéganographie de Texte</h1>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Fonctionnalité à Venir</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            L'outil de stéganographie de texte est en cours de préparation. Bientôt, vous pourrez
            dissimuler discrètement vos informations dans des documents textuels.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
