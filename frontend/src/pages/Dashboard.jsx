
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Participant } from '@/api/entities';
import { Product } from '@/api/entities';
import { Transaction } from '@/api/entities';
import { AppSettings } from '@/api/entities';
import { Camp } from '@/api/entities';
import StatCard from '../components/StatCard';
import { DollarSign, ShoppingBag, Users, BarChart, AlertTriangle, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

function DashboardContent() {
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalProductsSold: 0,
    totalRevenue: 0,
    participantCount: 0,
  });
  const [productSales, setProductSales] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [lowBalanceParticipants, setLowBalanceParticipants] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCamp, setActiveCamp] = useState(null);
  const { toast } = useToast();

  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (!isMounted.current) return;
    try {
      setIsLoading(true);
      
      // Lade aktives Lager
      const settings = await AppSettings.list();
      if (!isMounted.current) return;
      
      let currentCampId = null;
      let activeCampData = null;
      if (settings.length > 0 && settings[0].active_camp_id) {
        const camps = await Camp.list();
        if (!isMounted.current) return;
        
        activeCampData = camps.find(c => c.id === settings[0].active_camp_id);
        if (isMounted.current) setActiveCamp(activeCampData);
        currentCampId = settings[0].active_camp_id;
      } else {
        if (isMounted.current) setActiveCamp(null);
      }

      // Wenn kein aktives Lager gesetzt ist, zeige Warnung
      if (!currentCampId) {
        if (isMounted.current) {
          setStats({
            totalBalance: 0,
            totalProductsSold: 0,
            totalRevenue: 0,
            participantCount: 0,
          });
          setProductSales([]);
          setParticipants([]);
          setLowBalanceParticipants([]);
          setLowStockProducts([]);
          setRecentTransactions([]); // Reset recent transactions as well
          setIsLoading(false);
        }
        return;
      }

      // Lade Daten nur für das aktive Lager
      const [participantsData, products, transactionsData] = await Promise.all([
        Participant.filter({ camp_id: currentCampId }),
        Product.list(),
        Transaction.filter({ camp_id: currentCampId }, '-created_date', 50), // Lade die letzten 50 Transaktionen
      ]);

      if (!isMounted.current) return;

      setRecentTransactions(transactionsData);

      // Filtere nur echte Verkäufe (positive, nicht stornierte Preise)
      const salesTransactions = transactionsData.filter(t => t.total_price > 0 && !t.is_cancelled && !t.is_storno);

      setParticipants(participantsData);
      const totalBalance = participantsData.reduce((sum, p) => sum + (p.balance || 0), 0);
      const totalProductsSold = salesTransactions.reduce((sum, t) => sum + (t.quantity || 0), 0);
      const totalRevenue = salesTransactions.reduce((sum, t) => sum + (t.total_price || 0), 0);
      const participantCount = participantsData.filter(p => p.is_checked_in).length;

      setStats({ totalBalance, totalProductsSold, totalRevenue, participantCount });

      // Teilnehmer mit niedrigem Guthaben (≤ 5€) - nur vom aktuellen Lager
      const lowBalance = participantsData.filter(p => p.balance <= 5 && p.balance >= 0 && p.is_checked_in && !p.is_staff);
      setLowBalanceParticipants(lowBalance);

      // Produkte mit niedrigem Lagerbestand (≤ 5 oder 0)
      const lowStock = products.filter(p => p.stock <= 5);
      setLowStockProducts(lowStock);

      const salesData = products.map(product => {
        const sold = salesTransactions
          .filter(t => t.product_id === product.id)
          .reduce((sum, t) => sum + (t.quantity || 0), 0);
        const revenue = (product.price || 0) * sold;
        return { 
          id: product.id,
          name: product.name,
          icon: product.icon,
          price: product.price || 0,
          sold: sold,
          revenue: revenue
        };
      });
      
      salesData.sort((a, b) => b.sold - a.sold);
      if (isMounted.current) setProductSales(salesData);
    } catch (error) {
      if (isMounted.current) {
        console.error('Fehler beim Laden der Dashboard-Daten:', error);
        setStats({
          totalBalance: 0,
          totalProductsSold: 0,
          totalRevenue: 0,
          participantCount: 0,
        });
        setProductSales([]);
        setParticipants([]);
        setLowBalanceParticipants([]);
        setLowStockProducts([]);
        setRecentTransactions([]); // Reset recent transactions on error
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [isMounted]); // isMounted ref itself is stable

  useEffect(() => {
    isMounted.current = true;
    fetchData(); // Call fetchData
    return () => {
      isMounted.current = false;
    };
  }, [fetchData]); // Dependency on fetchData (which is stable via useCallback)

  const handleStorno = async (transaction) => {
    if (!transaction || transaction.is_cancelled || transaction.is_storno) {
        toast({ variant: "destructive", title: "Fehler", description: "Diese Transaktion wurde bereits storniert oder ist ungültig." });
        return;
    }

    try {
        // 1. Finde Produkt und Teilnehmer
        const [product] = await Product.filter({ id: transaction.product_id });
        const [participant] = await Participant.filter({ id: transaction.participant_id });

        if (!product || !participant) {
            toast({ variant: "destructive", title: "Fehler", description: "Zugehöriges Produkt oder Teilnehmer nicht gefunden." });
            return;
        }

        // 2. Erstelle Storno-Transaktion
        await Transaction.create({
            camp_id: transaction.camp_id,
            product_id: transaction.product_id,
            participant_id: transaction.participant_id,
            product_name: transaction.product_name,
            participant_name: transaction.participant_name,
            quantity: -transaction.quantity, // Negative quantity
            total_price: -transaction.total_price, // Negative total price
            is_storno: true, // Mark as storno transaction
            original_transaction_id: transaction.id,
            is_cancelled: false, // A storno booking itself cannot be cancelled
            created_date: new Date().toISOString(), // Use current date for the storno transaction
        });

        // 3. Markiere Original-Transaktion als storniert
        await Transaction.update(transaction.id, { is_cancelled: true });

        // 4. Passe Bestände und Guthaben an
        await Product.update(product.id, { stock: product.stock + transaction.quantity });
        await Participant.update(participant.id, { balance: participant.balance + transaction.total_price });

        toast({ title: "Erfolg", description: "Transaktion wurde storniert." });
        fetchData(); // Lade Daten neu
    } catch (err) {
        console.error('Fehler beim Stornieren:', err);
        toast({ variant: "destructive", title: "Fehler", description: `Fehler beim Stornieren: ${err.message}` });
    }
  };

  const formatCurrency = (value) => `€ ${(Number(value) || 0).toFixed(2)}`;

  // Bereite Daten für das Balkendiagramm vor (Top 10 Produkte)
  const chartData = productSales.slice(0, 10).map(product => ({
    name: product.name.length > 10 ? product.name.substring(0, 10) + '...' : product.name,
    verkauft: product.sold,
    umsatz: product.revenue
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-60 w-full" /> {/* Skeleton for recent transactions */}
      </div>
    );
  }

  // Warnung wenn kein aktives Lager gesetzt ist
  if (!activeCamp) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Kein aktives Lager</AlertTitle>
          <AlertDescription>
            Es ist kein Lager als aktiv markiert. Bitte gehen Sie zu <strong>Lager-Verwaltung</strong> und aktivieren Sie ein Lager, um das Dashboard zu nutzen.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="text-right">
          <p className="text-sm opacity-70">Aktives Lager:</p>
          <p className="font-semibold">{activeCamp.name}</p>
          <p className="text-xs opacity-60">
            {new Date(activeCamp.start_date).toLocaleDateString('de-DE')} - {new Date(activeCamp.end_date).toLocaleDateString('de-DE')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Gesamtguthaben in Kasse" value={formatCurrency(stats.totalBalance)} icon={DollarSign} color="text-green-500" />
        <StatCard title="Verkaufte Produkte" value={stats.totalProductsSold} icon={ShoppingBag} color="text-blue-500" />
        <StatCard title="Gesamtumsatz" value={formatCurrency(stats.totalRevenue)} icon={BarChart} color="text-yellow-500" />
        <StatCard title="Aktive Teilnehmer" value={stats.participantCount} icon={Users} color="text-[var(--color-primary)]" />
      </div>

      {/* Warnungen für niedrige Guthaben und Lagerbestände */}
      {(lowBalanceParticipants.length > 0 || lowStockProducts.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {lowBalanceParticipants.length > 0 && (
            <Card className="content-card border-yellow-400">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-700">
                  <AlertTriangle className="h-5 w-5" />
                  Teilnehmer mit niedrigem Guthaben ({lowBalanceParticipants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {lowBalanceParticipants.map(participant => (
                    <div key={participant.id} className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                      <span className="font-medium">{participant.name}</span>
                      <span className="text-yellow-700 font-semibold">€ {participant.balance.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {lowStockProducts.length > 0 && (
            <Card className="content-card border-red-400">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Produkte mit niedrigem Lagerbestand ({lowStockProducts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {lowStockProducts.map(product => (
                    <div key={product.id} className="flex justify-between items-center p-2 rounded" style={{backgroundColor: product.stock === 0 ? '#fee2e2' : '#fef3c7'}}>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{product.icon}</span>
                        <span className="font-medium">{product.name}</span>
                      </div>
                      <Badge className={product.stock === 0 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                        {product.stock === 0 ? 'Ausverkauft' : `${product.stock} verfügbar`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="content-card">
        <CardHeader>
          <CardTitle>Letzte Transaktionen</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zeit</TableHead>
                  <TableHead>Teilnehmer</TableHead>
                  <TableHead>Produkt</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                  <TableHead className="text-center">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions && recentTransactions.length > 0 ? recentTransactions.map((transaction, index) => {
                  // Defensive Überprüfung: Überspringe undefined/null Transaktionen
                  if (!transaction || !transaction.id) {
                    console.warn('Überspringe undefined transaction at index:', index);
                    return null;
                  }

                  return (
                    <TableRow key={transaction.id} className={`themed-list-item ${transaction.is_cancelled || transaction.is_storno ? 'opacity-50' : ''}`}>
                      <TableCell className="text-xs">
                        {transaction.created_date ? new Date(transaction.created_date).toLocaleTimeString('de-DE') : 'N/A'}
                      </TableCell>
                      <TableCell>{transaction.participant_name || 'Unbekannt'}</TableCell>
                      <TableCell>
                          {transaction.is_storno && <Badge variant="destructive" className="mr-2">Storno</Badge>}
                          {transaction.product_name || 'Unbekannt'}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${(transaction.total_price || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        € {(Number(transaction.total_price) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                          {(transaction.total_price || 0) > 0 && !transaction.is_cancelled && !transaction.is_storno ? (
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Storno
                                      </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>Transaktion stornieren?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              Möchten Sie den Kauf von "{transaction.product_name || 'Unbekannt'}" ({transaction.quantity || 0}x) durch {transaction.participant_name || 'Unbekannt'} für € {(Number(transaction.total_price) || 0).toFixed(2)} wirklich stornieren? Das Guthaben wird zurückgebucht und der Lagerbestand angepasst.
                                          </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleStorno(transaction)}>Stornieren</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          ) : (transaction.is_cancelled && <Badge>Storniert</Badge>)}
                      </TableCell>
                    </TableRow>
                  );
                }).filter(Boolean) : ( // Filter out null entries
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                            Noch keine Transaktionen vorhanden.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Verkaufsdiagramm */}
      {chartData.length > 0 && (
        <Card className="content-card">
          <CardHeader>
            <CardTitle>Top 10 verkaufte Produkte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'verkauft' ? `${value} Stück` : `€ ${value.toFixed(2)}`,
                      name === 'verkauft' ? 'Verkauft' : 'Umsatz'
                    ]}
                  />
                  <Bar dataKey="verkauft" fill="var(--color-primary)" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="content-card">
        <CardHeader>
          <CardTitle>Verkaufsstatistik (Alle Produkte)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produkt</TableHead>
                <TableHead className="text-center">Preis</TableHead>
                <TableHead className="text-center">Verkauft</TableHead>
                <TableHead className="text-right">Umsatz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productSales.map(product => (
                <TableRow key={product.id} className="themed-list-item">
                  <TableCell className="flex items-center gap-3">
                    <span className="text-xl">{product.icon}</span>
                    <span className="font-medium">{product.name}</span>
                  </TableCell>
                  <TableCell className="text-center">{formatCurrency(product.price)}</TableCell>
                  <TableCell className="text-center font-semibold">{product.sold}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">{formatCurrency(product.revenue)}</TableCell>
                </TableRow>
              ))}
              {productSales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                    Noch keine Verkäufe vorhanden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
