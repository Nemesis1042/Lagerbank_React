
import React, { useState, useEffect, useCallback } from 'react';
import { Product } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ClipboardList, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import AuditLogger from '../components/AuditLogger';

function InventurContent() {
  const [products, setProducts] = useState([]);
  const [inventoryData, setInventoryData] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const loadProducts = useCallback(async () => {
    try {
      const productsData = await Product.list();
      setProducts(productsData);
      
      // Initialisiere Inventar-Daten mit aktuellen Beständen
      const initialInventory = {};
      productsData.forEach(product => {
        initialInventory[product.id] = {
          currentStock: product.stock,
          countedStock: product.stock, // Standardmäßig auf aktuellen Bestand setzen
          difference: 0
        };
      });
      setInventoryData(initialInventory);
    } catch (error) {
      console.error('Fehler beim Laden der Produkte:', error);
      toast({ variant: "destructive", title: "Fehler", description: "Produkte konnten nicht geladen werden." });
    }
  }, [toast]); // Added toast to the dependency array

  useEffect(() => {
    loadProducts();
  }, [loadProducts]); // Changed dependency from [] to [loadProducts]

  const updateCountedStock = (productId, countedStock) => {
    const counted = parseInt(countedStock) || 0;
    setInventoryData(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        countedStock: counted,
        difference: counted - prev[productId].currentStock
      }
    }));
  };

  const updateAllInventory = async () => {
    setIsUpdating(true);
    try {
      let updatedCount = 0;
      let totalDifference = 0;

      for (const product of products) {
        const inventoryItem = inventoryData[product.id];
        if (inventoryItem && inventoryItem.countedStock !== inventoryItem.currentStock) {
          await Product.update(product.id, { stock: inventoryItem.countedStock });
          
          // Log inventory adjustment
          await AuditLogger.log(
            'inventory_adjusted',
            'Product',
            product.id,
            {
              product_name: product.name,
              old_stock: inventoryItem.currentStock,
              new_stock: inventoryItem.countedStock,
              difference: inventoryItem.difference
            }
          );

          updatedCount++;
          totalDifference += Math.abs(inventoryItem.difference);
        }
      }

      toast({ 
        title: "Erfolg", 
        description: `${updatedCount} Produkte aktualisiert. Gesamtdifferenz: ${totalDifference} Stück.` 
      });
      
      // Lade Daten neu
      loadProducts();

    } catch (error) {
      console.error('Fehler beim Aktualisieren der Inventur:', error);
      toast({ variant: "destructive", title: "Fehler", description: "Inventur konnte nicht aktualisiert werden." });
    } finally {
      setIsUpdating(false);
    }
  };

  const resetToCurrentStock = () => {
    const resetInventory = {};
    products.forEach(product => {
      resetInventory[product.id] = {
        currentStock: product.stock,
        countedStock: product.stock,
        difference: 0
      };
    });
    setInventoryData(resetInventory);
    toast({ description: "Inventur auf aktuelle Bestände zurückgesetzt." });
  };

  const hasChanges = products.some(product => {
    const inventoryItem = inventoryData[product.id];
    return inventoryItem && inventoryItem.countedStock !== inventoryItem.currentStock;
  });

  const totalDifferences = products.reduce((sum, product) => {
    const inventoryItem = inventoryData[product.id];
    return sum + Math.abs(inventoryItem?.difference || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Inventur
          </h1>
          <p className="text-gray-600 mt-1">
            Bestandsaufnahme und Lagerbestand-Anpassungen
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={resetToCurrentStock} variant="outline">
            Zurücksetzen
          </Button>
          <Button 
            onClick={updateAllInventory} 
            className="primary-btn"
            disabled={!hasChanges || isUpdating}
          >
            {isUpdating ? 'Aktualisiere...' : 'Inventur übernehmen'}
          </Button>
        </div>
      </div>

      {/* Übersicht */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="content-card">
          <CardContent className="p-6 text-center">
            <Package className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{products.length}</p>
            <p className="text-sm text-gray-600">Produkte</p>
          </CardContent>
        </Card>
        
        <Card className="content-card">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{totalDifferences}</p>
            <p className="text-sm text-gray-600">Gesamtdifferenz</p>
          </CardContent>
        </Card>

        <Card className="content-card">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{hasChanges ? 'Änderungen' : 'Aktuell'}</p>
            <p className="text-sm text-gray-600">Status</p>
          </CardContent>
        </Card>
      </div>

      {hasChanges && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ungespeicherte Änderungen</AlertTitle>
          <AlertDescription>
            Sie haben Bestandsänderungen vorgenommen. Klicken Sie auf "Inventur übernehmen", um die Änderungen zu speichern.
          </AlertDescription>
        </Alert>
      )}

      {/* Inventur-Tabelle */}
      <Card className="content-card">
        <CardHeader>
          <CardTitle>Bestandsaufnahme</CardTitle>
          <CardDescription>
            Tragen Sie die tatsächlich gezählten Bestände in die "Gezählt"-Spalte ein.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produkt</TableHead>
                <TableHead className="text-center">Aktueller Bestand</TableHead>
                <TableHead className="text-center">Gezählt</TableHead>
                <TableHead className="text-center">Differenz</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(product => {
                const inventoryItem = inventoryData[product.id];
                if (!inventoryItem) return null;

                const difference = inventoryItem.difference;
                const hasChange = difference !== 0;

                return (
                  <TableRow key={product.id} className="themed-list-item">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{product.icon}</span>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-500">€ {product.price.toFixed(2)}</p>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center font-mono text-lg">
                      {inventoryItem.currentStock}
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        value={inventoryItem.countedStock}
                        onChange={(e) => updateCountedStock(product.id, e.target.value)}
                        className="w-20 text-center themed-input"
                        min="0"
                      />
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <span 
                        className={`font-mono font-bold ${
                          difference > 0 ? 'text-green-600' : 
                          difference < 0 ? 'text-red-600' : 
                          'text-gray-500'
                        }`}
                      >
                        {difference > 0 ? '+' : ''}{difference}
                      </span>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      {hasChange ? (
                        <Badge className={difference > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {difference > 0 ? 'Überschuss' : 'Fehlbestand'}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Korrekt</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    Keine Produkte vorhanden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Hinweise */}
      <Alert>
        <ClipboardList className="h-4 w-4" />
        <AlertTitle>Inventur-Hinweise</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Zählen Sie alle physisch vorhandenen Produkte</li>
            <li>Grüne Differenzen = Überschuss (mehr als im System)</li>
            <li>Rote Differenzen = Fehlbestand (weniger als im System)</li>
            <li>Alle Änderungen werden im Audit-Log dokumentiert</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default function InventurPage() {
  return <InventurContent />;
}
