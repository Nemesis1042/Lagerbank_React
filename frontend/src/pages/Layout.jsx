
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Users, ShoppingCart, LogOut, Tent, Package, FileText, Moon, Sun, Settings, Shield, UserCheck, KeyRound, Lock, Menu, X, Download, ClipboardList, Nfc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppSettings } from '@/api/entities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/toaster';
import ErrorBoundary from '../components/ErrorBoundary';

const kasseNavItems = [
  { name: 'Click-Kasse', url: createPageUrl('Kasse?view=click'), icon: Users },
  { name: 'Scanner-Kasse', url: createPageUrl('Kasse?view=standard'), icon: ShoppingCart },
  { name: 'NFC-Kasse', url: createPageUrl('Kasse?view=nfc'), icon: Nfc },
];

const adminNavItems = [
  { name: 'Dashboard', url: createPageUrl('Dashboard'), icon: Home },
  { name: 'Lager-Verwaltung', url: createPageUrl('Lager'), icon: Tent },
  { name: 'Teilnehmer', url: createPageUrl('Teilnehmer'), icon: Users },
  { name: 'Mitarbeiter', url: createPageUrl('Mitarbeiter'), icon: UserCheck },
  { name: 'Produkte', url: createPageUrl('Produkte'), icon: Package },
  { name: 'Inventur', url: createPageUrl('Inventur'), icon: ClipboardList },
  { name: 'Mitarbeiter-Berichte', url: createPageUrl('MitarbeiterBerichte'), icon: FileText },
  { name: 'Check-Out', url: createPageUrl('Checkout'), icon: LogOut },
  { name: 'Export', url: createPageUrl('Export'), icon: Download },
  { name: 'Audit-Log', url: createPageUrl('AuditLog'), icon: Shield },
  { name: 'Einstellungen', url: createPageUrl('Einstellungen'), icon: Settings },
];

function AdminPasswordDialog({ onAuthenticated, onCancel, passwordToMatch }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleCheckPassword = () => {
    setError('');
    if (password === passwordToMatch) {
      onAuthenticated();
    } else {
      setError('Falsches Passwort.');
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} className="content-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Admin-Bereich geschützt
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <p>Bitte geben Sie das Passwort ein, um auf den Admin-Bereich zuzugreifen.</p>
          <Label htmlFor="password">Passwort</Label>
          <Input 
            id="password" 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="themed-input"
            onKeyPress={(e) => e.key === 'Enter' && handleCheckPassword()}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={onCancel} variant="outline">Abbrechen</Button>
          <Button onClick={handleCheckPassword} className="primary-btn">Bestätigen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Mobile Navigation Component
function MobileNavigation({ activeTab, onTabChange, isAdminAreaUnlocked, onUnlockAdmin, campName, onToggleDarkMode, isDarkMode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" style={{color: 'var(--color-header-text)'}}>
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 flex flex-col" style={{backgroundColor: 'var(--color-sidebar-bg)', color: 'var(--color-text)'}}>
        <div className="p-4 border-b" style={{borderColor: 'var(--color-border)'}}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg primary-btn">
              <Tent className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold">{campName}</h1>
          </div>
        </div>
        
        <div className="flex-1 p-4">
          <Tabs value={activeTab} onValueChange={(value) => {
            if (value === 'admin' && !isAdminAreaUnlocked) {
              onUnlockAdmin();
            } else {
              onTabChange(value);
            }
          }} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="kasse">Kasse</TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Admin
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="kasse" className="flex-1">
              <div className="space-y-2">
                {kasseNavItems.map((item) => (
                  <SheetClose asChild key={item.name}>
                    <Link
                      to={item.url}
                      className="flex items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-[var(--color-list-item-bg)] text-base"
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </SheetClose>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="admin" className="flex-1">
              {isAdminAreaUnlocked ? (
                <div className="space-y-2">
                  {adminNavItems.map((item) => (
                    <SheetClose asChild key={item.name}>
                      <Link
                        to={item.url}
                        className="flex items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-[var(--color-list-item-bg)] text-base"
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </Link>
                    </SheetClose>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500 p-4 space-y-3">
                  <Lock className="mx-auto h-8 w-8" />
                  <p>Der Admin-Bereich ist gesperrt.</p>
                  <Button onClick={onUnlockAdmin} size="sm" className="primary-btn">Entsperren</Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="p-4 border-t" style={{borderColor: 'var(--color-border)'}}>
          <Button onClick={onToggleDarkMode} variant="outline" className="w-full flex items-center gap-2" style={{ backgroundColor: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text)'}}>
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{isDarkMode ? 'Heller Modus' : 'Dunkler Modus'}</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Desktop Sidebar Component
function DesktopSidebar({ activeTab, onTabChange, isAdminAreaUnlocked, onUnlockAdmin, campName, onToggleDarkMode, isDarkMode }) {
  const location = useLocation();
  const currentUrl = location.pathname + location.search;

  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0" style={{backgroundColor: 'var(--color-sidebar-bg)', borderColor: 'var(--color-border)'}}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b" style={{borderColor: 'var(--color-border)'}}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg primary-btn">
            <Tent className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{color: 'var(--color-text)'}}>{campName}</h1>
          </div>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={(value) => {
          if (value === 'admin' && !isAdminAreaUnlocked) {
            onUnlockAdmin();
          } else {
            onTabChange(value);
          }
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="kasse">Kasse</TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Admin
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Navigation Items */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        <div className="space-y-1">
          {activeTab === 'admin' && isAdminAreaUnlocked ? (
            adminNavItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={item.name}
                  to={item.url}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-[var(--color-list-item-bg)] ${
                    isActive
                      ? 'bg-[var(--color-list-item-bg)] text-[var(--color-primary)]' 
                      : 'text-[var(--color-text)]'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })
          ) : activeTab === 'kasse' ? (
            kasseNavItems.map((item, index) => {
              const isBaseKasseActive = location.pathname === '/Kasse' && location.search === '';
              const isActive = currentUrl === item.url || (isBaseKasseActive && index === 0);
              return (
                <Link
                  key={item.name}
                  to={item.url}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-[var(--color-list-item-bg)] ${
                    isActive
                      ? 'bg-[var(--color-list-item-bg)] text-[var(--color-primary)]' 
                      : 'text-[var(--color-text)]'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })
          ) : (
            <div className="text-center text-sm p-4 space-y-3" style={{color: 'var(--color-text)', opacity: 0.7}}>
              <Lock className="mx-auto h-8 w-8" />
              <p>Der Admin-Bereich ist gesperrt.</p>
              <Button onClick={onUnlockAdmin} size="sm" className="primary-btn">Entsperren</Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t" style={{borderColor: 'var(--color-border)'}}>
        <Button 
          onClick={onToggleDarkMode} 
          variant="outline" 
          className="w-full flex items-center gap-2" 
          style={{ backgroundColor: 'transparent', borderColor: 'var(--color-border)', color: 'var(--color-text)'}}
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{isDarkMode ? 'Heller Modus' : 'Dunkler Modus'}</span>
        </Button>
      </div>
    </div>
  );
}

function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [campName, setCampName] = useState('Zeltlager-Kasse');
  const [activeTab, setActiveTab] = useState('kasse');
  const [adminPassword, setAdminPassword] = useState('admin');
  const [isAdminAreaUnlocked, setIsAdminAreaUnlocked] = useState(false);
  const [showAdminPasswordDialog, setShowAdminPasswordDialog] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const settings = await AppSettings.list();
        if (isMounted && settings.length > 0) {
          if (settings[0].active_camp_name) {
            setCampName(settings[0].active_camp_name);
          } else {
            setCampName(settings[0].camp_name);
          }
          setAdminPassword(settings[0].admin_password || 'admin');
          localStorage.setItem('admin_password', settings[0].admin_password || 'admin');
        }
      } catch (err) {
        if (isMounted) {
          console.log('Could not load app settings, using default.');
        }
      }
    };
    
    loadSettings();
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const isAdminPage = adminNavItems.some(item => location.pathname === item.url);
    if (isAdminPage) {
      setActiveTab('admin');
      setIsAdminAreaUnlocked(true);
    } else {
      setActiveTab('kasse');
      setIsAdminAreaUnlocked(false);
    }
  }, [location.pathname]);
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) {
      setIsDarkMode(JSON.parse(savedTheme));
    } else {
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prevMode => !prevMode);
  }, []);

  const handleTabChange = useCallback((value) => {
    if (value === 'admin') {
      if (isAdminAreaUnlocked) {
        setActiveTab('admin');
        window.location.href = createPageUrl('Dashboard');
      } else {
        setShowAdminPasswordDialog(true);
      }
    } else {
      setActiveTab(value);
      if (value === 'kasse') {
        setIsAdminAreaUnlocked(false);
        window.location.href = createPageUrl('Kasse?view=click');
      }
    }
  }, [isAdminAreaUnlocked]);

  return (
    <ErrorBoundary>
      {showAdminPasswordDialog && (
        <AdminPasswordDialog
          passwordToMatch={adminPassword}
          onAuthenticated={() => {
            setIsAdminAreaUnlocked(true);
            setShowAdminPasswordDialog(false);
            setActiveTab('admin');
            window.location.href = createPageUrl('Dashboard');
          }}
          onCancel={() => setShowAdminPasswordDialog(false)}
        />
      )}
      
      <div className={`flex h-screen ${isDarkMode ? 'dark-mode' : ''}`} style={{fontFamily: 'var(--font-body)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)'}}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&display=swap');
          
          :root {
            --font-body: 'Source Sans Pro', sans-serif;
            
            /* Light Mode Farben */
            --color-text: #0a0101;
            --color-bg: #fdfdfd;
            --color-primary: #ff004d;
            --color-primary-hover: #ff1a66;
            --color-button-text: #ffffff;
            --color-container-bg: #a5a3a3a4;
            --color-list-item-bg: #f0c0c0de;
            --color-header-bg: #333;
            --color-header-text: #fdfbfb;
            --color-input-bg: #ffffff;
            --color-input-hover: #f0f0f0;
            --color-sidebar-bg: #ffffff;
            --color-border: #e5e7eb;
            --color-card-bg: #ffffff;
          }

          .dark-mode {
            /* Dark Mode Farben */
            --color-text: #f8f9fa;
            --color-bg: #121212;
            --color-primary: #ff004d;
            --color-primary-hover: #ff1a66;
            --color-button-text: #ffffff;
            --color-container-bg: #1e1e1e90;
            --color-list-item-bg: #2a2a2a90;
            --color-header-bg: #1f1f1f;
            --color-header-text: #f8f9fa;
            --color-input-bg: #2d2d2d;
            --color-input-hover: #3a3a3a;
            --color-sidebar-bg: #1a1a1a;
            --color-border: #374151;
            --color-card-bg: #1e1e1e;
          }
          
          .primary-btn {
            background-color: var(--color-primary);
            color: var(--color-button-text);
          }
          .primary-btn:hover {
            background-color: var(--color-primary-hover);
          }
          .content-card {
            background-color: var(--color-container-bg);
            backdrop-filter: blur(4px);
            border-color: var(--color-border);
          }
          .themed-list-item:hover {
            background-color: var(--color-list-item-bg) !important;
          }
          .themed-input {
            background-color: var(--color-input-bg);
            border-color: var(--color-border);
            color: var(--color-text);
          }
          .themed-input:hover {
            background-color: var(--color-input-hover);
          }
          .themed-input:focus {
            background-color: var(--color-input-bg);
            border-color: var(--color-primary);
          }
          
          .dark-mode .bg-white {
            background-color: var(--color-card-bg) !important;
          }
          
          .dark-mode table {
            color: var(--color-text);
          }
          
          .dark-mode .border-green-500 {
            border-color: #10b981;
            background-color: #064e3b;
            color: #d1fae5;
          }
          
          .dark-mode .text-green-700 {
            color: #34d399 !important;
          }
          
          .dark-mode [data-radix-dialog-content] {
            background-color: var(--color-card-bg);
            border-color: var(--color-border);
          }
          
          .dark-mode [data-radix-select-content] {
            background-color: var(--color-card-bg);
            border-color: var(--color-border);
          }
        `}</style>
        
        {/* Desktop Sidebar */}
        <DesktopSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isAdminAreaUnlocked={isAdminAreaUnlocked}
          onUnlockAdmin={() => handleTabChange('admin')}
          campName={campName}
          onToggleDarkMode={toggleDarkMode}
          isDarkMode={isDarkMode}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:pl-64">
          {/* Mobile Header */}
          <header className="lg:hidden sticky top-0 z-50 border-b px-4 py-3" style={{backgroundColor: 'var(--color-header-bg)', color: 'var(--color-header-text)', borderColor: 'var(--color-border)'}}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <MobileNavigation
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  isAdminAreaUnlocked={isAdminAreaUnlocked}
                  onUnlockAdmin={() => handleTabChange('admin')}
                  campName={campName}
                  onToggleDarkMode={toggleDarkMode}
                  isDarkMode={isDarkMode}
                />
                
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg primary-btn">
                    <Tent className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-lg font-bold">{campName}</h1>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      
      <Toaster />
    </ErrorBoundary>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <LayoutContent currentPageName={currentPageName}>
      {children}
    </LayoutContent>
  );
}
