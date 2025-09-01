import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wifi, WifiOff, Smartphone, AlertCircle } from 'lucide-react';

export function NFCReader({ onNFCRead, placeholder = "NFC-Tag scannen...", disabled = false }) {
  const [isNFCSupported, setIsNFCSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [lastRead, setLastRead] = useState('');
  const [ndefReader, setNdefReader] = useState(null);

  useEffect(() => {
    // Prüfe NFC-Unterstützung
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setIsNFCSupported(true);
    } else {
      setIsNFCSupported(false);
      setError('NFC wird von diesem Browser/Gerät nicht unterstützt. Verwenden Sie Chrome auf Android.');
    }
  }, []);

  const startNFCScanning = async () => {
    if (!isNFCSupported) {
      setError('NFC wird von diesem Browser/Gerät nicht unterstützt.');
      return;
    }

    try {
      setIsScanning(true);
      setError('');

      // Erstelle neue NDEFReader Instanz nur wenn verfügbar
      if (typeof window !== 'undefined' && 'NDEFReader' in window) {
        const ndef = new window.NDEFReader();
        setNdefReader(ndef);
        
        await ndef.scan();

        ndef.addEventListener('readingerror', () => {
          setError('NFC-Lesefehler aufgetreten.');
          setIsScanning(false);
        });

        ndef.addEventListener('reading', ({ message, serialNumber }) => {
          let nfcData = serialNumber || '';
          
          // Versuche Text aus NDEF-Nachrichten zu extrahieren
          for (const record of message.records) {
            if (record.recordType === 'text') {
              const textDecoder = new TextDecoder(record.encoding || 'utf-8');
              nfcData = textDecoder.decode(record.data);
              break;
            } else if (record.recordType === 'url') {
              nfcData = new TextDecoder().decode(record.data);
              break;
            }
          }

          setLastRead(nfcData);
          onNFCRead(nfcData);
          setIsScanning(false);
        });
      } else {
        setError('NDEFReader ist nicht verfügbar.');
        setIsScanning(false);
      }

    } catch (error) {
      console.error('NFC Error:', error);
      setError('Fehler beim Starten des NFC-Scanners: ' + error.message);
      setIsScanning(false);
    }
  };

  const stopNFCScanning = () => {
    setIsScanning(false);
    setError('');
    // Der NDEFReader hat keine explizite Stop-Methode
    setNdefReader(null);
  };

  return (
    <Card className="content-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isNFCSupported ? (
            <Wifi className={`h-5 w-5 ${isScanning ? 'text-green-500 animate-pulse' : 'text-gray-500'}`} />
          ) : (
            <WifiOff className="h-5 w-5 text-gray-400" />
          )}
          NFC Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isNFCSupported && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>NFC nicht verfügbar</AlertTitle>
            <AlertDescription>
              NFC wird nur auf Android-Geräten mit Chrome unterstützt und benötigt HTTPS. Verwenden Sie stattdessen den Barcode-Scanner.
            </AlertDescription>
          </Alert>
        )}

        {isNFCSupported && (
          <>
            <div className="text-center">
              <Smartphone className={`mx-auto h-12 w-12 mb-2 ${isScanning ? 'text-green-500' : 'text-gray-400'}`} />
              <p className="text-sm text-gray-600">{placeholder}</p>
              {lastRead && (
                <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                  <span className="text-green-600 font-medium">Letzter Scan: </span>
                  <span className="text-green-800">{lastRead}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!isScanning ? (
                <Button 
                  onClick={startNFCScanning} 
                  disabled={disabled}
                  className="flex-1 primary-btn"
                >
                  <Wifi className="h-4 w-4 mr-2" />
                  NFC-Scan starten
                </Button>
              ) : (
                <Button 
                  onClick={stopNFCScanning} 
                  variant="outline"
                  className="flex-1"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Stoppen
                </Button>
              )}
            </div>

            {isScanning && (
              <Alert>
                <Wifi className="h-4 w-4 animate-pulse text-green-500" />
                <AlertTitle>NFC-Scanner aktiv</AlertTitle>
                <AlertDescription>
                  Halten Sie ein NFC-Tag an die Rückseite Ihres Geräts. Der Scanner stoppt automatisch nach erfolgreichem Lesen.
                </AlertDescription>
              </Alert>
            )}

            {error && error !== 'NFC wird von diesem Browser/Gerät nicht unterstützt. Verwenden Sie Chrome auf Android.' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fehler</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}