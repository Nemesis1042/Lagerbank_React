import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, Receipt } from 'lucide-react';

export function StaffReceiptModal({ transaction, onClose }) {
  // Defensive Überprüfung der transaction Daten
  if (!transaction || !transaction.participant || !Array.isArray(transaction.transactions)) {
    console.error('StaffReceiptModal: Invalid transaction data', transaction);
    onClose();
    return null;
  }

  const { participant, totalPrice, cart, transactions } = transaction;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="content-card max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Mitarbeiter-Beleg
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card className="content-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {participant?.name || 'Unbekannter Mitarbeiter'}
              </CardTitle>
              <p className="text-sm opacity-70">Mitarbeiter-Einkauf</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(cart || []).map((item, index) => (
                  <div key={item?.id || index} className="flex justify-between">
                    <span>{item?.quantity || 0}x {item?.name || 'Unbekannt'}</span>
                    <span>€ {((item?.price || 0) * (item?.quantity || 0)).toFixed(2)}</span>
                  </div>
                ))}
                <hr className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Gesamt:</span>
                  <span>€ {(totalPrice || 0).toFixed(2)}</span>
                </div>
                <div className="text-xs opacity-70 mt-2">
                  Transaktions-IDs: {(transactions || []).map(t => t?.id || 'N/A').join(', ')}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-blue-50 p-3 rounded text-sm">
            <Receipt className="h-4 w-4 inline mr-2" />
            Dieser Beleg dient als Nachweis für den Mitarbeiter-Einkauf und kann bei Bedarf ausgedruckt werden.
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="primary-btn">
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}