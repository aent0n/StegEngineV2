
"use client";

import Image from "next/image";
import Link from "next/link";
import WhyChooseUsSection from "@/components/hideaway/WhyChooseUsSection";
import AlgorithmAdvisorCard from "@/components/hideaway/AlgorithmAdvisorCard";
import type { AlgorithmAdvisorOutput } from '@/ai/flows/algorithm-advisor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageIcon, Music, FileText, FileQuestion, Layers, ArrowRight } from "lucide-react";

const tools = [
  {
    name: "Stéganographie d'Image",
    description: "Cachez des messages dans des fichiers image (PNG).", // JPG retiré car non implémenté
    icon: <ImageIcon className="w-10 h-10 text-primary" />,
    href: "/image-steg",
    status: "available",
  },
  {
    name: "Stéganographie Audio",
    description: "Intégrez des données dans des fichiers audio (WAV).", // Modifié: MP3 retiré
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
    description: "Cachez des informations dans des documents PDF.",
    icon: <FileQuestion className="w-10 h-10 text-primary" />,
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
            width={192}
            height={192}
            className="h-32 w-32 md:h-48 md:w-48 object-contain"
            data-ai-hint="abstract geometric engine"
            onError={(e) => {
              (e.target as HTMLImageElement).onerror = null;
              (e.target as HTMLImageElement).src = 'https://placehold.co/192x192.png';
            }}
          />
        </div>
        <div className="flex-grow">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Bienvenue sur Steg'Engine
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto md:mx-0">
            Votre boîte à outils complète pour les opérations de stéganographie. Choisissez parmi notre variété d'outils
            pour cacher et extraire des données en utilisant différentes techniques.
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
