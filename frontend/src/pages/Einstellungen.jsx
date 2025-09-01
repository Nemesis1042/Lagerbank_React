
import React, { useState, useEffect } from 'react';
import { AppSettings, Transaction, Participant } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert, ShieldCheck } from 'lucide-react';
import { AdminProtectedRoute } from '../components/ProtectedRoute';
import { useToast } from "@/components/ui/use-toast";

import { DataBackup } from '../components/DataBackup';

function SettingsContent() {
  const [settings, setSettings] = useState({ camp_name: '', currency_symbol: '', admin_password: '' });
  const [settingsId, setSettingsId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    let appSettings = await AppSettings.list();
    if (appSettings.length === 0) {
      // Erstelle Standardeinstellungen, falls keine vorhanden sind
      const newSettings = await AppSettings.create({
        camp_name: 'Zeltlager-Kasse',
        currency_symbol: '€',
        admin_password: '1' // Passwort für den Tab-Wechsel, hier nur als Fallback
      });
      setSettings(newSettings);
      setSettingsId(newSettings.id);
    } else {
      setSettings(appSettings[0]);
      setSettingsId(appSettings[0].id);
    }
    setIsLoading(false);
  };
  
  const handleSave = async () => {
    if (settingsId) {
      await AppSettings.update(settingsId, settings);
      toast({ title: "Erfolg", description: "Einstellungen erfolgreich gespeichert!" });
      // Optional: Seite neu laden, um Layout-Änderungen zu sehen
      setTimeout(() => window.location.reload(), 1000);
    }
  };
  
  const handleResetTransactions = async () => {
    const allTransactions = await Transaction.list();
    for(const t of allTransactions) {
      await Transaction.delete(t.id);
    }
    toast({ title: "Erfolg", description: "Alle Transaktionen wurden zurückgesetzt." });
  };

  const handleResetBalances = async () => {
    const allParticipants = await Participant.list();
    for(const p of allParticipants) {
      await Participant.update(p.id, { balance: p.initial_balance });
    }
    toast({ title: "Erfolg", description: "Alle Kontostände wurden zurückgesetzt." });
  };

  const handleDeleteAllParticipants = async () => {
    toast({ title: "Lösche alle Teilnehmer...", description: "Dieser Vorgang kann einen Moment dauern." });
    try {
      const allParticipants = await Participant.list();
      if (allParticipants.length === 0) {
        toast({ title: "Keine Aktion nötig", description: "Es sind keine Teilnehmer zum Löschen vorhanden." });
        return;
      }
      // Use Promise.all to delete all participants concurrently for better performance
      await Promise.all(allParticipants.map(p => Participant.delete(p.id)));
      toast({ title: "Erfolg!", description: `Alle ${allParticipants.length} Teilnehmer wurden gelöscht.` });
    } catch (error) {
      console.error("Fehler beim Löschen aller Teilnehmer:", error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Ein Fehler ist aufgetreten. Die Teilnehmer konnten nicht gelöscht werden."
      });
    }
  };

  if (isLoading) {
    return <p>Einstellungen werden geladen...</p>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Einstellungen</h1>
      
      {/* The successMessage Alert component is removed as toast notifications are now used */}

      <Card className="content-card">
        <CardHeader>
          <CardTitle>Allgemeine Einstellungen</CardTitle>
          <CardDescription>Hier können Sie die grundlegenden Einstellungen Ihrer Kassen-App anpassen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="camp_name">Name des Zeltlagers</Label>
            <Input 
              id="camp_name" 
              value={settings.camp_name}
              onChange={(e) => setSettings({ ...settings, camp_name: e.target.value })}
              className="themed-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency_symbol">Währungssymbol</Label>
            <Input 
              id="currency_symbol" 
              value={settings.currency_symbol}
              onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
              className="themed-input w-24"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin_password">Admin-Passwort (für Tab-Wechsel)</Label>
            <Input 
              id="admin_password" 
              type="password"
              value={settings.admin_password}
              onChange={(e) => setSettings({ ...settings, admin_password: e.target.value })}
              className="themed-input"
            />
             <p className="text-xs text-gray-500">Dieses Passwort schützt den Wechsel in den Admin-Bereich.</p>
          </div>
        </CardContent>
        <CardFooter className="p-6 pt-0">
          <Button onClick={handleSave} className="primary-btn">Einstellungen speichern</Button>
        </CardFooter>
      </Card>

      {/* Backup-Sektion */}
      <DataBackup />

      <Card className="border-destructive content-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert />
            Gefahrenzone
          </CardTitle>
          <CardDescription>Diese Aktionen sind endgültig und können nicht rückgängig gemacht werden.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 border rounded-md">
                <div>
                    <h3 className="font-semibold">Transaktionen zurücksetzen</h3>
                    <p className="text-sm text-gray-500">Löscht alle Verkaufstransaktionen. Nützlich für den Start eines neuen Tages.</p>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">Transaktionen zurücksetzen</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                            <AlertDialogDescription>Diese Aktion löscht alle bisherigen Verkäufe endgültig.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={handleResetTransactions}>Ja, zurücksetzen</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            <div className="flex justify-between items-center p-4 border rounded-md">
                <div>
                    <h3 className="font-semibold">Kontostände zurücksetzen</h3>
                    <p className="text-sm text-gray-500">Setzt das Guthaben aller Teilnehmer auf ihr ursprüngliches Startguthaben zurück.</p>
                </div>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">Kontostände zurücksetzen</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
                            <AlertDialogDescription>Alle Aufladungen und Ausgaben werden verworfen. Die Kontostände werden auf den initial eingezahlten Betrag zurückgesetzt.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={handleResetBalances}>Ja, zurücksetzen</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            
            <div className="flex justify-between items-center p-4 border rounded-md">
                <div>
                    <h3 className="font-semibold">Alle Teilnehmer löschen</h3>
                    <p className="text-sm text-gray-500">Löscht alle Teilnehmer und Mitarbeiter aus der gesamten Datenbank.</p>
                </div>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">Alle Teilnehmer löschen</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Sind Sie absolut sicher?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Diese Aktion löscht unwiderruflich ALLE Teilnehmer- und Mitarbeiterdaten. Dies kann nicht rückgängig gemacht werden.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAllParticipants}>Ja, alle löschen</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}


export default function EinstellungenPage() {
  return <SettingsContent />;
}
