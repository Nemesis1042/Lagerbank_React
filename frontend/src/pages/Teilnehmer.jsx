
import React, { useState, useEffect } from 'react';
import { Participant } from '@/api/entities';
import { Transaction } from '@/api/entities';
import { AppSettings } from '@/api/entities';
import { Camp } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, DollarSign, Users, Search, X, UserPlus, AlertTriangle, Trash2, BarChart } from 'lucide-react'; // Added BarChart
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from "@/components/ui/use-toast";
import { NFCWriter } from '../components/NFCWriter';
import { formatBalance, getNumericBalance } from '../utils/formatBalance';

// Hilfsfunktion für saubere Barcode-IDs
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

function TopUpDialog({ participant, onFinished, activeCamp }) {
    const [amount, setAmount] = useState(0);
    const { toast } = useToast();

    const handleTopUp = async () => {
        if (amount > 0 && activeCamp) {
            // Update participant balance
            await Participant.update(participant.id, { balance: participant.balance + amount });
            
            // Create a negative transaction (money added, not spent)
            await Transaction.create({
                participant_id: participant.id,
                product_id: null, // NULL for special transactions
                camp_id: activeCamp.id,
                quantity: 1,
                total_price: -amount, // Negative price = money added
                participant_name: participant.name,
                product_name: 'Guthaben-Aufladung',
                camp_name: activeCamp.name,
                created_at: new Date().toISOString()
            });

            toast({ title: "Erfolg", description: `€ ${amount.toFixed(2)} wurden ${participant.name} gutgeschrieben.`});
            onFinished();
        } else {
             toast({ variant: "destructive", title: "Fehler", description: "Betrag muss größer als 0 sein und ein aktives Lager existieren."});
        }
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle>Guthaben aufladen für {participant.name}</DialogTitle>
                <DialogDescription>
                    Fügen Sie Guthaben zum Teilnehmerkonto hinzu. Der Betrag wird sofort verfügbar sein.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <p>Aktuelles Guthaben: € {formatBalance(participant.balance)}</p>
                <Label htmlFor="topup-amount">Betrag zum Aufladen</Label>
                <Input id="topup-amount" type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} className="themed-input" />
            </div>
            <DialogFooter>
                <Button onClick={handleTopUp} className="primary-btn">Aufladen</Button>
            </DialogFooter>
        </>
    )
}

// New NFCReader component
function NFCReader({ onNFCRead, placeholder }) {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState('');
    const [scannedData, setScannedData] = useState('');

    useEffect(() => {
        // This is a simplified mock for Web NFC API interaction.
        // In a real application, you would implement the NDEFReader API here.
        // Example (requires browser support, secure context HTTPS):
        /*
        if ('NDEFReader' in window) {
            const reader = new NDEFReader();
            reader.onreading = event => {
                const decoder = new TextDecoder();
                for (const record of event.message.records) {
                    if (record.recordType === "text") { // Or other record types like 'url', 'mime'
                        const data = decoder.decode(record.data);
                        onNFCRead(data);
                        setScannedData(data);
                        setError('');
                        setIsScanning(false);
                    }
                }
            };
            reader.onerror = event => {
                setError('NFC Lesefehler: ' + event.message);
                setIsScanning(false);
            };
            // To start scanning when component mounts (or via a button click):
            // reader.scan();
        } else {
            setError('Web NFC API nicht verfügbar. Bitte verwenden Sie einen unterstützten Browser (z.B. Chrome auf Android) mit HTTPS.');
        }
        */
    }, [onNFCRead]);

    const handleSimulateScan = () => {
        setIsScanning(true);
        setError('');
        setScannedData('');
        // Simulate a delay for scanning and then provide mock data
        setTimeout(() => {
            const mockNFCId = `NFC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
            onNFCRead(mockNFCId);
            setScannedData(mockNFCId);
            setIsScanning(false);
        }, 1500); // Simulate 1.5 seconds scan time
    };

    return (
        <div className="space-y-2">
            <Button onClick={handleSimulateScan} disabled={isScanning} className="w-full">
                {isScanning ? 'Scannen läuft...' : 'NFC-Tag scannen'}
            </Button>
            {error && <Alert variant="destructive" dismissible><AlertDescription>{error}</AlertDescription></Alert>}
            {scannedData && (
                <Alert><AlertDescription>Erfolgreich gescannt: <strong>{scannedData}</strong></AlertDescription></Alert>
            )}
            {!scannedData && !error && !isScanning && (
                <p className="text-sm text-gray-500 text-center">{placeholder}</p>
            )}
        </div>
    );
}

function TeilnehmerContent() {
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [participantPrognoses, setParticipantPrognoses] = useState({}); // New state for prognoses
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [topUpParticipant, setTopUpParticipant] = useState(null);
  const [participantToDelete, setParticipantToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCamp, setActiveCamp] = useState(null);
  const { toast } = useToast();

  const calculatePrognosis = async (participantsList, activeCampData) => {
    if (!activeCampData) return {};

    const prognoses = {};
    const campStart = new Date(activeCampData.start_date);
    const campEnd = new Date(activeCampData.end_date);
    const today = new Date();
    
    // Berechne Lagertage
    const totalCampDays = Math.ceil((campEnd - campStart) / (1000 * 60 * 60 * 24)) + 1;
    const daysSinceStart = Math.ceil((today - campStart) / (1000 * 60 * 60 * 24)) + 1;
    const remainingDays = Math.max(0, totalCampDays - daysSinceStart);

    for (const participant of participantsList) {
      try {
        // Lade alle Käufe (positive Transaktionen) für diesen Teilnehmer
        const transactions = await Transaction.filter({ 
          participant_id: participant.id,
          camp_id: activeCampData.id 
        });
        
        const purchases = transactions.filter(t => 
          parseFloat(t.total_price) > 0 && 
          !t.is_cancelled && 
          !t.is_storno &&
          t.product_id !== null // Nur echte Käufe (nicht NULL für spezielle Transaktionen)
        ); // nur echte Käufe
        
        // Debug: Logge die Käufe für Troubleshooting
        console.log(`${participant.name} - Käufe:`, purchases.map(p => ({ product: p.product_name, price: p.total_price })));
        
        // Berechne 'totalSpent' und stelle sicher, dass alle Werte Zahlen sind
        const totalSpent = purchases.reduce((sum, t) => {
          const price = parseFloat(t.total_price) || 0;
          return Math.round((sum + price) * 100) / 100; // Fix floating point precision
        }, 0);
        
        console.log(`${participant.name} - Gesamtausgaben: ${totalSpent}`);
        
        // Verwende das ursprüngliche Startguthaben des Teilnehmers (nicht die Aufladungen)
        const totalDeposited = parseFloat(participant.initial_balance) || 0;
        
        // Durchschnittliche tägliche Ausgaben berechnen
        const dailySpending = daysSinceStart > 0 ? Math.round((totalSpent / daysSinceStart) * 100) / 100 : 0;
        
        // Prognose für verbleibende Tage
        const projectedRemainingSpending = Math.round((dailySpending * remainingDays) * 100) / 100;
        const projectedTotalSpending = Math.round((totalSpent + projectedRemainingSpending) * 100) / 100;
        const projectedRemainingBalance = Math.round((totalDeposited - projectedTotalSpending) * 100) / 100;
        
        prognoses[participant.id] = {
          dailySpending,
          projectedRemainingSpending,
          projectedTotalSpending,
          projectedRemainingBalance,
          remainingDays,
          daysSinceStart,
          totalSpent,
          totalDeposited
        };
      } catch (error) {
        console.error(`Fehler beim Berechnen der Prognose für ${participant.name}:`, error);
        prognoses[participant.id] = {
          dailySpending: 0,
          projectedRemainingSpending: 0,
          projectedTotalSpending: 0,
          projectedRemainingBalance: parseFloat(participant.initial_balance) || 0,
          remainingDays,
          daysSinceStart,
          totalSpent: 0,
          totalDeposited: parseFloat(participant.initial_balance) || 0
        };
      }
    }
    
    return prognoses;
  };

  const fetchParticipants = async () => {
    try {
      // Lade aktives Lager
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
        setParticipants([]);
        setFilteredParticipants([]);
        setParticipantPrognoses({}); // Clear prognoses if no active camp
        return;
      }

      // Lade nur Teilnehmer des aktiven Lagers (keine Mitarbeiter)
      const data = await Participant.filter({ 
        is_staff: false,
        camp_id: currentCampId 
      }); 
      
      // Sortiere nach TN-Nr. (statt nach Namen)
      data.sort((a, b) => {
        // Teilnehmer ohne TN-Nr. ans Ende
        if (!a.tn_id && !b.tn_id) return a.name.localeCompare(b.name);
        if (!a.tn_id) return 1;
        if (!b.tn_id) return -1;
        return a.tn_id - b.tn_id;
      });
      
      setParticipants(data);
      setFilteredParticipants(data);

      // Berechne Prognosen
      const prognoses = await calculatePrognosis(data, activeCampData);
      setParticipantPrognoses(prognoses);
    } catch (error) {
      console.error('Fehler beim Laden der Teilnehmer:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchParticipantsWithMount = async () => {
      try {
        // Lade aktives Lager
        const settings = await AppSettings.list();
        if (!isMounted) return;
        
        let currentCampId = null;
        let activeCampData = null;

        if (settings.length > 0 && settings[0].active_camp_id) {
          const camps = await Camp.list();
          if (!isMounted) return;
          
          activeCampData = camps.find(c => c.id === settings[0].active_camp_id);
          currentCampId = settings[0].active_camp_id;
        }
        
        if (isMounted) setActiveCamp(activeCampData || null);

        if (!currentCampId) {
          if (isMounted) {
            setParticipants([]);
            setFilteredParticipants([]);
            setParticipantPrognoses({}); // Clear prognoses if no active camp
          }
          return;
        }

        // Lade nur Teilnehmer des aktiven Lagers (keine Mitarbeiter)
        const data = await Participant.filter({ 
          is_staff: false,
          camp_id: currentCampId 
        }); 
        
        if (!isMounted) return;
        
        // Sortiere nach TN-Nr. (statt nach Namen)
        data.sort((a, b) => {
          // Teilnehmer ohne TN-Nr. ans Ende
          if (!a.tn_id && !b.tn_id) return a.name.localeCompare(b.name);
          if (!a.tn_id) return 1;
          if (!b.tn_id) return -1;
          return a.tn_id - b.tn_id;
        });
        
        setParticipants(data);
        setFilteredParticipants(data);

        // Berechne Prognosen auch im useEffect
        const prognoses = await calculatePrognosis(data, activeCampData);
        if (isMounted) setParticipantPrognoses(prognoses);
      } catch (error) {
        if (isMounted) {
          console.error('Fehler beim Laden der Teilnehmer:', error);
        }
      }
    };

    fetchParticipantsWithMount();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // Filter participants based on search term
    if (searchTerm.trim() === '') {
      setFilteredParticipants(participants);
    } else {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const filtered = participants.filter(participant => 
        participant.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        (participant.barcode_id && participant.barcode_id.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (participant.tn_id && participant.tn_id.toString().includes(lowerCaseSearchTerm))
      );
      setFilteredParticipants(filtered);
    }
  }, [searchTerm, participants]);

  const onFormFinished = () => {
      fetchParticipants();
      setIsFormOpen(false);
      setEditingParticipant(null);
      setTopUpParticipant(null);
      setIsImportOpen(false);
  }

  const handleDeleteConfirm = async () => {
    if (participantToDelete) {
      await Participant.delete(participantToDelete.id);
      toast({ title: "Erfolg", description: `${participantToDelete.name} wurde gelöscht.`});
      setParticipantToDelete(null);
      fetchParticipants();
    }
  }

  const clearSearch = () => {
    setSearchTerm('');
  };

  const ParticipantFormWithCamp = ({ participant, onFinished, isStaffDefault = false }) => {
    const [formData, setFormData] = useState(participant || { 
      name: '', 
      barcode_id: '', 
      balance: 0, 
      is_staff: isStaffDefault,
      camp_id: activeCamp?.id,
      camp_name: activeCamp?.name,
      tn_id: null 
    });
    const { toast } = useToast();

    // Automatische Barcode-ID Generierung wenn Name geändert wird und ID noch leer ist
    useEffect(() => {
      if (formData.name && !participant?.id && !formData.barcode_id) {
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
        // Nur automatische ID-Generierung bei neuen Teilnehmern
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
      let dataToSave = { ...formData };
      if (!dataToSave.barcode_id) {
          toast({ variant: "destructive", title: "Fehler", description: "Die ID darf nicht leer sein." });
          return;
      }
      
      const initialBalance = parseFloat(dataToSave.balance) || 0;

      // Sicherstellen, dass tn_id eine Zahl ist (für neue und bestehende)
      if (dataToSave.tn_id !== null && dataToSave.tn_id !== undefined && dataToSave.tn_id !== '') {
          dataToSave.tn_id = parseInt(dataToSave.tn_id, 10);
      } else {
          dataToSave.tn_id = null;
      }

      try {
          // Überprüfe explizit, ob es sich um einen bestehenden Teilnehmer handelt
          const isExistingParticipant = participant && participant.id;
          
          if (isExistingParticipant) {
            // Update existing participant
            await Participant.update(participant.id, dataToSave);
            toast({ title: "Erfolg", description: "Teilnehmerdaten aktualisiert." });
          } else {
            // Create new participant
            dataToSave.initial_balance = initialBalance;
            dataToSave.balance = initialBalance;
            dataToSave.camp_id = activeCamp?.id;
            dataToSave.camp_name = activeCamp?.name;
            dataToSave.is_checked_in = true; // Neue Teilnehmer sind standardmäßig eingecheckt
            
            const newParticipant = await Participant.create(dataToSave);
            
            // Create initial balance as negative transaction (if > 0)
            if (initialBalance > 0 && activeCamp) {
              await Transaction.create({
                participant_id: newParticipant.id,
                product_id: null, // NULL for special transactions
                camp_id: activeCamp.id,
                quantity: 1,
                total_price: -initialBalance, // Negative = money added
                participant_name: newParticipant.name,
                product_name: 'Startguthaben',
                camp_name: activeCamp.name,
                created_at: new Date().toISOString()
              });
            }
            toast({ title: "Erfolg", description: "Neuer Teilnehmer erstellt." });
          }
          onFinished();
      } catch (err) {
          console.error('Save error:', err);
          toast({ variant: "destructive", title: "Fehler", description: "Fehler beim Speichern des Teilnehmers." });
      }
    };

    return (
      <>
        <DialogHeader>
          <DialogTitle>{participant && participant.id ? 'Teilnehmer bearbeiten' : 'Neuen Teilnehmer anlegen'}</DialogTitle>
          <DialogDescription>
            {participant && participant.id 
              ? 'Bearbeiten Sie die Teilnehmerdaten. Änderungen werden sofort gespeichert.'
              : 'Erstellen Sie einen neuen Teilnehmer für das aktive Lager.'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {activeCamp && (
            <Alert>
              <AlertDescription>
                <strong>Lager:</strong> {activeCamp.name} ({new Date(activeCamp.start_date).toLocaleDateString('de-DE')} - {new Date(activeCamp.end_date).toLocaleDateString('de-DE')})
              </AlertDescription>
            </Alert>
          )}
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
          
          {!formData.is_staff && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tn_id" className="text-right">TN-Nr.</Label>
              <Input 
                id="tn_id" 
                type="number"
                value={formData.tn_id || ''} 
                onChange={e => setFormData({ ...formData, tn_id: parseInt(e.target.value, 10) || null })}
                className="col-span-3 themed-input" 
              />
            </div>
          )}

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
                  <div className="space-y-2">
                    <Input 
                      id="nfc_barcode_id"
                      value={formData.barcode_id} 
                      readOnly
                      className="themed-input"
                      placeholder="ID wird durch NFC-Scan gesetzt"
                    />
                    <NFCReader 
                      onNFCRead={handleNFCRead}
                      placeholder="NFC-Tag für Teilnehmer-ID lesen..."
                    />
                  </div>
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
            <Input 
              id="balance" 
              type="number" 
              value={formData.balance} 
              onChange={e => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })} 
              className="col-span-3 themed-input" 
              disabled={!!(participant && participant.id)}
            />
            {(participant && participant.id) && (
              <p className="col-start-2 col-span-3 text-xs text-gray-500">
                Das Startguthaben kann nur bei der Erstellung des Teilnehmers festgelegt werden. Nutzen Sie die "Aufladen"-Funktion für spätere Einzahlungen.
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Status</Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Switch id="is_staff" checked={formData.is_staff} onCheckedChange={checked => setFormData({ ...formData, is_staff: checked })} />
              <Label htmlFor="is_staff">Mitarbeiter</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} className="primary-btn">Speichern</Button>
        </DialogFooter>
      </>
    );
  };

  const MassImportDialogWithCamp = ({ onFinished, isStaffDefault = false }) => {
    const [names, setNames] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleImport = async () => {
      if (!names.trim()) {
        toast({ variant: "destructive", title: "Fehler", description: "Bitte geben Sie Namen in das Textfeld ein." });
        return;
      }

      if (!activeCamp) {
        toast({ variant: "destructive", title: "Fehler", description: "Kein aktives Lager gesetzt." });
        return;
      }

      setIsLoading(true);

      try {
        const nameList = names.split(';')
          .map(name => name.trim())
          .filter(name => name.length > 0);

        if (nameList.length === 0) {
          toast({ variant: "destructive", title: "Fehler", description: "Keine gültigen Namen gefunden." });
          setIsLoading(false);
          return;
        }
        
        // Höchste bestehende TN-ID für das Lager ermitteln
        const campParticipants = await Participant.filter({ camp_id: activeCamp.id, is_staff: false });
        let currentMaxTnId = campParticipants.reduce((max, p) => (p.tn_id > max ? p.tn_id : max), 0);

        const participantsToCreate = nameList.map(name => {
          // Assign TN-ID only for non-staff participants
          let tnId = null;
          if (!isStaffDefault) {
            currentMaxTnId++; 
            tnId = currentMaxTnId;
          }

          return {
            name,
            tn_id: tnId,
            barcode_id: createBarcodeId(name), // Verwende die neue Funktion
            initial_balance: 0,
            balance: 0,
            is_staff: isStaffDefault,
            is_checked_in: true, // Neue Teilnehmer sind standardmäßig eingecheckt
            camp_id: activeCamp.id,
            camp_name: activeCamp.name
          };
        });

        if (participantsToCreate.length > 0) {
          await Participant.bulkCreate(participantsToCreate);
          toast({ title: "Erfolg", description: `${participantsToCreate.length} Teilnehmer importiert.` });
          onFinished();
        } else {
          toast({ variant: "destructive", title: "Fehler", description: "Keine gültigen Teilnehmerdaten gefunden." });
        }

      } catch (err) {
        toast({ variant: "destructive", title: "Fehler", description: err.message || 'Ein unbekannter Fehler ist aufgetreten.' });
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <>
        <DialogHeader>
          <DialogTitle>Teilnehmer per Textfeld importieren</DialogTitle>
          <DialogDescription>
            Importieren Sie mehrere Teilnehmer gleichzeitig durch Eingabe ihrer Namen, getrennt durch Semikolons.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {activeCamp && (
            <Alert>
              <AlertDescription>
                <strong>Lager:</strong> {activeCamp.name} - Teilnehmer werden diesem Lager zugeordnet.
              </AlertDescription>
            </Alert>
          )}
          <Alert>
            <AlertTitle>Format & ID-Generierung</AlertTitle>
            <AlertDescription>
              Fügen Sie eine Liste von Namen ein, getrennt durch ein Semikolon (;).<br/>
              <strong>Beispiel:</strong> Max Müller; Erika Höfer; Jürgen Weiß<br/>
              <strong>Erstellt IDs:</strong> Max-Mueller; Erika-Hoefer; Juergen-Weiss
            </AlertDescription>
          </Alert>

          <div className="grid gap-4">
            <Label htmlFor="names-import">Namen (mit Semikolon ; getrennt)</Label>
            <Textarea
              id="names-import"
              placeholder="Max Müller; Erika Höfer; Jürgen Weiß; ..."
              value={names}
              onChange={(e) => setNames(e.target.value)}
              className="min-h-[120px] themed-input"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleImport} className="primary-btn" disabled={isLoading || !names.trim()}>
            {isLoading ? 'Importiere...' : <><Users className="mr-2 h-4 w-4" /> Importieren</>}
          </Button>
        </DialogFooter>
      </>
    );
  };

  const handleNewParticipantClick = async () => {
    // Find the next available TN-ID
    let nextTnId = null;
    if (activeCamp) { // Only calculate if an active camp exists
      const campParticipants = await Participant.filter({ camp_id: activeCamp.id, is_staff: false });
      const maxTnId = campParticipants.reduce((max, p) => (p.tn_id > max ? p.tn_id : max), 0);
      nextTnId = maxTnId + 1;
    }
    
    // Set a new participant with the suggested ID - WICHTIG: Keine ID setzen!
    setEditingParticipant({ 
      name: '', 
      barcode_id: '', 
      balance: 0, 
      is_staff: false,
      tn_id: nextTnId,
      camp_id: activeCamp?.id,
      camp_name: activeCamp?.name
      // Keine ID hier setzen!
    });
    setIsFormOpen(true);
  };

  if (!activeCamp) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Teilnehmer verwalten</h1>
        <Alert variant="destructive" dismissible>
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
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Teilnehmer verwalten</h1>
          <p className="text-sm opacity-70 mt-1">
            <strong>Lager:</strong> {activeCamp.name} ({new Date(activeCamp.start_date).toLocaleDateString('de-DE')} - {new Date(activeCamp.end_date).toLocaleDateString('de-DE')})
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  // Alle Teilnehmer des aktuellen Lagers auf eingecheckt setzen
                  const updates = participants.map(p => 
                    Participant.update(p.id, { is_checked_in: true })
                  );
                  await Promise.all(updates);
                  toast({ title: "Erfolg", description: `${participants.length} Teilnehmer wurden als eingecheckt markiert.` });
                  fetchParticipants();
                } catch (error) {
                  toast({ variant: "destructive", title: "Fehler", description: "Fehler beim Aktualisieren der Teilnehmer." });
                }
              }}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Alle einchecken
            </Button>
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline"><Users className="mr-2 h-4 w-4" /> Massen-Import</Button>
                </DialogTrigger>
                <DialogContent className="content-card">
                    <MassImportDialogWithCamp onFinished={onFormFinished} isStaffDefault={false} />
                </DialogContent>
            </Dialog>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button onClick={handleNewParticipantClick} className="primary-btn">
                        <PlusCircle className="mr-2 h-4 w-4" /> Neuer Teilnehmer
                    </Button>
                </DialogTrigger>
                <DialogContent className="content-card">
                    <ParticipantFormWithCamp participant={editingParticipant} onFinished={onFormFinished} isStaffDefault={false} />
                </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* Suchleiste */}
      <Card className="content-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Teilnehmer suchen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Nach Name, TN-Nr. oder Barcode-ID suchen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="themed-input pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                onClick={clearSearch}
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {searchTerm && (
            <p className="text-sm text-gray-500 mt-2">
              {filteredParticipants.length} von {participants.length} Teilnehmern gefunden
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!participantToDelete} onOpenChange={() => setParticipantToDelete(null)}>
        <AlertDialogContent className="content-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Teilnehmer <strong>{participantToDelete?.name}</strong> wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden. Alle zugehörigen Daten gehen verloren.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!topUpParticipant} onOpenChange={() => setTopUpParticipant(null)}>
        <DialogContent className="content-card">
            {topUpParticipant && <TopUpDialog participant={topUpParticipant} onFinished={onFormFinished} activeCamp={activeCamp} />}
        </DialogContent>
      </Dialog>
      
      {/* Mobile View: Card List */}
      <div className="md:hidden space-y-4">
        {filteredParticipants.length > 0 ? (
          filteredParticipants.map(p => {
            const prognosis = participantPrognoses[p.id] || {};
            return (
              <Card key={p.id} className="content-card">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    <CardDescription>
                      TN-Nr: {p.tn_id || 'N/A'} &bull; ID: {p.barcode_id}
                    </CardDescription>
                  </div>
                  {p.is_staff ? <Badge variant="secondary">Mitarbeiter</Badge> : <Badge>Teilnehmer</Badge>}
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className={p.balance <= 5 ? 'text-yellow-600 font-semibold' : p.balance <= 0 ? 'text-red-600 font-semibold' : ''}>
                        Aktuell: € {formatBalance(p.balance)}
                      </span>
                      {p.balance <= 5 && p.balance > 0 && <Badge className="ml-2 bg-yellow-100 text-yellow-800">Niedrig</Badge>}
                      {p.balance <= 0 && <Badge className="ml-2 bg-red-100 text-red-800">Leer</Badge>}
                    </div>
                    <div>
                      <span className={`text-sm ${(Number(prognosis.projectedRemainingBalance) || 0) < 0 ? 'text-red-600 font-semibold' : (Number(prognosis.projectedRemainingBalance) || 0) < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                        Prognose: € {(Number(prognosis.projectedRemainingBalance) || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {prognosis.dailySpending > 0 && (
                    <div className="text-xs opacity-70 bg-gray-50 p-2 rounded">
                      Ø täglich: € {prognosis.dailySpending.toFixed(2)} &bull; 
                      Verbleibend: {prognosis.remainingDays} Tage &bull;
                      Erwartete weitere Ausgaben: € {(Number(prognosis.projectedRemainingSpending) || 0).toFixed(2)}
                    </div>
                  )}
                   <div className="flex gap-2 pt-2 border-t border-dashed">
                     <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingParticipant(p); setIsFormOpen(true); }}><Edit className="h-4 w-4 mr-2" />Bearbeiten</Button>
                     <Button variant="outline" size="sm" className="flex-1" onClick={() => setTopUpParticipant(p)}><DollarSign className="h-4 w-4 mr-2" />Aufladen</Button>
                     <Button variant="destructive" size="sm" onClick={() => setParticipantToDelete(p)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center text-gray-500 py-8">
            {searchTerm ? (
              `Keine Teilnehmer mit "${searchTerm}" gefunden.`
            ) : (
              `Noch keine Teilnehmer für dieses Lager angelegt.`
            )}
          </div>
        )}
      </div>
      
      {/* Desktop View: Table */}
      <Card className="content-card hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>TN-Nr.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Barcode ID</TableHead>
                <TableHead>Aktuelles Guthaben</TableHead>
                <TableHead>Ø täglich</TableHead>
                <TableHead>Prognose Lagerende</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.length > 0 ? (
                filteredParticipants.map(p => {
                  const prognosis = participantPrognoses[p.id] || {};
                  return (
                    <TableRow key={p.id} className="themed-list-item">
                      <TableCell className="font-semibold">{p.tn_id || 'N/A'}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.barcode_id}</TableCell>
                      <TableCell>
                        <span className={p.balance <= 5 ? 'text-yellow-600 font-semibold' : p.balance <= 0 ? 'text-red-600 font-semibold' : ''}>
                          € {formatBalance(p.balance)}
                        </span>
                        {p.balance <= 5 && p.balance > 0 && <Badge className="ml-2 bg-yellow-100 text-yellow-800">Niedrig</Badge>}
                        {p.balance <= 0 && <Badge className="ml-2 bg-red-100 text-red-800">Leer</Badge>}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          € {(Number(prognosis.dailySpending) || 0).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={`font-semibold ${(Number(prognosis.projectedRemainingBalance) || 0) < 0 ? 'text-red-600' : (Number(prognosis.projectedRemainingBalance) || 0) < 10 ? 'text-yellow-600' : 'text-green-600'}`}>
                            € {(Number(prognosis.projectedRemainingBalance) || 0).toFixed(2)}
                          </span>
                          {prognosis.remainingDays > 0 && (
                            <span className="text-xs opacity-60">
                              ({prognosis.remainingDays} Tage übrig)
                            </span>
                          )}
                          {(prognosis.projectedRemainingBalance || 0) < 0 && (
                            <Badge className="mt-1 bg-red-100 text-red-800 text-xs">
                              Warnung: Überzieht!
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.is_staff ? <Badge variant="secondary">Mitarbeiter</Badge> : <Badge>Teilnehmer</Badge>}
                      </TableCell>
                      <TableCell className="space-x-2">
                         <Button variant="outline" size="icon" onClick={() => { setEditingParticipant(p); setIsFormOpen(true); }} title="Bearbeiten"><Edit className="h-4 w-4" /></Button>
                         <Button variant="outline" size="icon" onClick={() => setTopUpParticipant(p)} title="Guthaben aufladen"><DollarSign className="h-4 w-4" /></Button>
                         <Button variant="destructive" size="icon" onClick={() => setParticipantToDelete(p)} title="Löschen"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    {searchTerm ? (
                      `Keine Teilnehmer mit "${searchTerm}" gefunden.`
                    ) : (
                      `Noch keine Teilnehmer für dieses Lager angelegt.`
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Prognose-Zusammenfassung */}
      {Object.keys(participantPrognoses).length > 0 && (
        <Card className="content-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Prognose-Übersicht
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {(() => {
                const prognoses = Object.values(participantPrognoses);
                const remainingDays = prognoses[0]?.remainingDays || 0;
                const totalDailySpending = prognoses.reduce((sum, p) => sum + (p.dailySpending || 0), 0);
                const overdraftCount = prognoses.filter(p => (p.projectedRemainingBalance || 0) < 0).length;
                const lowBalanceCount = prognoses.filter(p => (p.projectedRemainingBalance || 0) >= 0 && (p.projectedRemainingBalance || 0) < 10).length;
                
                return (
                  <>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{remainingDays}</p>
                      <p className="text-sm opacity-70">Verbleibende Lagertage</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">€ {totalDailySpending.toFixed(2)}</p>
                      <p className="text-sm opacity-70">Ø Tägliche Gesamtausgaben</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{overdraftCount}</p>
                      <p className="text-sm opacity-70">Teilnehmer mit Überziehung</p>
                      {lowBalanceCount > 0 && (
                        <p className="text-xs text-yellow-600 mt-1">
                          + {lowBalanceCount} mit niedrigem Guthaben
                        </p>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function TeilnehmerPage() {
  return <TeilnehmerContent />;
}
