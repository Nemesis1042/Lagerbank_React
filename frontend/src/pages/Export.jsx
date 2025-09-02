import React, { useState, useEffect } from 'react';
import { Participant } from '@/api/entities';
import { Product } from '@/api/entities';
import { Transaction } from '@/api/entities';
import { AppSettings } from '@/api/entities';
import { Camp } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, FileText, Users, Package, Receipt, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/components/ui/use-toast";

function ExportContent() {
  const [camps, setCamps] = useState([]);
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [activeCamp, setActiveCamp] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const settings = await AppSettings.list();
        if (!isMounted) return;

        if (settings.length > 0 && settings[0].active_camp_id) {
          const campsData = await Camp.list();
          if (!isMounted) return;
          setCamps(campsData);
          const activeCampData = campsData.find(c => c.id === settings[0].active_camp_id);
          if (isMounted) {
            setActiveCamp(activeCampData);
            setSelectedCamp(activeCampData?.id);
          }
        }
      } catch (error) {
        if (isMounted) console.error('Fehler beim Laden der Export-Daten:', error);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const downloadCSV = (data, filename) => {
    const csv = data.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const exportParticipants = async () => {
    if (!selectedCamp) return;
    setIsExporting(true);
    
    try {
      const participants = await Participant.filter({ camp_id: selectedCamp });
      const csvData = [
        'TN-Nr,Name,Barcode-ID,Aktuelles Guthaben,Startguthaben,Typ,Eingecheckt',
        ...participants.map(p => 
          `${p.tn_id || ''},${p.name},"${p.barcode_id}",${(Number(p.balance) || 0).toFixed(2)},${(Number(p.initial_balance) || 0).toFixed(2)},${p.is_staff ? 'Mitarbeiter' : 'Teilnehmer'},${p.is_checked_in ? 'Ja' : 'Nein'}`
        )
      ];
      
      const camp = camps.find(c => c.id === selectedCamp);
      downloadCSV(csvData, `Teilnehmer_${camp?.name || 'Export'}_${new Date().toISOString().split('T')[0]}.csv`);
      toast({ title: "Erfolg", description: "Teilnehmer erfolgreich exportiert!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Fehler", description: "Fehler beim Exportieren der Teilnehmer." });
    }
    
    setIsExporting(false);
  };

  const exportTransactions = async () => {
    if (!selectedCamp) return;
    setIsExporting(true);
    
    try {
      const transactions = await Transaction.filter({ camp_id: selectedCamp });
      const csvData = [
        'Datum,Teilnehmer,Produkt,Menge,Einzelpreis,Gesamtpreis,Typ',
        ...transactions.map(t => {
          const date = new Date(t.created_at).toLocaleDateString('de-DE');
          const unitPrice = t.quantity > 0 ? Math.abs(t.total_price) / t.quantity : 0;
          const type = t.total_price < 0 ? 'Einzahlung' : 'Kauf';
          return `${date},"${t.participant_name}","${t.product_name}",${t.quantity},${unitPrice.toFixed(2)},${Math.abs(t.total_price).toFixed(2)},${type}`;
        })
      ];
      
      const camp = camps.find(c => c.id === selectedCamp);
      downloadCSV(csvData, `Transaktionen_${camp?.name || 'Export'}_${new Date().toISOString().split('T')[0]}.csv`);
      toast({ title: "Erfolg", description: "Transaktionen erfolgreich exportiert!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Fehler", description: "Fehler beim Exportieren der Transaktionen." });
    }
    
    setIsExporting(false);
  };

  const exportFullReport = async () => {
    if (!selectedCamp) return;
    setIsExporting(true);
    
    try {
      const participants = await Participant.filter({ camp_id: selectedCamp });
      const transactions = await Transaction.filter({ camp_id: selectedCamp });
      
      // Berechne Statistiken für jeden Teilnehmer
      const reportData = participants.map(p => {
        const participantTransactions = transactions.filter(t => t.participant_id === p.id);
        const purchases = participantTransactions.filter(t => t.total_price > 0);
        const deposits = participantTransactions.filter(t => t.total_price < 0);
        
        const totalSpent = purchases.reduce((sum, t) => sum + t.total_price, 0);
        const totalDeposited = Math.abs(deposits.reduce((sum, t) => sum + t.total_price, 0));
        const refundAmount = totalDeposited - totalSpent;
        
        return `${p.tn_id || ''},"${p.name}","${p.barcode_id}",${totalDeposited.toFixed(2)},${totalSpent.toFixed(2)},${refundAmount.toFixed(2)},${p.is_staff ? 'Mitarbeiter' : 'Teilnehmer'},${p.is_checked_in ? 'Eingecheckt' : 'Ausgecheckt'}`;
      });

      const csvData = [
        'TN-Nr,Name,Barcode-ID,Eingezahlt,Ausgegeben,Restguthaben,Typ,Status',
        ...reportData
      ];
      
      const camp = camps.find(c => c.id === selectedCamp);
      downloadCSV(csvData, `Gesamtbericht_${camp?.name || 'Export'}_${new Date().toISOString().split('T')[0]}.csv`);
      toast({ title: "Erfolg", description: "Gesamtbericht erfolgreich exportiert!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Fehler", description: "Fehler beim Exportieren des Berichts." });
    }
    
    setIsExporting(false);
  };

  const exportProducts = async () => {
    setIsExporting(true);
    
    try {
      const products = await Product.list();
      const csvData = [
        'Name,Preis,Lagerbestand,Barcode,Symbol',
        ...products.map(p => `"${p.name}",${p.price.toFixed(2)},${p.stock},"${p.barcode || ''}","${p.icon}"`)
      ];
      
      downloadCSV(csvData, `Produkte_${new Date().toISOString().split('T')[0]}.csv`);
      toast({ title: "Erfolg", description: "Produkte erfolgreich exportiert!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Fehler", description: "Fehler beim Exportieren der Produkte." });
    }
    
    setIsExporting(false);
  };

  if (!activeCamp) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Daten exportieren</h1>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Kein aktives Lager</AlertTitle>
          <AlertDescription>
            Es ist kein Lager als aktiv markiert. Bitte gehen Sie zu <strong>Lager-Verwaltung</strong> und aktivieren Sie ein Lager.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Daten exportieren</h1>
        <p className="text-sm opacity-70 mt-1">
          Exportieren Sie alle wichtigen Daten als CSV-Dateien für Excel oder andere Programme.
        </p>
      </div>
      
      <Card className="content-card">
        <CardHeader>
          <CardTitle>Lager auswählen</CardTitle>
          <CardDescription>Wählen Sie das Lager aus, für das Sie Daten exportieren möchten.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedCamp || ''} onValueChange={setSelectedCamp}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Lager wählen..." />
              </SelectTrigger>
              <SelectContent>
                {camps.map(camp => (
                  <SelectItem key={camp.id} value={camp.id}>
                    {camp.name} ({camp.year})
                    {camp.id === activeCamp?.id && <Badge className="ml-2">Aktiv</Badge>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCamp === activeCamp?.id && (
              <Badge className="bg-green-100 text-green-800">Aktuell aktives Lager</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="content-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Teilnehmer-Export
            </CardTitle>
            <CardDescription>
              Alle Teilnehmer mit aktuellen Guthaben und Status.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Button 
              onClick={exportParticipants} 
              disabled={!selectedCamp || isExporting}
              className="w-full primary-btn"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exportiere...' : 'Teilnehmer exportieren'}
            </Button>
          </CardContent>
        </Card>

        <Card className="content-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Transaktionen-Export
            </CardTitle>
            <CardDescription>
              Alle Käufe und Einzahlungen im Detail.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Button 
              onClick={exportTransactions} 
              disabled={!selectedCamp || isExporting}
              className="w-full primary-btn"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exportiere...' : 'Transaktionen exportieren'}
            </Button>
          </CardContent>
        </Card>

        <Card className="content-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Gesamtbericht
            </CardTitle>
            <CardDescription>
              Zusammenfassung mit Endabrechnung aller Teilnehmer.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Button 
              onClick={exportFullReport} 
              disabled={!selectedCamp || isExporting}
              className="w-full primary-btn"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exportiere...' : 'Gesamtbericht exportieren'}
            </Button>
          </CardContent>
        </Card>

        <Card className="content-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produkte-Export
            </CardTitle>
            <CardDescription>
              Alle Produkte mit Preisen und Lagerbeständen.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Button 
              onClick={exportProducts} 
              disabled={isExporting}
              className="w-full primary-btn"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exportiere...' : 'Produkte exportieren'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <FileText className="h-4 w-4" />
        <AlertTitle>Hinweis zum CSV-Format</AlertTitle>
        <AlertDescription>
          Die exportierten CSV-Dateien können in Excel, LibreOffice Calc oder anderen Tabellenkalkulationsprogrammen geöffnet werden. 
          Stellen Sie beim Öffnen sicher, dass das richtige Trennzeichen (Komma) und die Kodierung (UTF-8) gewählt wird.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default function ExportPage() {
  return <ExportContent />;
}
