
import React, { useState, useEffect, useRef } from 'react';
import { Participant } from '@/api/entities';
import { Transaction } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Printer, User, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function StaffReport({ participant, transactions, totalAmount }) {
  const printableRef = useRef(null);

  const handlePrint = () => {
    const printContent = printableRef.current;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent.outerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  // Gruppiere Transaktionen nach Produkt
  const groupedTransactions = transactions.reduce((acc, transaction) => {
    const key = transaction.product_name;
    if (!acc[key]) {
      acc[key] = {
        product_name: transaction.product_name,
        total_quantity: 0,
        total_price: 0,
        unit_price: transaction.total_price / transaction.quantity
      };
    }
    acc[key].total_quantity += transaction.quantity;
    acc[key].total_price += transaction.total_price;
    return acc;
  }, {});

  const groupedItems = Object.values(groupedTransactions);

  return (
    <Card className="mt-6 content-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Mitarbeiter-Abrechnung: {participant.name}</span>
          <Button onClick={handlePrint} className="flex items-center gap-2 primary-btn">
            <Printer className="h-4 w-4" />
            Drucken
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={printableRef} className="bg-white p-6 space-y-6">
          <div className="text-center border-b pb-4">
            <h1 className="text-3xl font-bold">Zeltlager-Kasse</h1>
            <h2 className="text-2xl">Mitarbeiter-Abrechnung</h2>
            <p className="text-gray-600 mt-2">Erstellt am: {new Date().toLocaleDateString('de-DE')}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 border-b pb-4">
            <div>
              <h3 className="font-bold text-lg mb-2">Mitarbeiter-Daten</h3>
              <p><strong>Name:</strong> {participant.name}</p>
              <p><strong>ID:</strong> {participant.barcode_id}</p>
              <p><strong>Status:</strong> Mitarbeiter</p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Zusammenfassung</h3>
              <p><strong>Anzahl Käufe:</strong> {transactions.length}</p>
              <p><strong>Gesamtbetrag:</strong> € {totalAmount.toFixed(2)}</p>
            </div>
          </div>
          
          {groupedItems.length > 0 ? (
            <div>
              <h3 className="font-bold text-lg mb-4">Detaillierte Aufstellung der Käufe</h3>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-left">Artikel</th>
                    <th className="border border-gray-300 p-3 text-center">Gesamtanzahl</th>
                    <th className="border border-gray-300 p-3 text-right">Einzelpreis</th>
                    <th className="border border-gray-300 p-3 text-right">Gesamtpreis</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedItems.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-3">{item.product_name}</td>
                      <td className="border border-gray-300 p-3 text-center">{item.total_quantity}</td>
                      <td className="border border-gray-300 p-3 text-right">€ {item.unit_price.toFixed(2)}</td>
                      <td className="border border-gray-300 p-3 text-right">€ {item.total_price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan="3" className="border border-gray-300 p-3 text-right">Gesamtbetrag:</td>
                    <td className="border border-gray-300 p-3 text-right">€ {totalAmount.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Für diesen Mitarbeiter wurden keine Käufe erfasst.</p>
            </div>
          )}
          
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              Dieser Betrag wird vom Mitarbeiter-Konto abgebucht oder ist als Spesenabrechnung zu verwenden.
            </p>
            <div className="mt-4 flex justify-between">
              <div>
                <p className="text-xs text-gray-500">Unterschrift Mitarbeiter:</p>
                <div className="border-b border-gray-300 w-48 mt-4"></div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Unterschrift Leitung:</p>
                <div className="border-b border-gray-300 w-48 mt-4"></div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AllStaffReports({ allStaffData }) {
  const printableRef = useRef(null);

  const handlePrintAll = () => {
    const printContent = printableRef.current;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent.outerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  const totalAllStaff = allStaffData.reduce((sum, staff) => sum + staff.totalAmount, 0);

  return (
    <Card className="mt-6 content-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Alle Mitarbeiter-Abrechnungen ({allStaffData.length} Mitarbeiter)</span>
          <Button onClick={handlePrintAll} className="flex items-center gap-2 primary-btn">
            <Printer className="h-4 w-4" />
            Alle drucken
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={printableRef} className="bg-white">
          {allStaffData.map((staffData, staffIndex) => {
            const { participant, transactions, totalAmount } = staffData;
            
            // Gruppiere Transaktionen nach Produkt
            const groupedTransactions = transactions.reduce((acc, transaction) => {
              const key = transaction.product_name;
              if (!acc[key]) {
                acc[key] = {
                  product_name: transaction.product_name,
                  total_quantity: 0,
                  total_price: 0,
                  unit_price: transaction.total_price / transaction.quantity
                };
              }
              acc[key].total_quantity += transaction.quantity;
              acc[key].total_price += transaction.total_price;
              return acc;
            }, {});

            const groupedItems = Object.values(groupedTransactions);

            return (
              <div key={participant.id} className={`p-6 space-y-6 ${staffIndex > 0 ? 'border-t-2 border-gray-300 mt-8' : ''}`} style={{ pageBreakAfter: 'always' }}>
                <div className="text-center border-b pb-4">
                  <h1 className="text-3xl font-bold">Zeltlager-Kasse</h1>
                  <h2 className="text-2xl">Mitarbeiter-Abrechnung</h2>
                  <p className="text-gray-600 mt-2">Erstellt am: {new Date().toLocaleDateString('de-DE')}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-6 border-b pb-4">
                  <div>
                    <h3 className="font-bold text-lg mb-2">Mitarbeiter-Daten</h3>
                    <p><strong>Name:</strong> {participant.name}</p>
                    <p><strong>ID:</strong> {participant.barcode_id}</p>
                    <p><strong>Status:</strong> Mitarbeiter</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Zusammenfassung</h3>
                    <p><strong>Anzahl Käufe:</strong> {transactions.length}</p>
                    <p><strong>Gesamtbetrag:</strong> € {totalAmount.toFixed(2)}</p>
                  </div>
                </div>
                
                {groupedItems.length > 0 ? (
                  <div>
                    <h3 className="font-bold text-lg mb-4">Detaillierte Aufstellung der Käufe</h3>
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-3 text-left">Artikel</th>
                          <th className="border border-gray-300 p-3 text-center">Gesamtanzahl</th>
                          <th className="border border-gray-300 p-3 text-right">Einzelpreis</th>
                          <th className="border border-gray-300 p-3 text-right">Gesamtpreis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedItems.map((item, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 p-3">{item.product_name}</td>
                            <td className="border border-gray-300 p-3 text-center">{item.total_quantity}</td>
                            <td className="border border-gray-300 p-3 text-right">€ {item.unit_price.toFixed(2)}</td>
                            <td className="border border-gray-300 p-3 text-right">€ {item.total_price.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 font-bold">
                          <td colSpan="3" className="border border-gray-300 p-3 text-right">Gesamtbetrag:</td>
                          <td className="border border-gray-300 p-3 text-right">€ {totalAmount.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Keine Transaktionen vorhanden</p>
                  </div>
                )}
                
                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Dieser Betrag wird vom Mitarbeiter-Konto abgebucht oder ist als Spesenabrechnung zu verwenden.
                  </p>
                  <div className="mt-4 flex justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Unterschrift Mitarbeiter:</p>
                      <div className="border-b border-gray-300 w-48 mt-4"></div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Unterschrift Leitung:</p>
                      <div className="border-b border-gray-300 w-48 mt-4"></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Zusammenfassung aller Mitarbeiter auf letzter Seite */}
          <div className="p-6 space-y-6 border-t-2 border-gray-300 mt-8">
            <div className="text-center border-b pb-4">
              <h1 className="text-3xl font-bold">Zeltlager-Kasse</h1>
              <h2 className="text-2xl">Gesamtübersicht Mitarbeiter</h2>
              <p className="text-gray-600 mt-2">Erstellt am: {new Date().toLocaleDateString('de-DE')}</p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-4">Übersicht aller Mitarbeiter-Ausgaben</h3>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-left">Mitarbeiter</th>
                    <th className="border border-gray-300 p-3 text-center">ID</th>
                    <th className="border border-gray-300 p-3 text-center">Anzahl Käufe</th>
                    <th className="border border-gray-300 p-3 text-right">Gesamtbetrag</th>
                  </tr>
                </thead>
                <tbody>
                  {allStaffData.map(({ participant, transactions, totalAmount }) => (
                    <tr key={participant.id}>
                      <td className="border border-gray-300 p-3">{participant.name}</td>
                      <td className="border border-gray-300 p-3 text-center">{participant.barcode_id}</td>
                      <td className="border border-gray-300 p-3 text-center">{transactions.length}</td>
                      <td className="border border-gray-300 p-3 text-right">€ {totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan="3" className="border border-gray-300 p-3 text-right">Gesamtbetrag alle Mitarbeiter:</td>
                    <td className="border border-gray-300 p-3 text-right">€ {totalAllStaff.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MitarbeiterBerichteContent() {
  const [staffMembers, setStaffMembers] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [allStaffData, setAllStaffData] = useState([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  useEffect(() => {
    let isMounted = true; // Flag to track if the component is mounted
    async function fetchStaffMembers() {
      try {
        const staff = await Participant.filter({ is_staff: true });
        if (isMounted) { // Only update state if component is still mounted
          setStaffMembers(staff);
        }
      } catch (error) {
        console.error("Failed to fetch staff members:", error);
      }
    }
    fetchStaffMembers();
    return () => {
      isMounted = false; // Set flag to false when component unmounts
    };
  }, []);

  const handleStaffSelect = async (staffId) => {
    const staff = staffMembers.find(s => s.id === staffId);
    setSelectedStaff(staff);
    
    if (staff) {
      const staffTransactions = await Transaction.filter({ participant_id: staffId });
      setTransactions(staffTransactions);
      const total = staffTransactions.reduce((sum, t) => sum + t.total_price, 0);
      setTotalAmount(total);
    }
  };

  const handleLoadAllStaff = async () => {
    setIsLoadingAll(true);
    const allData = [];
    
    for (const staff of staffMembers) {
      const staffTransactions = await Transaction.filter({ participant_id: staff.id });
      const totalAmount = staffTransactions.reduce((sum, t) => sum + t.total_price, 0);
      
      allData.push({
        participant: staff,
        transactions: staffTransactions,
        totalAmount
      });
    }
    
    setAllStaffData(allData);
    setIsLoadingAll(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Mitarbeiter-Berichte</h1>
      
      <Card className="content-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Berichte erstellen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center flex-wrap">
            <Select onValueChange={handleStaffSelect}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Einzelner Mitarbeiter..." />
              </SelectTrigger>
              <SelectContent>
                {staffMembers.map(staff => (
                  <SelectItem key={staff.id} value={staff.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {staff.name} ({staff.barcode_id})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <span className="opacity-80">oder</span>
              <Button 
                onClick={handleLoadAllStaff} 
                disabled={isLoadingAll || staffMembers.length === 0}
                className="flex items-center gap-2 primary-btn"
              >
                <Users className="h-4 w-4" />
                {isLoadingAll ? 'Lade...' : 'Alle Mitarbeiter laden'}
              </Button>
            </div>
            
            {selectedStaff && (
              <Badge className="bg-purple-100 text-purple-800">
                {transactions.length} Transaktionen
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedStaff && (
        <StaffReport 
          participant={selectedStaff}
          transactions={transactions}
          totalAmount={totalAmount}
        />
      )}

      {allStaffData.length > 0 && (
        <AllStaffReports allStaffData={allStaffData} />
      )}

      {staffMembers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Keine Mitarbeiter gefunden. Bitte legen Sie zunächst Mitarbeiter in der Teilnehmer-Verwaltung an.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function MitarbeiterBerichtePage() {
  return <MitarbeiterBerichteContent />;
}
