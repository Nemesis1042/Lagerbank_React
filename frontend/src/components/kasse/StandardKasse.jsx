import React, { useState, useRef } from 'react';
import { Transaction } from '@/api/entities';
import { Participant } from '@/api/entities';
import { Product } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Scan, ShoppingCart, Trash2, AlertTriangle, UserCheck, Users } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { ExternalDisplay } from '../ExternalDisplay';
import { StaffReceiptModal } from './StaffReceiptModal';
import { useCampData, useCart } from '../hooks/useCampData';
import AuditLogger from '../AuditLogger';

export function StandardKasse() {
  const [participant, setParticipant] = useState(null);
  const [barcodeId, setBarcodeId] = useState('');
  const [productBarcode, setProductBarcode] = useState('');
  const [showStaffReceipt, setShowStaffReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  
  const barcodeInputRef = useRef(null);
  const productBarcodeRef = useRef(null);
  
  const { activeCamp, products, participants, isLoading, loadData } = useCampData();
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, totalPrice } = useCart();
  const { toast } = useToast();

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeId.trim()) return;

    // Admin checkout
    if (barcodeId.toLowerCase() === 'admin') {
      if (cart.length > 0) {
        await processCheckout();
      }
      setBarcodeId('');
      return;
    }

    const foundParticipant = participants.find(p => p.barcode_id === barcodeId);
    if (foundParticipant) {
      setParticipant(foundParticipant);
      setBarcodeId('');
      setTimeout(() => productBarcodeRef.current?.focus(), 100);
    } else {
      toast({ variant: "destructive", title: "Fehler", description: "Teilnehmer nicht gefunden." });
      setBarcodeId('');
    }
  };

  const handleProductBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!productBarcode.trim()) return;

    const product = products.find(p => 
      p.barcode === productBarcode || 
      p.name.toLowerCase() === productBarcode.toLowerCase()
    );
    
    if (product) {
      addToCart(product);
      setProductBarcode('');
    } else {
      toast({ variant: "destructive", title: "Fehler", description: "Produkt nicht gefunden." });
      setProductBarcode('');
    }
  };

  const processCheckout = async () => {
    if (!participant || cart.length === 0 || !activeCamp) {
      toast({ variant: "destructive", title: "Fehler", description: "Teilnehmer auswählen und Produkte hinzufügen." });
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

      toast({ title: "Erfolg", description: `Kauf abgeschlossen! Neue Balance: € ${(participant.balance - totalPrice).toFixed(2)}` });

      clearCart();
      setParticipant(null);
      loadData();
      setTimeout(() => barcodeInputRef.current?.focus(), 100);

    } catch (error) {
      console.error('Checkout-Fehler:', error);
      toast({ variant: "destructive", title: "Fehler", description: "Checkout fehlgeschlagen." });
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
            <h2 className="text-2xl font-bold">Standard-Kasse</h2>
            <div className="text-right text-sm opacity-70">
              <p><strong>{activeCamp.name}</strong></p>
            </div>
          </div>

          {!participant ? (
            <Card className="content-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  Teilnehmer scannen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                  <Input
                    ref={barcodeInputRef}
                    placeholder="Barcode scannen oder eingeben..."
                    value={barcodeId}
                    onChange={e => setBarcodeId(e.target.value)}
                    className="themed-input flex-1"
                    autoFocus
                  />
                  <Button type="submit" className="primary-btn">
                    <Scan className="h-4 w-4 mr-2" />
                    Suchen
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="content-card">
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
              <CardContent>
                <form onSubmit={handleProductBarcodeSubmit} className="flex gap-2">
                  <Input
                    ref={productBarcodeRef}
                    placeholder="Produkt scannen oder eingeben..."
                    value={productBarcode}
                    onChange={e => setProductBarcode(e.target.value)}
                    className="themed-input flex-1"
                  />
                  <Button type="submit" className="primary-btn">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Hinzufügen
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Produkt-Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {products.map(product => (
              <Card 
                key={product.id} 
                className={`cursor-pointer transition-all hover:scale-105 ${product.stock <= 0 ? 'opacity-50' : ''}`}
                onClick={() => participant && addToCart(product)}
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
