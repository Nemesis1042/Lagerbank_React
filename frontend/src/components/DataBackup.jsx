
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, Upload, Database, AlertTriangle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Participant } from '@/api/entities';
import { Product } from '@/api/entities';
import { Transaction } from '@/api/entities';
import { Camp } from '@/api/entities';
import { AppSettings } from '@/api/entities';
import AuditLogger from './AuditLogger';

export function DataBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const exportAllData = async () => {
    setIsExporting(true);
    try {
      const [participants, products, transactions, camps, settings] = await Promise.all([
        Participant.list(),
        Product.list(),
        Transaction.list(),
        Camp.list(),
        AppSettings.list()
      ]);

      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {
          participants,
          products,
          transactions,
          camps,
          settings
        },
        stats: {
          participants: participants.length,
          products: products.length,
          transactions: transactions.length,
          camps: camps.length
        }
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `zeltlager-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      // Log the backup
      const activeCamp = settings.length > 0 ? settings[0].active_camp_id : null;
      await AuditLogger.log('full_backup_created', 'System', null, {
        entities_count: backupData.stats
      }, activeCamp);

      toast({
        title: "Backup erstellt!",
        description: `Vollständiges Backup mit ${backupData.stats.participants + backupData.stats.products + backupData.stats.transactions} Datensätzen heruntergeladen.`
      });
    } catch (error) {
      console.error('Backup-Fehler:', error);
      toast({
        variant: "destructive",
        title: "Backup-Fehler",
        description: "Fehler beim Erstellen des Backups."
      });
    }
    setIsExporting(false);
  };

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const fileContent = await file.text();
      const backupData = JSON.parse(fileContent);

      if (!backupData.data || !backupData.version) {
        throw new Error('Ungültiges Backup-Format');
      }

      // Hole das aktuell aktive Lager für den Fallback
      const settingsList = await AppSettings.list();
      const activeCampId = settingsList.length > 0 ? settingsList[0].active_camp_id : null;
      const campsList = await Camp.list();
      const activeCamp = activeCampId ? campsList.find(c => c.id === activeCampId) : null;

      // Warnung anzeigen
      const confirmed = window.confirm(
        `ACHTUNG: Diese Aktion wird alle aktuellen Daten löschen und durch das Backup ersetzen!\n\n` +
        `Backup-Info:\n` +
        `- Erstellt am: ${new Date(backupData.timestamp).toLocaleString('de-DE')}\n` +
        `- Teilnehmer: ${backupData.stats?.participants || 0}\n` +
        `- Produkte: ${backupData.stats?.products || 0}\n` +
        `- Transaktionen: ${backupData.stats?.transactions || 0}\n\n` +
        `Möchten Sie fortfahren?`
      );

      if (!confirmed) {
        setIsImporting(false);
        return;
      }

      let importedCount = 0;
      let failedCount = 0;

      // Importiere Daten (Reihenfolge ist wichtig)
      if (backupData.data.settings?.length > 0) {
        for (const item of backupData.data.settings) {
          const { id, created_date, updated_date, ...itemData } = item;
          await AppSettings.create(itemData);
          importedCount++;
        }
      }

      if (backupData.data.camps?.length > 0) {
        for (const item of backupData.data.camps) {
          const { id, created_date, updated_date, ...itemData } = item;
          await Camp.create(itemData);
          importedCount++;
        }
      }

      if (backupData.data.products?.length > 0) {
        for (const item of backupData.data.products) {
          const { id, created_date, updated_date, ...itemData } = item;
          await Product.create(itemData);
          importedCount++;
        }
      }

      if (backupData.data.participants?.length > 0) {
        for (const item of backupData.data.participants) {
          const { id, created_date, updated_date, ...itemData } = item;
          
          // Fallback: Wenn camp_id fehlt, verwende das aktive Lager
          if (!itemData.camp_id && activeCamp) {
            itemData.camp_id = activeCamp.id;
            itemData.camp_name = activeCamp.name;
          }
          
          // Wenn immer noch keine camp_id vorhanden ist, überspringe den Datensatz
          if (!itemData.camp_id) {
            console.warn('Überspringe Teilnehmer ohne camp_id:', itemData.name);
            failedCount++;
            continue;
          }

          await Participant.create(itemData);
          importedCount++;
        }
      }

      if (backupData.data.transactions?.length > 0) {
        for (const item of backupData.data.transactions) {
          const { id, created_date, updated_date, ...itemData } = item;
           // Fallback: Wenn camp_id fehlt, verwende das aktive Lager
          if (!itemData.camp_id && activeCamp) {
            itemData.camp_id = activeCamp.id;
            itemData.camp_name = activeCamp.name;
          }

          if (!itemData.camp_id) {
            console.warn('Überspringe Transaktion ohne camp_id:', itemData.product_name);
            failedCount++;
            continue;
          }
          
          await Transaction.create(itemData);
          importedCount++;
        }
      }

      let toastMessage = `${importedCount} Datensätze wurden importiert.`;
      if (failedCount > 0) {
          toastMessage += ` ${failedCount} Datensätze konnten nicht importiert werden (fehlende Lager-ID).`
      }
      toastMessage += ' Seite wird neu geladen...';

      toast({
        title: "Import abgeschlossen!",
        description: toastMessage,
      });

      // Seite nach kurzer Verzögerung neu laden
      setTimeout(() => {
        window.location.reload();
      }, 3000);

    } catch (error) {
      console.error('Import-Fehler:', error);
      toast({
        variant: "destructive",
        title: "Import-Fehler",
        description: error.message || "Fehler beim Importieren der Backup-Datei."
      });
    }
    setIsImporting(false);
    event.target.value = ''; // Reset file input
  };

  return (
    <div className="space-y-6">
      <Card className="content-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Vollständiges Daten-Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Wichtiger Hinweis</AlertTitle>
            <AlertDescription>
              Das Backup enthält alle Teilnehmer, Produkte, Transaktionen, Lager und Einstellungen. 
              Erstellen Sie regelmäßig Backups, besonders vor wichtigen Änderungen.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-4">
            <Button 
              onClick={exportAllData}
              disabled={isExporting}
              className="flex-1 primary-btn"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Erstelle Backup...' : 'Backup herunterladen'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="content-card border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <Upload className="h-5 w-5" />
            Backup wiederherstellen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>⚠️ VORSICHT - Gefährliche Aktion</AlertTitle>
            <AlertDescription>
              Das Wiederherstellen eines Backups löscht ALLE aktuellen Daten unwiderruflich! 
              Verwenden Sie diese Funktion nur, wenn Sie sicher sind, dass Sie alle aktuellen Daten verlieren möchten.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="backup-file">Backup-Datei auswählen</Label>
            <Input
              id="backup-file"
              type="file"
              accept=".json"
              onChange={handleFileImport}
              disabled={isImporting}
              className="mt-2"
            />
          </div>

          {isImporting && (
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                Import läuft... Bitte warten Sie und schließen Sie nicht den Browser.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
