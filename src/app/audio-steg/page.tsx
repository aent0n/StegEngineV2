
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AudioStegPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">Outil de Stéganographie Audio</h1>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Fonctionnalité à Venir</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            L'outil de stéganographie audio est en cours de développement. Revenez bientôt pour découvrir comment
            cacher des messages secrets dans vos fichiers audio !
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
