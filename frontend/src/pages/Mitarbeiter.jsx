
import React, { useState, useEffect } from 'react';
import { Participant } from '@/api/entities';
//import { Deposit } from '@/api/entities/Deposit';
import { Transaction } from '@/api/entities'; // Added import for Transaction
import { AppSettings } from '@/api/entities';
import { Camp } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, DollarSign, Users, Search, X, UserCheck, AlertTriangle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
//import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
//import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from "@/components/ui/use-toast";
import { NFCWriter } from '../components/NFCWriter';
import { NFCReader } from '../components/NFCReader'; // Import the NFCReader component

// Hilfsfunktion für saubere Barcode-IDs (gleiche wie in Teilnehmer)
const createBarcodeId = (name) => {
  return name
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '-')  // Leerzeichen zu Bindestrichen
    .replace(/[^a-zA-Z0-9\-]/g, ''); // Nur Buchstaben, Zahlen und Bindestriche
};

function TopUpDialog({ participant, onFinished, activeCamp }) { // Added activeCamp prop
    const [amount, setAmount] = useState(0);
    const { toast } = useToast();

    const handleTopUp = async () => {
        if (amount > 0 && activeCamp) { // Added activeCamp check
            // Update participant balance
            await Participant.update(participant.id, { balance: participant.balance + amount });
            
            // Create a negative transaction (money added, not spent)
            await Transaction.create({
                participant_id: participant.id,
                product_id: 'TOPUP', // Special ID for top-ups
                camp_id: activeCamp.id,
                quantity: 1,
                total_price: -amount, // Negative price = money added
                participant_name: participant.name,
                product_name: 'Guthaben-Aufladung',
                camp_name: activeCamp.name
            });

            toast({ title: "Erfolg", description: `€ ${amount.toFixed(2)} wurden ${participant.name} gutgeschrieben.`});
            onFinished();
        } else {
             toast({ variant: "destructive", title: "Fehler", description: "Betrag muss größer als 0 sein und ein aktives Lager existieren."});
        }
    }

    return (
        <>
            <DialogHeader><DialogTitle>Guthaben aufladen für {participant.name}</DialogTitle></DialogHeader>
            <div className="py-4 space-y-2">
                <p>Aktuelles Guthaben: € {participant.balance.toFixed(2)}</p>
                <Label htmlFor="topup-amount">Betrag zum Aufladen</Label>
                <Input id="topup-amount" type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
            </div>
            <DialogFooter>
                <Button onClick={handleTopUp}>Aufladen</Button>
            </DialogFooter>
        </>
    )
}

function MitarbeiterContent() {
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [topUpStaff, setTopUpStaff] = useState(null);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCamp, setActiveCamp] = useState(null);
  const { toast } = useToast();

  const fetchStaff = async () => {
    try {
      const settings = await AppSettings.list();
      let currentCampId = null;
      let activeCampData = null;

      if (settings.length > 0 && settings[0].active_camp_id) {
        const camps = await Camp.list();
        activeCampData = camps.find(c => c.id === settings[0].active_camp_id);
        currentCampId = settings[0].active_camp_id;
      }
      
      setActiveCamp(activeCampData || null);

      if (!currentCampId) {
        setStaff([]);
        setFilteredStaff([]);
        return;
      }

      const data = await Participant.filter({ 
        is_staff: true,
        camp_id: currentCampId 
      }); 
      data.sort((a, b) => a.name.localeCompare(b.name));
      setStaff(data);
      setFilteredStaff(data);
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeiter:', error);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStaff(staff);
    } else {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const filtered = staff.filter(member => 
        member.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        member.barcode_id.toLowerCase().includes(lowerCaseSearchTerm)
      );
      setFilteredStaff(filtered);
    }
  }, [searchTerm, staff]);

  const onFormFinished = () => {
      fetchStaff();
      setIsFormOpen(false);
      setEditingStaff(null);
      setTopUpStaff(null);
      setIsImportOpen(false);
  }

  const handleDeleteConfirm = async () => {
    if (staffToDelete) {
      await Participant.delete(staffToDelete.id);
      toast({ title: "Erfolg", description: `${staffToDelete.name} wurde gelöscht.`});
      setStaffToDelete(null);
      fetchStaff();
    }
  }

  const clearSearch = () => {
    setSearchTerm('');
  };

  const StaffFormWithCamp = ({ participant, onFinished }) => {
    const [formData, setFormData] = useState(participant || { 
      name: '', 
      barcode_id: '', 
      balance: 0, 
      is_staff: true,
      camp_id: activeCamp?.id,
      camp_name: activeCamp?.name
    });

    // Automatische Barcode-ID Generierung wenn Name geändert wird
    useEffect(() => {
      // Only auto-generate if it's a new participant AND name is present AND barcode_id is currently empty
      if (!participant?.id && formData.name && !formData.barcode_id) {
        setFormData(prev => ({
          ...prev,
          barcode_id: createBarcodeId(prev.name)
        }));
      }
    }, [formData.name, participant?.id, formData.barcode_id]);

    const handleNFCRead = (nfcData) => {
      setFormData({ ...formData, barcode_id: nfcData });
    };

    const handleNameChange = (e) => {
      const name = e.target.value;
      setFormData(prev => {
        // Nur automatische ID-Generierung bei neuen Mitarbeitern
        if (!participant?.id) {
          return {
            ...prev,
            name: name,
            barcode_id: createBarcodeId(name)
          };
        } else {
          return { ...prev, name: name };
        }
      });
    };

    const handleSave = async () => {
      let dataToSave = { ...formData, is_staff: true };
      if (!dataToSave.barcode_id) {
          toast({ variant: "destructive", title: "Fehler", description: "Die ID darf nicht leer sein." });
          return;
      }
      const initialBalance = parseFloat(formData.balance) || 0;
      
      if (!participant?.id) {
          dataToSave.initial_balance = initialBalance;
          dataToSave.balance = initialBalance;
          dataToSave.camp_id = activeCamp?.id;
          dataToSave.camp_name = activeCamp?.name;
      }

      try {
        if (participant?.id) {
          await Participant.update(participant.id, dataToSave);
        } else {
          const newStaff = await Participant.create(dataToSave);
          // Create initial balance as negative transaction (if > 0)
          if (initialBalance > 0 && activeCamp) {
            await Transaction.create({
              participant_id: newStaff.id,
              product_id: 'INITIAL',
              camp_id: activeCamp.id,
              quantity: 1,
              total_price: -initialBalance,
              participant_name: newStaff.name,
              camp_name: activeCamp.name
            });
          }
        }
        toast({ title: "Erfolg", description: "Mitarbeiterdaten gespeichert." });
        onFinished();
      } catch (err) {
        toast({ variant: "destructive", title: "Fehler", description: err.message || "Fehler beim Speichern des Mitarbeiters." });
      }
    };

    return (
      <>
        <DialogHeader>
          <DialogTitle>{participant ? 'Mitarbeiter bearbeiten' : 'Neuen Mitarbeiter anlegen'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Alert>
            <AlertDescription>
              <strong>Lager:</strong> {activeCamp.name}
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input 
              id="name" 
              value={formData.name} 
              onChange={handleNameChange} 
              className="col-span-3 themed-input" 
              placeholder="Vollständiger Name"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="barcode_id" className="text-right">ID</Label>
            <div className="col-span-3 space-y-2">
              <Tabs defaultValue="auto" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="auto">Automatisch</TabsTrigger>
                  <TabsTrigger value="manual">Manuell</TabsTrigger>
                  <TabsTrigger value="nfc">NFC-Chip lesen</TabsTrigger>
                </TabsList>
                <TabsContent value="auto">
                  <Input 
                    id="barcode_id" 
                    value={formData.barcode_id} 
                    onChange={e => setFormData({ ...formData, barcode_id: e.target.value })} 
                    className="themed-input"
                    placeholder="Wird automatisch aus dem Namen generiert"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Automatisch: "{formData.name}" → "{createBarcodeId(formData.name)}"
                  </p>
                </TabsContent>
                <TabsContent value="manual">
                  <Input 
                    id="barcode_id_manual" 
                    value={formData.barcode_id} 
                    onChange={e => setFormData({ ...formData, barcode_id: e.target.value })} 
                    className="themed-input" 
                    placeholder="Eindeutige ID manuell eingeben" 
                  />
                </TabsContent>
                <TabsContent value="nfc">
                  <Input 
                    value={formData.barcode_id} 
                    readOnly 
                    className="themed-input mb-2" 
                    placeholder="ID wird durch NFC-Scan gesetzt" 
                  />
                  <NFCReader onNFCRead={handleNFCRead} placeholder="NFC-Tag für Mitarbeiter-ID lesen..." />
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <div className="text-right"></div>
            <div className="col-span-3">
              <NFCWriter dataToWrite={formData.barcode_id} participantName={formData.name} />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="balance" className="text-right">Startguthaben</Label>
            <Input id="balance" type="number" value={formData.balance} onChange={e => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })} className="col-span-3 themed-input" disabled={!!participant} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} className="primary-btn">Speichern</Button>
        </DialogFooter>
      </>
    );
  };

  const MassImportDialogWithCamp = ({ onFinished }) => {
    const [names, setNames] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleImport = async () => {
      if (!names.trim() || !activeCamp) return;
      setIsLoading(true);
      try {
        const nameList = names.split(';').map(name => name.trim()).filter(Boolean);
        const participantsToCreate = nameList.map(name => ({
          name,
          barcode_id: createBarcodeId(name), // Verwende die neue Funktion
          initial_balance: 0,
          balance: 0,
          is_staff: true,
          camp_id: activeCamp.id,
          camp_name: activeCamp.name
        }));
        if (participantsToCreate.length > 0) {
          await Participant.bulkCreate(participantsToCreate);
          toast({ title: "Erfolg", description: `${participantsToCreate.length} Mitarbeiter importiert.` });
          onFinished();
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Fehler", description: err.message });
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <>
        <DialogHeader><DialogTitle>Mitarbeiter per Textfeld importieren</DialogTitle></DialogHeader>
        <div className="py-4 space-y-4">
          <Alert><AlertDescription><strong>Lager:</strong> {activeCamp.name}</AlertDescription></Alert>
          <Alert>
            <AlertTitle>Format & ID-Generierung</AlertTitle>
            <AlertDescription>
              Namen mit Semikolon (;) trennen.<br/>
              <strong>Beispiel:</strong> Max Müller; Erika Höfer<br/>
              <strong>Erstellt IDs:</strong> Max-Mueller; Erika-Hoefer
            </AlertDescription>
          </Alert>
          <Textarea placeholder="Max Müller; Erika Höfer;..." value={names} onChange={(e) => setNames(e.target.value)} className="min-h-[120px] themed-input" />
        </div>
        <DialogFooter>
          <Button onClick={handleImport} className="primary-btn" disabled={isLoading || !names.trim()}>Importieren</Button>
        </DialogFooter>
      </>
    );
  };

  if (!activeCamp) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><UserCheck />Mitarbeiter verwalten</h1>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" /><AlertTitle>Kein aktives Lager</AlertTitle>
          <AlertDescription>Bitte gehen Sie zu <strong>Lager-Verwaltung</strong> und aktivieren Sie ein Lager.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><UserCheck />Mitarbeiter verwalten</h1>
          <p className="text-sm opacity-70 mt-1"><strong>Lager:</strong> {activeCamp.name}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild><Button variant="outline"><Users className="mr-2 h-4 w-4" /> Massen-Import</Button></DialogTrigger>
            <DialogContent className="content-card"><MassImportDialogWithCamp onFinished={onFormFinished} /></DialogContent>
          </Dialog>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild><Button onClick={() => setEditingStaff(null)} className="primary-btn"><PlusCircle className="mr-2 h-4 w-4" /> Neuer Mitarbeiter</Button></DialogTrigger>
            <DialogContent className="content-card"><StaffFormWithCamp participant={editingStaff} onFinished={onFormFinished} /></DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="content-card"><CardHeader><CardTitle className="flex items-center gap-2"><Search /> Mitarbeiter suchen</CardTitle></CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Nach Name oder ID suchen..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="themed-input pl-10 pr-10" />
            {searchTerm && <Button onClick={clearSearch} variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"><X className="h-4 w-4" /></Button>}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!staffToDelete} onOpenChange={() => setStaffToDelete(null)}>
        <AlertDialogContent className="content-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
            <AlertDialogDescription>Möchten Sie {staffToDelete?.name} wirklich löschen?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!topUpStaff} onOpenChange={() => setTopUpStaff(null)}>
        <DialogContent>{topUpStaff && <TopUpDialog participant={topUpStaff} onFinished={onFormFinished} activeCamp={activeCamp} />}</DialogContent>
      </Dialog>
      
      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {filteredStaff.map(p => (
          <Card key={p.id} className="content-card">
            <CardHeader><CardTitle>{p.name}</CardTitle><CardDescription>ID: {p.barcode_id}</CardDescription></CardHeader>
            <CardContent>
              <div className="flex gap-2 pt-2 border-t border-dashed">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingStaff(p); setIsFormOpen(true); }}><Edit className="h-4 w-4 mr-2" />Bearbeiten</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setTopUpStaff(p)}><DollarSign className="h-4 w-4 mr-2" />Aufladen</Button>
                <Button variant="destructive" size="sm" onClick={() => setStaffToDelete(p)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Desktop View */}
      <Card className="content-card hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Barcode ID</TableHead><TableHead>Aktionen</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredStaff.map(p => (
                <TableRow key={p.id} className="themed-list-item">
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.barcode_id}</TableCell>
                  <TableCell className="space-x-2">
                     <Button variant="outline" size="icon" onClick={() => { setEditingStaff(p); setIsFormOpen(true); }} title="Bearbeiten"><Edit className="h-4 w-4" /></Button>
                     <Button variant="outline" size="icon" onClick={() => setTopUpStaff(p)} title="Guthaben aufladen"><DollarSign className="h-4 w-4" /></Button>
                     <Button variant="destructive" size="icon" onClick={() => setStaffToDelete(p)} title="Löschen"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredStaff.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-8">Keine Mitarbeiter gefunden.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MitarbeiterPage() {
  return <MitarbeiterContent />;
}
