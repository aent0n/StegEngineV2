![](https://i.ibb.co/6739X3nZ/steglogo.png)

---

# Steg'Engine

Steg'Engine est une application web moderne de stéganographie, permettant de dissimuler et d'extraire des informations secrètes dans divers types de fichiers. L'application met l'accent sur le traitement côté client pour garantir la confidentialité des données et utilise une interface utilisateur intuitive pour une expérience utilisateur optimale. Un conseiller basé sur l'IA est également disponible pour aider à choisir le meilleur algorithme.

## Fonctionnalités Actuelles

*   **Stéganographie d'Image**
    *   Technique LSB (Least Significant Bit) pour les fichiers PNG.
    *   Technique par Métadonnées (Chunk tEXt) pour les fichiers PNG.
    *   Calcul de capacité et prévisualisation.
*   **Stéganographie Audio**
    *   Technique LSB pour les fichiers WAV (PCM 16 bits).
    *   Technique par Métadonnées (Commentaire INFO) pour les fichiers WAV.
    *   Calcul de capacité.
*   **Stéganographie de Texte**
    *   Technique par Espaces Blancs (fin de ligne) pour les fichiers .txt.
    *   Technique par Caractères de Largeur Nulle (ZWC) pour les fichiers .txt.
    *   Générateur de texte porteur par IA.
    *   Calcul de capacité.
*   **Stéganographie PDF**
    *   Technique par Métadonnées (champ "Sujet" du PDF).
    *   Calcul de capacité estimée.
*   **Traitement par Lots**
    *   Intégration (cacher) et Extraction de messages sur plusieurs fichiers.
    *   Sélection d'algorithmes par type de fichier.
    *   Rapport d'état pour chaque fichier traité.
*   **Conseiller d'Algorithme IA**
    *   Suggère le meilleur algorithme en fonction du type de fichier et de la description du message.
*   **Interface Utilisateur**
    *   Thème Clair / Sombre (avec détection initiale basée sur l'heure locale).
    *   Design responsive pour une utilisation sur différents appareils.
    *   Construite avec des composants ShadCN UI et stylisée avec Tailwind CSS.

## Pile Technologique

*   **Frontend**: Next.js, React, TypeScript
*   **UI**: ShadCN UI, Tailwind CSS
*   **IA Générative**: Genkit (Google AI)
*   **Manipulation PDF**: pdf-lib (côté client)

## Pour Commencer

Pour démarrer l'application en mode développement :

```bash
npm run dev
# ou
yarn dev
```

Cela lancera l'application Next.js, généralement sur `http://localhost:9002`.

Pour le développement avec Genkit (si vous modifiez les flux IA) :

```bash
npm run genkit:watch
# ou
yarn genkit:watch
```

## Structure du Projet (Simplifiée)

*   `src/app/` : Contient les pages principales de l'application (routage App Router).
    *   `page.tsx` : Page d'accueil.
    *   `image-steg/page.tsx` : Outil de stéganographie d'image.
    *   `audio-steg/page.tsx` : Outil de stéganographie audio.
    *   `text-steg/page.tsx` : Outil de stéganographie de texte.
    *   `pdf-steg/page.tsx` : Outil de stéganographie PDF.
    *   `batch-processing/page.tsx` : Outil de traitement par lots.
*   `src/components/` : Contient les composants React réutilisables.
    *   `StegEngine/` : Composants spécifiques à l'application Steg'Engine.
    *   `ui/` : Composants ShadCN UI.
*   `src/lib/` : Contient la logique métier et les fonctions utilitaires.
    *   `steganography.ts` : Logique pour la stéganographie d'image.
    *   `audioSteganography.ts` : Logique pour la stéganographie audio.
    *   `textSteganography.ts` : Logique pour la stéganographie de texte.
    *   `pdfSteganography.ts` : Logique pour la stéganographie PDF.
*   `src/ai/` : Contient les flux et la configuration de Genkit.
*   `src/types/` : Contient les définitions TypeScript.
*   `public/` : Contient les actifs statiques (images, etc.).

## Contributions

Les contributions sont les bienvenues ! Veuillez consulter les problèmes ouverts ou en ouvrir de nouveaux pour discuter des changements majeurs.
