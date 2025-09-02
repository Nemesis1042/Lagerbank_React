import { toast } from "@/components/ui/use-toast";

/**
 * Toast-Hilfsfunktionen für die Anwendung
 * 
 * Normale Toasts verschwinden nach 10 Sekunden
 * Error-Toasts verschwinden nach 15 Sekunden
 */

// Erfolgs-Toast (10 Sekunden)
export const showSuccess = (title, description) => {
  return toast.success({
    title,
    description,
  });
};

// Error-Toast (15 Sekunden)
export const showError = (title, description) => {
  return toast.error({
    title,
    description,
  });
};

// Info-Toast (10 Sekunden)
export const showInfo = (title, description) => {
  return toast.info({
    title,
    description,
  });
};

// Beispiele für die Verwendung:
/*
// Erfolg anzeigen
showSuccess("Gespeichert", "Die Daten wurden erfolgreich gespeichert.");

// Fehler anzeigen (bleibt länger sichtbar)
showError("Fehler beim Speichern", "Die Daten konnten nicht gespeichert werden.");

// Info anzeigen
showInfo("Information", "Dies ist eine allgemeine Information.");

// Manueller Toast mit benutzerdefinierten Einstellungen
toast({
  title: "Benutzerdefiniert",
  description: "Dieser Toast hat benutzerdefinierte Einstellungen.",
  variant: "default"
});
*/
