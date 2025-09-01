import { useState, useEffect, useRef, useCallback } from 'react';
import { AppSettings } from '@/api/entities';
import { Camp } from '@/api/entities';
import { Product } from '@/api/entities';
import { Participant } from '@/api/entities';
import { useToast } from "@/components/ui/use-toast";

// Custom Hook für Lager-Daten
export function useCampData() {
  const [activeCamp, setActiveCamp] = useState(null);
  const [products, setProducts] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setIsLoading(true);
      
      // Lade Settings
      const settings = await AppSettings.list();
      if (!isMountedRef.current) return;
      
      let activeCampData = null;
      if (settings.length > 0 && settings[0].active_camp_id) {
        const camps = await Camp.list();
        if (!isMountedRef.current) return;
        activeCampData = camps.find(c => c.id === settings[0].active_camp_id);
      }
      
      setActiveCamp(activeCampData);
      
      if (!activeCampData) {
        setProducts([]);
        setParticipants([]);
        return;
      }

      // Lade Produkte und Teilnehmer parallel
      const [productsData, participantsData] = await Promise.all([
        Product.list(),
        Participant.filter({ camp_id: activeCampData.id })
      ]);
      
      if (!isMountedRef.current) return;
      
      // Sortiere Teilnehmer
      participantsData.sort((a, b) => {
        if (!a.tn_id && !b.tn_id) return a.name.localeCompare(b.name);
        if (!a.tn_id) return 1;
        if (!b.tn_id) return -1;
        return a.tn_id - b.tn_id;
      });
      
      setProducts(productsData);
      setParticipants(participantsData);
      
    } catch (error) {
      if (!isMountedRef.current) return;
      if (error.message === 'Request aborted' || error.name === 'AbortError') return;
      
      console.error('Fehler beim Laden:', error);
      toast({ variant: "destructive", title: "Fehler", description: "Daten konnten nicht geladen werden." });
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    isMountedRef.current = true;
    loadData();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  return { activeCamp, products, participants, isLoading, loadData };
}

// Custom Hook für Warenkorb-Logik
export function useCart() {
  const [cart, setCart] = useState([]);
  const { toast } = useToast();

  const addToCart = useCallback((product) => {
    if (product.stock <= 0) {
      toast({ variant: "destructive", title: "Fehler", description: `${product.name} ist ausverkauft.` });
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast({ variant: "destructive", title: "Fehler", description: "Nicht genug Lagerbestand." });
          return prev;
        }
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, [toast]);

  const removeFromCart = useCallback((productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, newQuantity, products) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (newQuantity > product.stock) {
      toast({ variant: "destructive", title: "Fehler", description: "Nicht genug Lagerbestand." });
      return;
    }

    setCart(prev => prev.map(item => 
      item.id === productId ? { ...item, quantity: newQuantity } : item
    ));
  }, [removeFromCart, toast]);

  const clearCart = useCallback(() => setCart([]), []);

  const totalPrice = cart.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * item.quantity), 0);

  return { cart, addToCart, removeFromCart, updateQuantity, clearCart, totalPrice };
}
