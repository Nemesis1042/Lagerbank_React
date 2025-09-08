
import React, { useState, useEffect, useCallback } from 'react';
import { Camp } from '@/api/entities';
import { AppSettings } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, CheckCircle, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from "@/components/ui/use-toast";
import { Switch } from '@/components/ui/switch'; // Added import for Switch

function CampForm({ camp, onFinished }) {
  const [formData, setFormData] = useState(camp || {
    name: '',
    start_date: '',
    end_date: '',
    location: '',
    year: new Date().getFullYear(),
    description: '',
    is_active: false,
    require_positive_balance: true, // New field initialized
  });
  const { toast } = useToast();

  const handleSave = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date || !formData.year) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "Bitte füllen Sie alle Pflichtfelder aus (Name, Start, Ende, Jahr).",
      });
      return;
    }

    try {
      if (camp) {
        await Camp.update(camp.id, formData);
      } else {
        await Camp.create(formData);
      }
      toast({
        title: "Erfolg",
        description: "Lager wurde erfolgreich gespeichert.",
      });
      onFinished();
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Fehler beim Speichern",
        description: "Das Lager konnte nicht gespeichert werden.",
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{camp ? 'Lager bearbeiten' : 'Neues Lager anlegen'}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">Name*</Label>
          <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="col-span-3 themed-input" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="year" className="text-right">Jahr*</Label>
          <Input id="year" type="number" value={formData.year} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })} className="col-span-3 themed-input" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="start_date" className="text-right">Startdatum*</Label>
          <Input id="start_date" type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="col-span-3 themed-input" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="end_date" className="text-right">Enddatum*</Label>
          <Input id="end_date" type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="col-span-3 themed-input" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="location" className="text-right">Ort</Label>
          <Input id="location" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="col-span-3 themed-input" />
        </div>
         <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">Beschreibung</Label>
          <Input id="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="col-span-3 themed-input" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right">Guthaben-Regel</Label>
          <div className="col-span-3 flex items-center space-x-2">
            <Switch 
              id="require_positive_balance" 
              checked={formData.require_positive_balance} 
              onCheckedChange={checked => setFormData({ ...formData, require_positive_balance: checked })} 
            />
            <Label htmlFor="require_positive_balance">
              {formData.require_positive_balance ? 'Guthaben erforderlich' : 'Minus-Guthaben erlaubt'}
            </Label>
          </div>
          <div className="col-start-2 col-span-3 text-xs text-gray-500 mt-1">
            {formData.require_positive_balance 
              ? 'Teilnehmer können nur kaufen, wenn sie Guthaben haben'
              : 'Teilnehmer dürfen ins Minus gehen (Schulden machen)'
            }
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSave} className="primary-btn">Speichern</Button>
      </DialogFooter>
    </>
  );
}

function LagerContent() {
  const [camps, setCamps] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCamp, setEditingCamp] = useState(null);
  const [activeCampId, setActiveCampId] = useState(null);
  const [deleteWarning, setDeleteWarning] = useState(null);
  const { toast } = useToast();

  const fetchCamps = useCallback(async (isMounted) => {
    try {
      const data = await Camp.list('-year');
      if (!isMounted()) return;
      setCamps(data);
  
      const settings = await AppSettings.list();
      if (isMounted() && settings.length > 0 && settings[0].active_camp_id) { 
        setActiveCampId(settings[0].active_camp_id);
      }
    } catch (error) {
      if (isMounted()) {
        console.error("Failed to fetch camps or app settings:", error);
        toast({
          variant: "destructive",
          title: "Fehler beim Laden",
          description: "Die Lager konnten nicht geladen werden.",
        });
      }
    }
  }, [toast]);

  useEffect(() => {
    let isMounted = true;
    fetchCamps(() => isMounted);
    return () => {
      isMounted = false;
    };
  }, [fetchCamps]);

  const onFormFinished = () => {
    let isMounted = true;
    fetchCamps(() => isMounted);
    setIsFormOpen(false);
    setEditingCamp(null);
    return () => { isMounted = false; };
  };

  const handleDelete = async (campId, force = false) => {
    try {
      const response = await fetch(`http://localhost:4000/api/entities/Camp/${campId}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 409) {
        // Confirmation required
        const data = await response.json();
        return data; // Return the warnings to be handled by the calling function
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unbekannter Fehler');
      }

      const result = await response.json();
      toast({ 
        title: "Erfolg", 
        description: result.warnings ? 
          `Lager wurde gelöscht. ${result.warnings.join(', ')}.` : 
          "Lager wurde gelöscht." 
      });
      fetchCamps(() => true);
      return null; // Success, no warnings needed
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Fehler", 
        description: error.message || "Lager konnte nicht gelöscht werden." 
      });
      return null;
    }
  };

 const handleActivate = async (campToActivate) => {
  try {
    const settingsList = await AppSettings.list();
    if (settingsList.length > 0) {
      const settings = settingsList[0];
      await AppSettings.update(settings.id, {
        active_camp_id: campToActivate.id,
        active_camp_name: campToActivate.name
      });
    } else {
      await AppSettings.create({
        active_camp_id: campToActivate.id,
        active_camp_name: campToActivate.name,
        currency_symbol: '€',
        admin_password: 'admin'
      });
    }

    setActiveCampId(campToActivate.id);
    toast({
      title: "Aktiviert!",
      description: `"${campToActivate.name}" ist jetzt das aktive Lager.`,
      className: "bg-green-100 text-green-800"
    });

    setTimeout(() => window.location.reload(), 1500);
  } catch (error) {
    console.error("Fehler beim Aktivieren des Lagers:", error);
    toast({
      variant: "destructive",
      title: "Fehler",
      description: "Lager konnte nicht aktiviert werden."
    });
  }
};


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Lager-Verwaltung</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCamp(null)} className="primary-btn">
              <PlusCircle className="mr-2 h-4 w-4" /> Neues Lager anlegen
            </Button>
          </DialogTrigger>
          <DialogContent className="content-card">
            <CampForm camp={editingCamp} onFinished={onFormFinished} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {camps.map(camp => (
          <Card key={camp.id} className={`content-card ${activeCampId === camp.id ? 'border-2 border-[var(--color-primary)]' : ''}`}>
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span>{camp.name} ({camp.year})</span>
                {activeCampId === camp.id && (
                  <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3" />
                    <span>Aktiv</span>
                  </div>
                )}
              </CardTitle>
              <CardDescription>{camp.location}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                {new Date(camp.start_date).toLocaleDateString('de-DE')} - {new Date(camp.end_date).toLocaleDateString('de-DE')}
              </p>
              {camp.description && <p className="text-sm opacity-80">{camp.description}</p>}
              <div className="flex gap-2 pt-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => { setEditingCamp(camp); setIsFormOpen(true); }}
                >
                  <Edit className="h-4 w-4 mr-2" /> Bearbeiten
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="flex-1">
                      <Trash2 className="h-4 w-4 mr-2" /> Löschen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Lager löschen</AlertDialogTitle>
                      <AlertDialogDescription>
                        {deleteWarning && deleteWarning.campId === camp.id ? (
                          <div className="space-y-2">
                            <p className="font-medium text-orange-600">{deleteWarning.message}</p>
                            <div className="text-sm">
                              <p className="font-medium">Folgende Daten werden mit gelöscht:</p>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                {deleteWarning.warnings.map((warning, index) => (
                                  <li key={index} className="text-orange-700">{warning}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ) : (
                          `Möchten Sie "${camp.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteWarning(null)}>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={async () => {
                          if (deleteWarning && deleteWarning.campId === camp.id) {
                            // Force delete with warnings acknowledged
                            await handleDelete(camp.id, true);
                            setDeleteWarning(null);
                          } else {
                            // First attempt - check for warnings
                            const warningData = await handleDelete(camp.id, false);
                            if (warningData && warningData.requiresConfirmation) {
                              setDeleteWarning({ ...warningData, campId: camp.id });
                            }
                          }
                        }}
                        className={deleteWarning && deleteWarning.campId === camp.id ? "bg-orange-600 hover:bg-orange-700" : ""}
                      >
                        {deleteWarning && deleteWarning.campId === camp.id ? "Trotzdem löschen" : "Löschen"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <Button 
                onClick={() => handleActivate(camp)}
                disabled={activeCampId === camp.id}
                className="w-full primary-btn mt-2"
              >
                <Star className="h-4 w-4 mr-2" />
                {activeCampId === camp.id ? 'Bereits aktiv' : 'Als aktiv setzen'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {camps.length === 0 && (
        <Card className="content-card">
          <CardContent className="py-12 text-center text-gray-500">
            <p>Noch keine Lager angelegt.</p>
            <p className="text-sm">Klicken Sie auf "Neues Lager anlegen", um zu starten.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function LagerPage() {
  return <LagerContent />;
}
