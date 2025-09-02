import React, { useState, useEffect } from 'react';
import { Participant } from '@/api/entities';
import { Transaction } from '@/api/entities';
import { AppSettings } from '@/api/entities';
import { Camp } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { UserCheck, Search, X, AlertTriangle, DollarSign, Users, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from "@/components/ui/use-toast";
import { formatBalance } from '../utils/formatBalance';

function CheckinDialog({ participant, onFinished, activeCamp }) {
    const [amount, setAmount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleCheckin = async () => {
        if (!participant || !activeCamp) {
            toast({ variant: "destructive", title: "Fehler", description: "Teilnehmer oder aktives Lager nicht gefunden." });
            return;
        }

        setIsLoading(true);
        try {
            // 1. Teilnehmer einchecken
            await Participant.update(participant.id, { is_checked_in: true });

            // 2. Optional: Geld aufladen wenn Betrag > 0
            if (amount > 0) {
                // Update participant balance
                await Participant.update(participant.id, { 
                    balance: participant.balance + amount,
                    initial_balance: participant.initial_balance + amount // Auch das Startguthaben erhöhen
                });
                
                // Create a negative transaction (money added, not spent)
                await Transaction.create({
                    participant_id: participant.id,
                    product_id: null, // NULL for special transactions
                    camp_id: activeCamp.id,
                    quantity: 1,
                    total_price: -amount, // Negative price = money added
                    participant_name: participant.name,
                    product_name: 'Einchecken + Guthaben-Aufladung',
                    camp_name: activeCamp.name
                });

                toast({ 
                    title: "Erfolg", 
                    description: `${participant.name} wurde eingecheckt und € ${amount.toFixed(2)} wurden gutgeschrieben.`
                });
            } else {
                toast({ 
                    title: "Erfolg", 
                    description: `${participant.name} wurde erfolgreich eingecheckt.`
                });
            }

            onFinished();
        } catch (error) {
            console.error('Checkin error:', error);
            toast({ variant: "destructive", title: "Fehler", description: "Fehler beim Einchecken des Teilnehmers." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Teilnehmer einchecken: {participant.name}
                </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Einchecken</AlertTitle>
                    <AlertDescription>
                        <strong>{participant.name}</strong> wird als eingecheckt markiert und erscheint als aktiver Teilnehmer im Dashboard.
                    </AlertDescription>
                </Alert>

                <div className="space-y-2">
                    <p><strong>TN-Nr:</strong> {participant.tn_id || 'N/A'}</p>
                    <p><strong>ID:</strong> {participant.barcode_id}</p>
                    <p><strong>Aktuelles Guthaben:</strong> € {formatBalance(participant.balance)}</p>
                </div>

                <div className="border-t pt-4">
                    <Label htmlFor="checkin-amount" className="text-base font-semibold">
                        Guthaben aufladen (optional)
                    </Label>
                    <p className="text-sm text-gray-600 mb-2">
                        Sie können optional beim Einchecken Geld auf das Konto des Teilnehmers buchen.
                    </p>
                    <Input 
                        id="checkin-amount" 
                        type="number" 
                        value={amount} 
                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} 
                        className="themed-input" 
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                    />
                    {amount > 0 && (
                        <p className="text-sm text-green-600 mt-1">
                            Neues Guthaben nach Einchecken: € {(participant.balance + amount).toFixed(2)}
                        </p>
                    )}
                </div>
            </div>
            <DialogFooter>
                <Button 
                    onClick={handleCheckin} 
                    className="primary-btn"
                    disabled={isLoading}
                >
                    {isLoading ? 'Wird eingecheckt...' : (
                        <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            {amount > 0 ? `Einchecken + € ${amount.toFixed(2)} aufladen` : 'Einchecken'}
                        </>
                    )}
                </Button>
            </DialogFooter>
        </>
    );
}

function CheckinContent() {
    const [participants, setParticipants] = useState([]);
    const [filteredParticipants, setFilteredParticipants] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCamp, setActiveCamp] = useState(null);
    const [checkinParticipant, setCheckinParticipant] = useState(null);
    const [stats, setStats] = useState({
        totalParticipants: 0,
        checkedInParticipants: 0,
        notCheckedInParticipants: 0
    });
    const { toast } = useToast();

    const fetchParticipants = async () => {
        try {
            // Lade aktives Lager
            const settings = await AppSettings.list();
            let currentCampId = null;
            let activeCampData = null;

            if (settings.length > 0 && settings[0].active_camp_id) {
                const camps = await Camp.list();
                activeCampData = camps.find(c => c.id === settings[0].active_camp_id);
                currentCampId = settings[0].active_camp_id;
            }
            
            setActiveCamp(activeCampData || null);

            if (!currentCampId) {
                setParticipants([]);
                setFilteredParticipants([]);
                setStats({ totalParticipants: 0, checkedInParticipants: 0, notCheckedInParticipants: 0 });
                return;
            }

            // Lade nur Teilnehmer des aktiven Lagers (keine Mitarbeiter)
            const data = await Participant.filter({ 
                is_staff: false,
                camp_id: currentCampId 
            }); 
            
            // Sortiere nach TN-Nr. und dann nach Namen
            data.sort((a, b) => {
                if (!a.tn_id && !b.tn_id) return a.name.localeCompare(b.name);
                if (!a.tn_id) return 1;
                if (!b.tn_id) return -1;
                return a.tn_id - b.tn_id;
            });
            
            setParticipants(data);
            setFilteredParticipants(data);

            // Berechne Statistiken
            const totalParticipants = data.length;
            const checkedInParticipants = data.filter(p => p.is_checked_in).length;
            const notCheckedInParticipants = totalParticipants - checkedInParticipants;
            
            setStats({ totalParticipants, checkedInParticipants, notCheckedInParticipants });
        } catch (error) {
            console.error('Fehler beim Laden der Teilnehmer:', error);
            toast({ variant: "destructive", title: "Fehler", description: "Fehler beim Laden der Teilnehmer." });
        }
    };

    useEffect(() => {
        fetchParticipants();
    }, []);

    useEffect(() => {
        // Filter participants based on search term
        if (searchTerm.trim() === '') {
            setFilteredParticipants(participants);
        } else {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            const filtered = participants.filter(participant => 
                participant.name.toLowerCase().includes(lowerCaseSearchTerm) ||
                (participant.barcode_id && participant.barcode_id.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (participant.tn_id && participant.tn_id.toString().includes(lowerCaseSearchTerm))
            );
            setFilteredParticipants(filtered);
        }
    }, [searchTerm, participants]);

    const onCheckinFinished = () => {
        fetchParticipants();
        setCheckinParticipant(null);
    };

    const clearSearch = () => {
        setSearchTerm('');
    };

    const handleBulkCheckin = async () => {
        try {
            const notCheckedIn = participants.filter(p => !p.is_checked_in);
            if (notCheckedIn.length === 0) {
                toast({ title: "Info", description: "Alle Teilnehmer sind bereits eingecheckt." });
                return;
            }

            const updates = notCheckedIn.map(p => 
                Participant.update(p.id, { is_checked_in: true })
            );
            await Promise.all(updates);
            
            toast({ 
                title: "Erfolg", 
                description: `${notCheckedIn.length} Teilnehmer wurden als eingecheckt markiert.` 
            });
            fetchParticipants();
        } catch (error) {
            toast({ variant: "destructive", title: "Fehler", description: "Fehler beim Massen-Einchecken." });
        }
    };

    if (!activeCamp) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold">Teilnehmer Einchecken</h1>
                <Alert variant="destructive" dismissible>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Kein aktives Lager</AlertTitle>
                    <AlertDescription>
                        Es ist kein Lager als aktiv markiert. Bitte gehen Sie zu <strong>Lager-Verwaltung</strong> und aktivieren Sie ein Lager.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Separate nicht eingecheckte und eingecheckte Teilnehmer
    const notCheckedInParticipants = filteredParticipants.filter(p => !p.is_checked_in);
    const checkedInParticipants = filteredParticipants.filter(p => p.is_checked_in);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Teilnehmer Einchecken</h1>
                    <p className="text-sm opacity-70 mt-1">
                        <strong>Lager:</strong> {activeCamp.name} ({new Date(activeCamp.start_date).toLocaleDateString('de-DE')} - {new Date(activeCamp.end_date).toLocaleDateString('de-DE')})
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button 
                        variant="outline" 
                        onClick={handleBulkCheckin}
                        disabled={stats.notCheckedInParticipants === 0}
                    >
                        <Users className="mr-2 h-4 w-4" /> 
                        Alle einchecken ({stats.notCheckedInParticipants})
                    </Button>
                </div>
            </div>

            {/* Statistiken */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="content-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gesamt Teilnehmer</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalParticipants}</div>
                    </CardContent>
                </Card>
                <Card className="content-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Eingecheckt</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.checkedInParticipants}</div>
                    </CardContent>
                </Card>
                <Card className="content-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Noch nicht eingecheckt</CardTitle>
                        <UserCheck className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.notCheckedInParticipants}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Suchleiste */}
            <Card className="content-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Teilnehmer suchen
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="Nach Name, TN-Nr. oder Barcode-ID suchen..."
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
                            {filteredParticipants.length} von {participants.length} Teilnehmern gefunden
                        </p>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!checkinParticipant} onOpenChange={() => setCheckinParticipant(null)}>
                <DialogContent className="content-card">
                    {checkinParticipant && (
                        <CheckinDialog 
                            participant={checkinParticipant} 
                            onFinished={onCheckinFinished} 
                            activeCamp={activeCamp} 
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Noch nicht eingecheckte Teilnehmer */}
            {notCheckedInParticipants.length > 0 && (
                <Card className="content-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-600">
                            <UserCheck className="h-5 w-5" />
                            Noch nicht eingecheckt ({notCheckedInParticipants.length})
                        </CardTitle>
                        <CardDescription>
                            Diese Teilnehmer sind noch nicht eingecheckt und erscheinen nicht als aktive Teilnehmer im Dashboard.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>TN-Nr.</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Barcode ID</TableHead>
                                    <TableHead>Guthaben</TableHead>
                                    <TableHead>Aktion</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {notCheckedInParticipants.map(p => (
                                    <TableRow key={p.id} className="themed-list-item">
                                        <TableCell className="font-semibold">{p.tn_id || 'N/A'}</TableCell>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>{p.barcode_id}</TableCell>
                                        <TableCell>€ {formatBalance(p.balance)}</TableCell>
                                        <TableCell>
                                            <Button 
                                                onClick={() => setCheckinParticipant(p)}
                                                className="primary-btn"
                                                size="sm"
                                            >
                                                <UserCheck className="h-4 w-4 mr-2" />
                                                Einchecken
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Bereits eingecheckte Teilnehmer */}
            {checkedInParticipants.length > 0 && (
                <Card className="content-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            Bereits eingecheckt ({checkedInParticipants.length})
                        </CardTitle>
                        <CardDescription>
                            Diese Teilnehmer sind bereits eingecheckt und erscheinen als aktive Teilnehmer im Dashboard.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>TN-Nr.</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Barcode ID</TableHead>
                                    <TableHead>Guthaben</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {checkedInParticipants.map(p => (
                                    <TableRow key={p.id} className="themed-list-item">
                                        <TableCell className="font-semibold">{p.tn_id || 'N/A'}</TableCell>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>{p.barcode_id}</TableCell>
                                        <TableCell>€ {formatBalance(p.balance)}</TableCell>
                                        <TableCell>
                                            <Badge className="bg-green-100 text-green-800">
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Eingecheckt
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Keine Teilnehmer gefunden */}
            {filteredParticipants.length === 0 && (
                <Card className="content-card">
                    <CardContent className="text-center py-8">
                        <p className="text-gray-500">
                            {searchTerm ? (
                                `Keine Teilnehmer mit "${searchTerm}" gefunden.`
                            ) : (
                                `Noch keine Teilnehmer für dieses Lager angelegt.`
                            )}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function CheckinPage() {
    return <CheckinContent />;
}
