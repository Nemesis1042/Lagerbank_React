import React, { useState, useRef, useEffect } from 'react';
import { Transaction } from '@/api/entities';
import { Participant } from '@/api/entities';
import { Product } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Nfc, ShoppingCart, Trash2, AlertTriangle, UserCheck, Users, Wifi, WifiOff } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { ExternalDisplay } from '../ExternalDisplay';
import { StaffReceiptModal } from './StaffReceiptModal';
import { useCampData, useCart } from '../hooks/useCampData';
import AuditLogger from '../AuditLogger';

export function NFCKasse() {
  const [participant, setParticipant] = useState(null);
  const [showStaffReceipt, setShowStaffReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [isNFCSupported, setIsNFCSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [nfcReader, setNfcReader] = useState(null);
  const [lastScannedId, setLastScannedId] = useState('');
  
  const isMountedRef = useRef(true);
  const { activeCamp, products, participants, isLoading, loadData } = useCampData();
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, totalPrice } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    // Check NFC support
    if (typeof window !== 'undefined' && 'NDEFReader' in window && window.isSecureContext) {
      setIsNFCSupported(true);
    }

    return () => {
      isMountedRef.current = false;
      stopNFCScanning();
    };
  }, []);

  const startNFCScanning = async () => {
    if (!isNFCSupported) {
      toast({ 
        variant: "destructive", 
        title: "NFC nicht verfügbar", 
        description: "Verwenden Sie Chrome auf Android mit HTTPS." 
      });
      return;
    }

    try {
      const reader = new window.NDEFReader();
      setNfcReader(reader);
      setIsScanning(true);

      reader.addEventListener('reading', ({ message }) => {
        if (!isMountedRef.current) return;

        let nfcId = '';
        for (const record of message.records) {
          if (record.recordType === 'text') {
            nfcId = new TextDecoder().decode(record.data);
            break;
          }
        }

        if (nfcId) {
          handleNFCScan(nfcId);
          setLastScannedId(nfcId);
        }
      });

      reader.addEventListener('readingerror', () => {
        if (!isMountedRef.current) return;
        toast({ variant: "destructive", title: "NFC-Fehler", description: "Lesefehler aufgetreten." });
        setIsScanning(false);
      });

      await reader.scan();
      toast({ title: "NFC aktiviert", description: "Halten Sie Tags an das Gerät." });

    } catch (error) {
      console.error('NFC Error:', error);
      setIsScanning(false);
      
      if (error.name === 'NotAllowedError') {
        toast({ variant: "destructive", title: "Zugriff verweigert", description: "NFC-Berechtigung erforderlich." });
      } else {
        toast({ variant: "destructive", title: "NFC-Fehler", description: error.message });
      }
    }
  };

  const stopNFCScanning = () => {
    setIsScanning(false);
    setNfcReader(null);
  };

  const handleNFCScan = (nfcId) => {
    // Check for participant
    const foundParticipant = participants.find(p => p.barcode_id === nfcId);
    if (foundParticipant && !participant) {
      setParticipant(foundParticipant);
      toast({ title: "Teilnehmer gefunden", description: `${foundParticipant.name} ausgewählt` });
      return;
    }

    // Check for product
    const foundProduct = products.find(p => p.barcode === nfcId || p.name.toLowerCase() === nfcId.toLowerCase());
    if (foundProduct && participant) {
      addToCart(foundProduct);
      toast({ title: "Produkt hinzugefügt", description: `${foundProduct.name} zum Warenkorb hinzugefügt` });
      return;
    }

    // Admin checkout
    if (nfcId.toLowerCase() === 'admin' && cart.length > 0 && participant) {
      processCheckout();
      return;
    }

    toast({ variant: "destructive", title: "Nicht erkannt", description: `ID "${nfcId}" nicht gefunden` });
  };

  const processCheckout = async () => {
    if (!participant || cart.length === 0 || !activeCamp) {
      toast({ variant: "destructive", title: "Fehler", description: "Teilnehmer und Produkte erforderlich." });
      return;
    }

    // Allow negative balances (debt) - participants can go into minus
    // Only check if explicitly required by camp settings
    if (activeCamp.require_positive_balance === true && participant.balance < totalPrice) {
      toast({ variant: "destructive", title: "Fehler", description: "Nicht genügend Guthaben." });
      return;
    }

    try {
      await Participant.update(participant.id, { 
        balance: participant.balance - totalPrice 
      });

      const transactions = [];
      for (const item of cart) {
        const transaction = await Transaction.create({
          participant_id: participant.id,
          product_id: item.id,
          camp_id: activeCamp.id,
          quantity: item.quantity,
          total_price: item.price * item.quantity,
          participant_name: participant.name,
          product_name: item.name,
          camp_name: activeCamp.name
        });
        
        if (transaction?.id) {
          transactions.push(transaction);
          await Product.update(item.id, { stock: item.stock - item.quantity });
          await AuditLogger.logTransaction(transaction.id, participant.name, item.name, item.price * item.quantity, activeCamp.id);
        }
      }

      if (participant.is_staff && transactions.length > 0) {
        setLastTransaction({ transactions, participant, totalPrice, cart: [...cart] });
        setShowStaffReceipt(true);
      }

      toast({ title: "Erfolg", description: `Bezahlung abgeschlossen! Balance: € ${(participant.balance - totalPrice).toFixed(2)}` });

      clearCart();
      setParticipant(null);
      loadData();

    } catch (error) {
      console.error('Checkout-Fehler:', error);
      toast({ variant: "destructive", title: "Fehler", description: "Bezahlung fehlgeschlagen." });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      </div>
    );
  }

  if (!activeCamp) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Kein aktives Lager</AlertTitle>
        <AlertDescription>Bitte aktivieren Sie ein Lager in den Einstellungen.</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-3 gap-8 mt-6">
        <div className="md:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">NFC-Kasse</h2>
            <div className="text-right text-sm opacity-70">
              <p><strong>{activeCamp.name}</strong></p>
            </div>
          </div>

          {/* NFC Status */}
          <Card className="content-card mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isNFCSupported ? (
                  isScanning ? <Wifi className="h-5 w-5 text-green-500 animate-pulse" /> : <Wifi className="h-5 w-5" />
                ) : (
                  <WifiOff className="h-5 w-5 text-gray-400" />
                )}
                NFC Scanner
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isNFCSupported ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    NFC wird nur auf Android mit Chrome über HTTPS unterstützt.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {isScanning ? 'Scanner aktiv' : 'Scanner bereit'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {isScanning ? 'Tags an Gerät halten...' : 'NFC-Scanner starten'}
                      </p>
                    </div>
                    <Button
                      onClick={isScanning ? stopNFCScanning : startNFCScanning}
                      className={isScanning ? 'primary-btn' : ''}
                      variant={isScanning ? 'default' : 'outline'}
                    >
                      <Nfc className="h-4 w-4 mr-2" />
                      {isScanning ? 'Stoppen' : 'Starten'}
                    </Button>
                  </div>
                  
                  {lastScannedId && (
                    <Alert>
                      <Nfc className="h-4 w-4" />
                      <AlertDescription>
                        Letzter Scan: <strong>{lastScannedId}</strong>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Teilnehmer Info */}
          {participant && (
            <Card className="content-card mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {participant.is_staff ? <UserCheck className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                    {participant.name}
                    {participant.tn_id && <Badge variant="outline">TN-{participant.tn_id}</Badge>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-70">Guthaben</p>
                    <p className={`text-lg font-bold ${participant.balance <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                      € {participant.balance.toFixed(2)}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
            </Card>
          )}

          {/* Anweisungen */}
          <Card className="content-card">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Nfc className="h-16 w-16 mx-auto text-blue-500" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">NFC-Workflow</h3>
                  <ol className="text-left space-y-2 max-w-md mx-auto">
                    <li>1. NFC-Scanner starten</li>
                    <li>2. Teilnehmer-Tag scannen</li>
                    <li>3. Produkt-Tags scannen</li>
                    <li>4. Admin-Tag für Checkout scannen</li>
                  </ol>
                </div>
                {!participant && (
                  <Alert>
                    <AlertDescription>
                      Scannen Sie zuerst einen Teilnehmer-Tag um zu beginnen.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Produkt-Grid als Fallback */}
          {participant && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {products.map(product => (
                <Card 
                  key={product.id} 
                  className={`cursor-pointer transition-all hover:scale-105 ${product.stock <= 0 ? 'opacity-50' : ''}`}
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{product.icon}</div>
                    <h3 className="font-medium text-sm">{product.name}</h3>
                    <p className="text-lg font-bold text-green-600">€ {(Number(product.price) || 0).toFixed(2)}</p>
                    <p className="text-xs opacity-70">Lager: {product.stock}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Warenkorb */}
        <div className="space-y-6">
          <ExternalDisplay numberToSend={participant?.tn_id} />
          
          <Card className="content-card">
            <CardHeader><CardTitle>Warenkorb</CardTitle></CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-center text-gray-500">Warenkorb ist leer</p>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">€ {(Number(item.price) || 0).toFixed(2)} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity - 1, products)}>-</Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity + 1, products)}>+</Button>
                        <Button variant="destructive" size="sm" onClick={() => removeFromCart(item.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>Gesamt: € {totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-3">
                    <Button onClick={processCheckout} className="w-full primary-btn">Bezahlen</Button>
                    <Button onClick={() => { clearCart(); setParticipant(null); }} variant="outline" className="w-full">Abbrechen</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showStaffReceipt && lastTransaction && (
        <StaffReceiptModal
          transaction={lastTransaction}
          onClose={() => setShowStaffReceipt(false)}
        />
      )}
    </>
  );
}
