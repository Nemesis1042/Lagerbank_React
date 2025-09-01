import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export function AdminProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handlePasswordSubmit = () => {
    // Standardpasswort ist "admin" - kann in den Einstellungen geändert werden
    const adminPassword = localStorage.getItem('admin_password') || 'admin';
    
    if (password === adminPassword) {
      setIsAuthenticated(true);
      setShowPasswordDialog(false);
      setError('');
    } else {
      setError('Falsches Passwort.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--color-bg)'}}>
        <Dialog open={showPasswordDialog} onOpenChange={() => {}}>
          <DialogContent className="content-card" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Admin-Bereich
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p>Bitte geben Sie das Admin-Passwort ein, um fortzufahren.</p>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="themed-input"
                  onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  placeholder="Admin-Passwort eingeben..."
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
            <DialogFooter>
              <Button onClick={handlePasswordSubmit} className="w-full primary-btn">
                <Shield className="h-4 w-4 mr-2" />
                Anmelden
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return children;
}