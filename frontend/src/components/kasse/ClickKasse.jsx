import React, { useState, useEffect } from 'react';
import { Transaction } from '@/api/entities';
import { Participant } from '@/api/entities';
import { Product } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShoppingCart, Trash2, AlertTriangle, UserCheck, Users, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from "@/components/ui/use-toast";
import { ExternalDisplay } from '../ExternalDisplay';
import { StaffReceiptModal } from './StaffReceiptModal';
import { useCampData, useCart } from '../hooks/useCampData';
import AuditLogger from '../AuditLogger';

export function ClickKasse() {
  const [participant, setParticipant] = useState(null);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [showStaffReceipt, setShowStaffReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null); // 'participants' or 'staff'
  
  const { activeCamp, products, participants, isLoading, loadData } = useCampData();
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, totalPrice } = useCart();
  const { toast } = useToast();

  // Filter participants based on category and search term
  useEffect(() => {
    let baseParticipants = participants;
    
    // Filter by category first
    if (selectedCategory === 'participants') {
      baseParticipants = participants.filter(p => !p.is_staff);
    } else if (selectedCategory === 'staff') {
      baseParticipants = participants.filter(p => p.is_staff);
    }
    
    // Then filter by search term
    if (!searchTerm.trim()) {
      setFilteredParticipants(baseParticipants);
    } else {
      const filtered = baseParticipants.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.tn_id && p.tn_id.toString().includes(searchTerm))
      );
      setFilteredParticipants(filtered);
    }
  }, [searchTerm, participants, selectedCategory]);

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
      // Update balance
      await Participant.update(participant.id, { 
        balance: participant.balance - totalPrice 
      });

      // Create transactions
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
        
        if (transaction) {
          transactions.push(transaction);
          await Product.update(item.id, { stock: item.stock - item.quantity });
          await AuditLogger.logTransaction(transaction.id, participant.name, item.name, item.price * item.quantity, activeCamp.id);
        }
      }

      // Staff receipt
      if (participant.is_staff && transactions.length > 0) {
        setLastTransaction({ transactions, participant, totalPrice, cart: [...cart] });
        setShowStaffReceipt(true);
      }

      toast({ title: "Erfolg", description: `Kauf abgeschlossen! Neue Balance: € ${(participant.balance - totalPrice).toFixed(2)}` });

      // Reset
      clearCart();
      setParticipant(null);
      setSelectedCategory(null);
      loadData();

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
            <h2 className="text-2xl font-bold">Click-Kasse</h2>
            <div className="text-right text-sm opacity-70">
              <p><strong>{activeCamp.name}</strong></p>
              <p>{new Date(activeCamp.start_date).toLocaleDateString('de-DE')} - {new Date(activeCamp.end_date).toLocaleDateString('de-DE')}</p>
            </div>
          </div>

          {!participant ? (
            <>
              {!selectedCategory ? (
                /* Kategorie-Auswahl */
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                  <h3 className="text-xl font-semibold mb-4">Kategorie auswählen</h3>
                  <div className="flex gap-6">
                    <Card 
                      className="cursor-pointer transition-all hover:scale-105 content-card w-48"
                      onClick={() => setSelectedCategory('participants')}
                    >
                      <CardContent className="p-8 text-center">
                        <Users className="h-16 w-16 mx-auto text-gray-500 mb-4" />
                        <h4 className="text-lg font-semibold">TN</h4>
                        <p className="text-sm text-gray-600 mt-2">Teilnehmer</p>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className="cursor-pointer transition-all hover:scale-105 content-card w-48"
                      onClick={() => setSelectedCategory('staff')}
                    >
                      <CardContent className="p-8 text-center">
                        <UserCheck className="h-16 w-16 mx-auto text-blue-500 mb-4" />
                        <h4 className="text-lg font-semibold">MIA</h4>
                        <p className="text-sm text-gray-600 mt-2">Mitarbeiter</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <>
                  {/* Zurück Button */}
                  <div className="mb-4">
                    <Button 
                      onClick={() => {
                        setSelectedCategory(null);
                        setSearchTerm('');
                      }}
                      variant="outline"
                      className="mb-4"
                    >
                      ← Zurück zur Kategorieauswahl
                    </Button>
                  </div>

                  {/* Suchleiste */}
                  <Card className="content-card mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        {selectedCategory === 'participants' ? 'Teilnehmer' : 'Mitarbeiter'} suchen
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Nach Name oder TN-Nr. suchen..."
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="themed-input pl-10 pr-10"
                        />
                        {searchTerm && (
                          <Button
                            onClick={() => setSearchTerm('')}
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Teilnehmer/Mitarbeiter Grid */}
                  {filteredParticipants.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        {selectedCategory === 'participants' 
                          ? 'Keine Teilnehmer gefunden.' 
                          : 'Keine Mitarbeiter gefunden.'
                        }
                      </p>
                      <div className="text-sm text-gray-400 mt-2 space-y-1">
                        <p>Gesamt verfügbare Personen: {participants.length}</p>
                        <p>Teilnehmer (nicht Mitarbeiter): {participants.filter(p => !p.is_staff).length}</p>
                        <p>Mitarbeiter: {participants.filter(p => p.is_staff).length}</p>
                        <p>Aktuelle Kategorie: {selectedCategory}</p>
                        <p>Suchbegriff: "{searchTerm}"</p>
                        <p>Aktives Lager: {activeCamp?.name} (ID: {activeCamp?.id})</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredParticipants.map(p => (
                        <Card 
                          key={p.id} 
                          className="cursor-pointer transition-all hover:scale-105 content-card"
                          onClick={() => setParticipant(p)}
                        >
                          <CardContent className="p-4 text-center">
                            <div className="mb-2">
                              {p.is_staff ? <UserCheck className="h-8 w-8 mx-auto text-blue-500" /> : <Users className="h-8 w-8 mx-auto text-gray-500" />}
                            </div>
                            <h3 className="font-medium text-sm mb-1">{p.name}</h3>
                            {p.tn_id && <Badge variant="outline" className="text-xs mb-2">TN-{p.tn_id}</Badge>}
                            <p className={`text-lg font-bold ${p.balance <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                              € {p.balance.toFixed(2)}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {/* Ausgewählter Teilnehmer */}
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

              {/* Produkte */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            </>
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
                      <span>Gesamt:</span>
                      <span>€ {totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-3">
                    <Button onClick={processCheckout} className="w-full primary-btn">Bezahlen</Button>
                    <Button onClick={() => { clearCart(); setParticipant(null); setSelectedCategory(null); }} variant="outline" className="w-full">Abbrechen</Button>
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
