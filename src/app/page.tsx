
"use client";

import Image from "next/image";
import Link from "next/link";
import WhyChooseUsSection from "@/components/hideaway/WhyChooseUsSection";
import AlgorithmAdvisorCard from "@/components/hideaway/AlgorithmAdvisorCard";
import type { AlgorithmAdvisorOutput } from '@/ai/flows/algorithm-advisor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, Music, FileText, FileQuestion as PdfIconLucide, Layers, ArrowRight } from "lucide-react"; // Renamed FileQuestion to PdfIconLucide

const tools = [
  {
    name: "Stéganographie d'Image",
    description: "Cachez des messages dans des fichiers image (PNG).",
    icon: <ImageIcon className="w-10 h-10 text-primary" />,
    href: "/image-steg",
    status: "available",
  },
  {
    name: "Stéganographie Audio",
    description: "Intégrez des données dans des fichiers audio (WAV).",
    icon: <Music className="w-10 h-10 text-primary" />,
    href: "/audio-steg",
    status: "available", 
  },
  {
    name: "Stéganographie de Texte",
    description: "Dissimulez des messages dans des fichiers texte.",
    icon: <FileText className="w-10 h-10 text-primary" />,
    href: "/text-steg",
    status: "available", 
  },
  {
    name: "Stéganographie PDF",
    description: "Cachez des informations dans les métadonnées de documents PDF (champ Sujet).", // Updated description
    icon: <PdfIconLucide className="w-10 h-10 text-primary" />, // Using renamed import
    href: "/pdf-steg",
    status: "available", 
  },
  {
    name: "Traitement par Lots",
    description: "Traitez plusieurs fichiers à la fois.",
    icon: <Layers className="w-10 h-10 text-primary" />,
    href: "/batch-processing",
    status: "available", 
  },
];

export default function HomePage() {
  const handleAiSuggestionHomepage = (suggestion: AlgorithmAdvisorOutput) => {
    // Placeholder for homepage specific action if needed, for now, toast is handled by the card
    console.log("AI Suggestion on homepage:", suggestion);
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-center text-center md:text-left mb-8 md:mb-12 gap-6 md:gap-8 py-8">
        <div className="flex-shrink-0 mx-auto md:mx-0">
          <Image
            src="/stegengine_hero.svg" 
            alt="Logo Steg'Engine Hero"
            width={256} 
            height={256}
            className="h-40 w-40 md:h-56 md:w-56 lg:h-64 lg:w-64 object-contain"
            data-ai-hint="owl shield logo"
            priority
            onError={(e) => {
              (e.target as HTMLImageElement).onerror = null; 
              (e.target as HTMLImageElement).src = 'https://i.ibb.co/6739X3nZ/steglogo.png'; 
            }}
          />
        </div>
        <div className="flex-grow">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Bienvenue sur Steg'Engine
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto md:mx-0">
             Steg'Engine est une application web moderne de stéganographie, permettant de dissimuler des informations dans différents types de fichiers (images PNG, audio WAV, textes TXT, et PDF). L'application combine une interface utilisateur intuitive avec des algorithmes de stéganographie côté client pour un traitement sécurisé des données directement dans votre navigateur.
          </p>
        </div>
      </div>

      {/* AI Algorithm Advisor Section */}
      <section className="py-8">
        <h2 className="text-3xl font-bold text-center text-foreground mb-10">Conseiller d'Algorithme IA</h2>
        <div className="max-w-2xl mx-auto">
          <AlgorithmAdvisorCard onSuggestion={handleAiSuggestionHomepage} />
        </div>
      </section>
      

      {/* Tools Grid Section */}
      <section className="py-8">
        <h2 className="text-3xl font-bold text-center text-foreground mb-10">Nos Outils</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {tools.map((tool) => (
            <Card key={tool.name} className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
              <CardHeader className="items-center">
                <div className="p-3 rounded-full bg-primary/10 mb-3">
                  {tool.icon}
                </div>
                <CardTitle className="text-xl text-center">{tool.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription className="text-center mb-4">{tool.description}</CardDescription>
              </CardContent>
              <div className="p-6 pt-0 mt-auto">
                {tool.status === "available" ? (
                  <Button asChild className="w-full text-base" size="lg">
                    <Link href={tool.href}>
                      Lancer l'outil <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                ) : (
                  <Button disabled className="w-full text-base" size="lg">
                    À venir
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <WhyChooseUsSection />
    </div>
  );
}
