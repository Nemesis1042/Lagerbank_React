
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";
import { Nfc } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function NFCWriter({ dataToWrite, participantName }) {
    const [isWriting, setIsWriting] = useState(false);
    const [error, setError] = useState('');
    const { toast } = useToast();

    const handleWriteNFC = async () => {
        if (!dataToWrite) {
            toast({
                variant: "destructive",
                title: "Fehler",
                description: "Keine ID zum Schreiben vorhanden. Bitte stellen Sie sicher, dass eine Barcode-ID im Feld oben eingetragen ist.",
            });
            return;
        }

        if (typeof window !== 'undefined' && 'NDEFReader' in window) {
            try {
                const ndef = new window.NDEFReader();
                setIsWriting(true);
                setError('');

                await ndef.write({
                    records: [{ recordType: "text", data: dataToWrite }]
                });

                toast({
                    title: "Erfolg!",
                    description: `NFC-Tag wurde erfolgreich für ${participantName} mit der ID "${dataToWrite}" beschrieben.`,
                });
            } catch (err) {
                console.error("NFC Write Error:", err);
                let errorMessage = "Ein unbekannter Fehler ist aufgetreten.";
                if (err.name === 'NotAllowedError') {
                    errorMessage = "Schreibvorgang wurde vom Benutzer abgebrochen oder der Tag ist schreibgeschützt.";
                } else if (err.name === 'AbortError') {
                     errorMessage = "Schreibvorgang abgebrochen. Haben Sie den Tag zu früh entfernt?";
                }
                setError(errorMessage);
                toast({
                    variant: "destructive",
                    title: "NFC-Schreibfehler",
                    description: errorMessage,
                });
            } finally {
                setIsWriting(false);
            }
        } else {
            const unsupportedError = "Web NFC wird von diesem Browser/Gerät nicht unterstützt. Bitte verwenden Sie Chrome auf einem Android-Gerät.";
            setError(unsupportedError);
            toast({
                variant: "destructive",
                title: "Nicht unterstützt",
                description: unsupportedError,
            });
        }
    };

    return (
        <Card className="content-card border-dashed">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <Nfc className="h-4 w-4" />
                    NFC-Tag beschreiben
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                    Schreiben Sie die Teilnehmer-ID direkt auf einen NFC-Tag. Funktioniert nur mit Chrome auf Android.
                </p>
                <Button
                    onClick={handleWriteNFC}
                    disabled={isWriting || !dataToWrite}
                    className="w-full"
                    variant="outline"
                >
                    {isWriting ? "Tag an das Gerät halten..." : `Tag mit ID "${dataToWrite}" beschreiben`}
                </Button>
                {isWriting && (
                     <Alert className="mt-4">
                        <Nfc className="h-4 w-4 animate-pulse" />
                        <AlertTitle>Schreibvorgang aktiv...</AlertTitle>
                        <AlertDescription>
                            Halten Sie jetzt einen leeren NFC-Tag an die Rückseite Ihres Geräts.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
