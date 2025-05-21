// Résumé du fichier : Composant affichant la section "Pourquoi nous choisir" sur la page d'accueil,
// mettant en évidence les fonctionnalités clés de l'application Steg'Engine.
"use client";

import { ShieldCheck, Wrench, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: <ShieldCheck className="h-10 w-10 text-primary mb-4" />,
    title: "Sécurisé & Privé",
    description: "Tout le traitement se fait dans votre navigateur. Vos données restent avec vous.",
  },
  {
    icon: <Wrench className="h-10 w-10 text-primary mb-4" />,
    title: "Outils Multiples",
    description: "Suite complète d'outils de stéganographie pour divers besoins.",
  },
  {
    icon: <Users className="h-10 w-10 text-primary mb-4" />,
    title: "Facile à Utiliser",
    description: "Interface simple et intuitive pour les débutants et les experts.",
  },
];

export default function WhyChooseUsSection() {
  return (
    <section className="mt-16 py-8">
      <h2 className="text-3xl font-bold text-center text-foreground mb-12">
        Pourquoi Choisir Steg'Engine ?
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <div key={index} className="text-center flex flex-col items-center p-6 bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow">
            {feature.icon}
            <h3 className="text-xl font-semibold text-card-foreground mb-2">{feature.title}</h3>
            <p className="text-muted-foreground text-sm">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
