
import React, { useState, useEffect } from 'react';
import { Product } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Plus, Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AdminProtectedRoute } from '../components/ProtectedRoute';
import { Badge } from '@/components/ui/badge';

const EMOJI_OPTIONS = ["🥤", "🍊", "💧", "🍫", "☕", "🍺", "🥛", "🧃", "🍕", "🍔", "🍟", "🌭", "🥨", "🍪", "🍰", "🍎", "🍌", "🍇"];

function ProductForm({ product, onFinished }) {
  const [formData, setFormData] = useState(product || { name: '', price: 0, icon: '🥤', stock: 100, barcode: '' });

  const handleSave = async () => {
    if (product) {
      await Product.update(product.id, formData);
    } else {
      await Product.create(formData);
    }
    onFinished();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{product ? 'Produkt bearbeiten' : 'Neues Produkt anlegen'}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">Name</Label>
          <Input 
            id="name" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })} 
            className="col-span-3 themed-input" 
            placeholder="z.B. Cola, Fanta, Wasser"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="price" className="text-right">Preis (€)</Label>
          <Input 
            id="price" 
            type="number" 
            step="0.01"
            value={formData.price} 
            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} 
            className="col-span-3 themed-input" 
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="barcode" className="text-right">Barcode</Label>
          <Input 
            id="barcode" 
            value={formData.barcode} 
            onChange={e => setFormData({ ...formData, barcode: e.target.value })} 
            className="col-span-3 themed-input" 
            placeholder="Optional: Barcode für Scanner"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right">Symbol</Label>
          <div className="col-span-3">
            <div className="grid grid-cols-6 gap-2">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  className={`p-2 text-2xl border rounded hover:bg-gray-100 ${formData.icon === emoji ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                  onClick={() => setFormData({ ...formData, icon: emoji })}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="stock" className="text-right">Lagerbestand</Label>
          <Input 
            id="stock" 
            type="number" 
            value={formData.stock} 
            onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} 
            className="col-span-3 themed-input" 
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave} className="primary-btn">Speichern</Button>
      </DialogFooter>
    </>
  );
}

function RestockDialog({ product, onFinished }) {
  const [amount, setAmount] = useState(0);

  const handleRestock = async () => {
    if (amount > 0) {
      await Product.update(product.id, { stock: product.stock + amount });
      onFinished();
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Lager auffüllen: {product.name}</DialogTitle>
      </DialogHeader>
      <div className="py-4 space-y-4">
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-sm"><strong>Aktueller Bestand:</strong> {product.stock} Stück</p>
        </div>
        <div>
          <Label htmlFor="restock-amount">Menge hinzufügen</Label>
          <Input 
            id="restock-amount" 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(parseInt(e.target.value) || 0)} 
            className="themed-input"
            placeholder="Anzahl der hinzuzufügenden Artikel"
          />
        </div>
        <div className="p-3 bg-blue-50 rounded">
          <p className="text-sm"><strong>Neuer Bestand:</strong> {product.stock + amount} Stück</p>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleRestock} disabled={amount <= 0} className="primary-btn">
          <Plus className="h-4 w-4 mr-2" />
          Auffüllen
        </Button>
      </DialogFooter>
    </>
  );
}

function ProdukteContent() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [restockingProduct, setRestockingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProducts = async () => {
    const data = await Product.list('-created_date');
    setProducts(data);
    setFilteredProducts(data);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    // Filter products based on search term
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const onFormFinished = () => {
    fetchProducts();
    setIsFormOpen(false);
    setIsRestockOpen(false);
    setEditingProduct(null);
    setRestockingProduct(null);
  };

  const handleDelete = async (productId) => {
    await Product.delete(productId);
    fetchProducts();
  };

  const getStockBadge = (stock) => {
    if (stock === 0) {
      return <Badge className="bg-red-100 text-red-800">Ausverkauft</Badge>;
    } else if (stock <= 5) {
      return <Badge className="bg-yellow-100 text-yellow-800">Niedrig ({stock})</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800">Verfügbar ({stock})</Badge>;
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Produkte verwalten</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingProduct(null)} className="primary-btn">
              <PlusCircle className="mr-2 h-4 w-4" /> Neues Produkt
            </Button>
          </DialogTrigger>
          <DialogContent className="content-card">
            <ProductForm product={editingProduct} onFinished={onFormFinished} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Suchleiste */}
      <Card className="content-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Produkte suchen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Nach Produktname oder Barcode suchen..."
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
              {filteredProducts.length} von {products.length} Produkten gefunden
            </p>
          )}
        </CardContent>
      </Card>

      {/* Restock Dialog */}
      <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
        <DialogContent className="content-card">
          {restockingProduct && (
            <RestockDialog product={restockingProduct} onFinished={onFormFinished} />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Mobile View: Card List */}
      <div className="md:hidden space-y-4">
          {filteredProducts.map(product => (
            <Card key={product.id} className="content-card">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{product.icon}</span>
                        <div>
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                            <p className="text-sm text-gray-500">€ {(Number(product.price) || 0).toFixed(2)}</p>
                        </div>
                    </div>
                    {getStockBadge(product.stock)}
                </CardHeader>
                <CardContent>
                    {product.barcode && <p className="font-mono text-sm text-gray-500">Barcode: {product.barcode}</p>}
                    <div className="flex gap-2 pt-3 mt-3 border-t border-dashed">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingProduct(product); setIsFormOpen(true); }}><Edit className="h-4 w-4 mr-2" />Bearbeiten</Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => { setRestockingProduct(product); setIsRestockOpen(true); }}><Plus className="h-4 w-4 mr-2" />Auffüllen</Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="flex-1"><Trash2 className="h-4 w-4 mr-2" />Löschen</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Produkt löschen</AlertDialogTitle>
                                    <AlertDialogDescription>Möchten Sie "{product.name}" wirklich löschen?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(product.id)}>Löschen</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>
          ))}
          {filteredProducts.length === 0 && products.length > 0 && (
                <Card className="content-card">
                  <CardContent className="py-8 text-center text-gray-500">
                    Keine Produkte mit "{searchTerm}" gefunden.
                  </CardContent>
                </Card>
              )}
              {products.length === 0 && (
                <Card className="content-card">
                  <CardContent className="py-8 text-center text-gray-500">
                    Noch keine Produkte angelegt.
                  </CardContent>
                </Card>
              )}
      </div>

      {/* Desktop View: Table */}
      <Card className="content-card hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Preis</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Lagerbestand</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(product => (
                <TableRow key={product.id} className="themed-list-item">
                  <TableCell className="text-2xl">{product.icon}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>€ {(Number(product.price) || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-sm">{product.barcode || '—'}</TableCell>
                  <TableCell>{getStockBadge(product.stock)}</TableCell>
                  <TableCell className="space-x-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => { setEditingProduct(product); setIsFormOpen(true); }}
                      title="Bearbeiten"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => { setRestockingProduct(product); setIsRestockOpen(true); }}
                      title="Lager auffüllen"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" title="Löschen">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Produkt löschen</AlertDialogTitle>
                          <AlertDialogDescription>
                            Möchten Sie das Produkt "{product.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(product.id)}>
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && products.length > 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    Keine Produkte mit "{searchTerm}" gefunden.
                  </TableCell>
                </TableRow>
              )}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    Noch keine Produkte angelegt.
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

export default function ProduktePage() {
  return <ProdukteContent />;
}
