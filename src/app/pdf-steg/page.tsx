
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PdfStegPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">Outil de Stéganographie PDF</h1>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Fonctionnalité à Venir</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            L'outil de stéganographie pour les fichiers PDF est en construction. Nous travaillons pour vous permettre
            de cacher des données au sein de vos documents PDF.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
