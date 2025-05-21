// Résumé du fichier : Fonctions utilitaires pour l'application, comme `cn` pour fusionner les classes Tailwind.
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
