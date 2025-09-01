
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Usb, XCircle, Zap, ZapOff } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export function ExternalDisplay({ numberToSend }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const portRef = useRef(null);
  const writerRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serial' in navigator) {
      setIsSupported(true);
    }
  }, []);

  const connect = async () => {
    if (!isSupported) {
      setError('Web Serial API wird von diesem Browser nicht unterstützt.');
      return;
    }
    try {
      setError('');
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      writerRef.current = port.writable.getWriter();
      setIsConnected(true);
      toast({ title: 'Erfolg', description: 'Externes Display verbunden.' });
    } catch (err) {
      setError(err.message);
      toast({ variant: 'destructive', title: 'Fehler', description: 'Verbindung fehlgeschlagen.' });
    }
  };

  const disconnect = useCallback(async () => {
    if (writerRef.current) {
      try {
        await writerRef.current.close();
      } catch (err) {
        console.warn('Fehler beim Schließen des Writers:', err);
      }
    }
    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch (err) {
        console.warn('Fehler beim Schließen des Ports:', err);
      }
    }
    portRef.current = null;
    writerRef.current = null;
    setIsConnected(false);
    toast({ description: 'Verbindung zum Display getrennt.' });
  }, [toast]);

  useEffect(() => {
    const sendData = async () => {
      if (isConnected && writerRef.current) {
        const data = numberToSend ? String(numberToSend) : '---';
        const encoder = new TextEncoder();
        try {
          await writerRef.current.write(encoder.encode(data + '\n')); // Sende mit Zeilenumbruch
        } catch (err) {
            setError('Fehler beim Senden der Daten: ' + err.message);
            await disconnect();
        }
      }
    };
    sendData();
  }, [numberToSend, isConnected, disconnect]);
  
  // Automatisches Trennen beim Entladen der Komponente
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [isConnected, disconnect]);

  if (!isSupported) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Nicht unterstützt</AlertTitle>
        <AlertDescription>
          Die Web Serial API ist in Ihrem Browser nicht verfügbar. Bitte verwenden Sie Chrome oder Edge.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="content-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Externes Display</CardTitle>
        {isConnected ? <Zap className="h-5 w-5 text-green-500" /> : <ZapOff className="h-5 w-5 text-gray-400" />}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500">
            Verbinden Sie einen Mikrocontroller (z.B. Arduino) per USB, um die TN-Nummer auf einem externen Display anzuzeigen.
        </p>
        {!isConnected ? (
          <Button onClick={connect} className="w-full">
            <Usb className="mr-2 h-4 w-4" />
            Display verbinden
          </Button>
        ) : (
          <Button onClick={disconnect} variant="outline" className="w-full">
            Verbindung trennen
          </Button>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </CardContent>
    </Card>
  );
}
