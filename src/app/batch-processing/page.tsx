
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BatchProcessingPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">Outil de Traitement par Lots</h1>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Fonctionnalité à Venir</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            La fonctionnalité de traitement par lots pour la stéganographie sera bientôt disponible.
            Elle vous permettra de traiter plusieurs fichiers simultanément.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
