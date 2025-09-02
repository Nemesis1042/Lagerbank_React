
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Participant } from '@/api/entities';
import { Transaction } from '@/api/entities';
import { AppSettings } from '@/api/entities';
import { Camp } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, Info, Scan, Search, X, UserPlus, AlertTriangle, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from "@/components/ui/use-toast";

function CheckoutModal({ participant, onFinished }) {
  const [transactions, setTransactions] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalDeposited, setTotalDeposited] = useState(0);
  const [groupedPurchases, setGroupedPurchases] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    
    async function loadData() {
      try {
        if (!isMounted) return; // Prevent setting state if component unmounted before async call
        
        // Lade alle Transaktionen für den Teilnehmer
        const allTransactions = await Transaction.filter({ participant_id: participant.id });
        
        if (!isMounted) return; // Prevent setting state if component unmounted after async call
        
        setTransactions(allTransactions);
        
        // Trenne Käufe und Einzahlungen
        const purchases = allTransactions.filter(t => t.total_price > 0 && !t.is_cancelled); // Positive = Käufe
        const deposits = allTransactions.filter(t => t.total_price < 0); // Negative = Einzahlungen
        
        // Berechne Summen
        const spent = purchases.reduce((sum, t) => sum + (parseFloat(t.total_price) || 0), 0);
        const deposited = Math.abs(deposits.reduce((sum, t) => sum + (parseFloat(t.total_price) || 0), 0));
        
        if (!isMounted) return; // Prevent setting state if component unmounted
        
        setTotalSpent(spent);
        setTotalDeposited(deposited);

        // Gruppiere Käufe nach Produkt
        const grouped = {};
        purchases.forEach(t => {
          // Ignoriere spezielle Transaktionstypen (NULL product_id)
          if (t.product_id === null) return;

          const key = t.product_name;
          if (!grouped[key]) {
            grouped[key] = {
              product_name: t.product_name,
              quantity: 0,
              total_price: 0,
              unit_price: (parseInt(t.quantity) || 0) > 0 ? (parseFloat(t.total_price) || 0) / (parseInt(t.quantity) || 1) : 0
            };
          }
          grouped[key].quantity += parseInt(t.quantity) || 0;
          grouped[key].total_price += parseFloat(t.total_price) || 0;
          // Aktualisiere unit_price basierend auf neuer Gesamtmenge
          if (grouped[key].quantity > 0) {
            grouped[key].unit_price = grouped[key].total_price / grouped[key].quantity;
          }
        });
        
        if (!isMounted) return; // Prevent setting state if component unmounted
        
        setGroupedPurchases(Object.values(grouped));
      } catch (error) {
        if (!isMounted) return; // Prevent logging/setting state if component unmounted
        
        console.error('Fehler beim Laden der Checkout-Daten:', error);
        setTotalSpent(0);
        setTotalDeposited(0);
        setGroupedPurchases([]);
      }
    }
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [participant]);
  
  const handleCheckout = async () => {
    await Participant.update(participant.id, { is_checked_in: false, balance: 0 });
    onFinished(participant.name);
  }

  const refundAmount = totalDeposited - totalSpent;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Check-Out für {participant.name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <Card className="content-card">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Finanzübersicht</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
                <div>Gesamteinzahlung:</div>
                <div className="font-medium text-right text-green-600">+ € {totalDeposited.toFixed(2)}</div>
                <div>Gesamtausgaben:</div>
                <div className="font-medium text-right text-red-600">- € {totalSpent.toFixed(2)}</div>
                <hr className="col-span-2 my-2"/>
                <div className="font-bold">Restguthaben:</div>
                <div className={`font-bold text-right ${refundAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {refundAmount >= 0 ? '+' : ''} € {refundAmount.toFixed(2)}
                </div>
                {refundAmount < 0 && (
                  <div className="col-span-2 text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">
                    <strong>Hinweis:</strong> Der Teilnehmer hat mehr ausgegeben als eingezahlt. 
                    Es ist eine Nachzahlung von € {Math.abs(refundAmount).toFixed(2)} erforderlich.
                  </div>
                )}
                {refundAmount > 0 && (
                  <div className="col-span-2 text-xs text-green-600 mt-2 p-2 bg-green-50 rounded">
                    <strong>Auszahlung:</strong> Dem Teilnehmer sind € {refundAmount.toFixed(2)} auszuzahlen.
                  </div>
                )}
            </CardContent>
        </Card>
        
        <Card className="content-card">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Gekaufte Artikel</CardTitle>
            </CardHeader>
            <CardContent>
                {groupedPurchases.length > 0 ? (
                  <div className="space-y-2">
                    {groupedPurchases.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-[var(--color-list-item-bg)] rounded">
                        <div>
                          <span className="font-medium">{item.quantity}x {item.product_name}</span>
                          <span className="text-sm text-gray-500 ml-2">(€ {item.unit_price.toFixed(2)} je Stück)</span>
                        </div>
                        <span className="font-semibold">€ {item.total_price.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center font-bold">
                        <span>Gesamtausgaben:</span>
                        <span className="text-red-600">€ {totalSpent.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <p>Keine Käufe getätigt</p>
                    <p className="text-xs mt-1">Der Teilnehmer hat nur Guthaben aufgeladen, aber nichts gekauft.</p>
                  </div>
                )}
            </CardContent>
        </Card>

        <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Abrechnung bestätigen</AlertTitle>
            <AlertDescription>
                Bitte prüfen Sie die Abrechnung mit dem Teilnehmer. 
                {refundAmount > 0 && ` Zahlen Sie € ${refundAmount.toFixed(2)} aus.`}
                {refundAmount < 0 && ` Fordern Sie € ${Math.abs(refundAmount).toFixed(2)} nach.`}
                {refundAmount === 0 && ' Der Account ist ausgeglichen.'}
                <br/>
                Durch "Abrechnen & Auschecken" wird der Teilnehmer ausgecheckt und der Kontostand auf 0 gesetzt.
            </AlertDescription>
        </Alert>

        <Button className="w-full primary-btn" onClick={handleCheckout}>
            Abrechnen & Auschecken
        </Button>
      </div>
    </>
  );
}

// NFCReader Component
function NFCReader({ onNFCRead, placeholder }) {
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const [nfcError, setNfcError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [ndefReader, setNdefReader] = useState(null);

  const stopScanning = useCallback(() => {
    if (ndefReader) {
      setNdefReader(null);
    }
    setIsScanning(false);
  }, [ndefReader]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      if (window.isSecureContext) {
        setNfcAvailable(true);
        setNfcError('');
      } else {
        setNfcAvailable(false);
        setNfcError('Web NFC erfordert eine sichere Verbindung (HTTPS). Bitte stellen Sie sicher, dass die Seite über HTTPS geladen wird.');
      }
    } else {
      setNfcAvailable(false);
      setNfcError('Web NFC API wird in diesem Browser oder auf diesem Gerät nicht unterstützt. Bitte verwenden Sie z.B. Chrome auf Android.');
    }
  }, []);

  const startScanning = async () => {
    if (!nfcAvailable) {
      setNfcError('NFC-Scanning nicht verfügbar.');
      return;
    }

    try {
      if (typeof window !== 'undefined' && 'NDEFReader' in window) {
        const reader = new window.NDEFReader();
        setNdefReader(reader);

        reader.onreading = event => {
          const decoder = new TextDecoder();
          for (const record of event.message.records) {
            if (record.recordType === 'text') {
              const data = decoder.decode(record.data);
              onNFCRead(data);
              stopScanning();
              return;
            }
          }
        };

        reader.onreadingerror = event => {
          console.error('NFC reading error:', event);
          setNfcError('Fehler beim Lesen des NFC-Tags. Bitte erneut versuchen.');
          setIsScanning(false);
        };

        await reader.scan();
        setIsScanning(true);
        setNfcError('');
      } else {
        setNfcError('NDEFReader ist nicht verfügbar.');
      }
    } catch (error) {
      console.error('NFC scan start error:', error);
      if (error.name === 'NotAllowedError') {
        setNfcError('NFC-Zugriff verweigert. Bitte erlauben Sie den Zugriff in den Browser-Einstellungen.');
      } else if (error.name === 'AbortError') {
        setNfcError('NFC-Scan abgebrochen.');
      } else if (error.name === 'SecurityError') {
        setNfcError('NFC kann in diesem unsicheren Kontext nicht gestartet werden. Bitte stellen Sie sicher, dass die Seite über HTTPS geladen wird.');
      } else {
        setNfcError('Ein unerwarteter Fehler ist beim Starten des NFC-Scans aufgetreten.');
      }
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return (
    <div className="space-y-4">
      {nfcError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>NFC Fehler</AlertTitle>
          <AlertDescription>{nfcError}</AlertDescription>
        </Alert>
      )}

      {!nfcAvailable && !nfcError && (
        <Alert className="text-sm">
          <Info className="h-4 w-4" />
          <AlertTitle>NFC-Status</AlertTitle>
          <AlertDescription>
            Ihr Browser/Gerät unterstützt Web NFC möglicherweise nicht. Bitte überprüfen Sie die Kompatibilität.
          </AlertDescription>
        </Alert>
      )}

      {nfcAvailable && (
        <>
          <p className="text-sm text-gray-500">{placeholder}</p>
          <Button 
            onClick={isScanning ? stopScanning : startScanning} 
            disabled={!nfcAvailable} 
            className="w-full primary-btn"
          >
            {isScanning ? 'NFC-Scan stoppen' : 'NFC-Scan starten'}
            <Scan className="h-4 w-4 ml-2" />
          </Button>
        </>
      )}
    </div>
  );
}

function CheckoutContent() {
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeId, setBarcodeId] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [activeCamp, setActiveCamp] = useState(null);
  const barcodeInputRef = useRef(null);
  const { toast } = useToast();

  // Ref to track if the component is mounted
  const isMountedRef = useRef(true);

  // Set isMountedRef to false when the component unmounts
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchParticipants = useCallback(async () => {
    try {
      const settings = await AppSettings.list();
      
      if (!isMountedRef.current) return; // Prevent state updates if component unmounted
      
      let currentCampId = null;
      let activeCampData = null;

      if (settings.length > 0 && settings[0].active_camp_id) {
        const camps = await Camp.list();
        
        if (!isMountedRef.current) return; // Prevent state updates if component unmounted
        
        activeCampData = camps.find(c => c.id === settings[0].active_camp_id);
        currentCampId = settings[0].active_camp_id;
      }
      
      if (!isMountedRef.current) return; // Prevent state updates if component unmounted
      
      setActiveCamp(activeCampData || null);

      if (!currentCampId) {
        if (isMountedRef.current) { // Only update state if component is still mounted
          setParticipants([]);
          setFilteredParticipants([]);
        }
        return;
      }

      // Lade nur eingecheckte Teilnehmer des aktiven Lagers (keine Mitarbeiter)
      const data = await Participant.filter({ 
        camp_id: currentCampId,
        is_staff: false,
        is_checked_in: true
      });
      
      if (!isMountedRef.current) return; // Prevent state updates if component unmounted
      
      data.sort((a, b) => a.name.localeCompare(b.name));
      setParticipants(data);
      setFilteredParticipants(data);
    } catch (error) {
      if (isMountedRef.current) { // Only log/toast error if component is still mounted
        console.error('Fehler beim Laden der Checkout-Daten:', error);
        toast({ 
          variant: "destructive", 
          title: "Fehler", 
          description: "Checkout-Daten konnten nicht geladen werden." 
        });
      }
    }
  }, [toast]); // useCallback dependencies: toast is a stable function from useToast

  useEffect(() => {
    const init = async () => {
      await fetchParticipants();
      
      if (isMountedRef.current && barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    };
    
    init();
  }, [fetchParticipants]); // Dependency array: fetchParticipants is now a stable useCallback

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredParticipants(participants);
    } else {
      const filtered = participants.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredParticipants(filtered);
    }
  }, [searchTerm, participants]);

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeId.trim()) return;

    const participant = participants.find(p => p.barcode_id === barcodeId);
    if (participant) {
      setSelectedParticipant(participant);
      setBarcodeId('');
    } else {
      toast({ variant: "destructive", title: "Fehler", description: "Teilnehmer mit dieser ID nicht gefunden oder bereits ausgecheckt."});
      setBarcodeId('');
      barcodeInputRef.current?.focus();
    }
  };

  const handleNFCParticipant = async (nfcData) => {
    if (!nfcData.trim()) {
      toast({ variant: "destructive", title: "Fehler", description: "Keine Daten vom NFC-Tag erhalten."});
      return;
    }

    const participant = participants.find(p => p.barcode_id === nfcData);
    if (participant) {
      setSelectedParticipant(participant);
    } else {
      toast({ variant: "destructive", title: "Fehler", description: `Teilnehmer mit ID "${nfcData}" nicht gefunden oder bereits ausgecheckt.`});
    }
  };

  const onCheckoutFinished = (name) => {
    fetchParticipants();
    setSelectedParticipant(null);
    toast({ title: "Erfolg", description: `${name} wurde erfolgreich ausgecheckt!` });
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setBarcodeId('');
    barcodeInputRef.current?.focus();
  };

  if (!activeCamp) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Check-Out</h1>
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Check-Out</h1>
          <p className="text-sm opacity-70 mt-1">
            <strong>Lager:</strong> {activeCamp.name} ({new Date(activeCamp.start_date).toLocaleDateString('de-DE')} - {new Date(activeCamp.end_date).toLocaleDateString('de-DE')})
          </p>
        </div>
      </div>
      
      <Card className="content-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Teilnehmer suchen
          </CardTitle>
          <p className="text-sm opacity-80">Scannen Sie den Barcode/NFC oder suchen Sie manuell nach einem Teilnehmer.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="barcode" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="barcode">Barcode</TabsTrigger>
              <TabsTrigger value="nfc">NFC</TabsTrigger>
              <TabsTrigger value="search">Suchen</TabsTrigger>
            </TabsList>
            
            <TabsContent value="barcode" className="mt-4">
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <Input
                  ref={barcodeInputRef}
                  placeholder="Barcode scannen oder eingeben..."
                  value={barcodeId}
                  onChange={e => setBarcodeId(e.target.value)}
                  className="themed-input flex-1"
                />
                <Button type="submit" className="primary-btn" disabled={!barcodeId.trim()}>
                  <Scan className="h-4 w-4 mr-2" />
                  Suchen
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="nfc" className="mt-4">
              <NFCReader 
                onNFCRead={handleNFCParticipant}
                placeholder="Teilnehmer-NFC-Tag für Checkout an das Gerät halten..."
              />
            </TabsContent>

            <TabsContent value="search" className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Name oder Barcode-ID eingeben..."
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="content-card">
        <CardHeader>
          <CardTitle>Eingecheckte Teilnehmer ({filteredParticipants.length})</CardTitle>
          <p className="text-sm opacity-80">Wählen Sie einen Teilnehmer aus, um den Check-Out-Prozess zu starten.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParticipants.map(p => (
              <div
                key={p.id}
                className="p-4 border rounded-lg hover:bg-[var(--color-list-item-bg)] cursor-pointer transition-colors"
                style={{borderColor: 'var(--color-border)'}}
                onClick={() => setSelectedParticipant(p)}
              >
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm opacity-80">ID: {p.barcode_id}</p>
                <p className="text-sm opacity-80">Guthaben: € {p.balance.toFixed(2)}</p>
              </div>
            ))}
            {filteredParticipants.length === 0 && participants.length > 0 && (
              <p className="text-gray-500 col-span-full text-center">
                Keine Teilnehmer mit "{searchTerm}" gefunden.
              </p>
            )}
            {participants.length === 0 && (
              <p className="text-gray-500 col-span-full text-center">
                Alle Teilnehmer wurden bereits ausgecheckt.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedParticipant && (
        <Dialog open={!!selectedParticipant} onOpenChange={() => setSelectedParticipant(null)}>
          <DialogContent className="max-w-md content-card">
            <CheckoutModal participant={selectedParticipant} onFinished={onCheckoutFinished} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return <CheckoutContent />;
}
