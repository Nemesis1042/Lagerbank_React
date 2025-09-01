
import React, { useState, useEffect, useCallback } from 'react';
import { AuditLog } from '@/api/entities';
import { AppSettings } from '@/api/entities';
import { Camp } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield, Search, Filter, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function AuditLogContent() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [camps, setCamps] = useState([]);
  const [activeCamp, setActiveCamp] = useState(null);
  const [selectedCamp, setSelectedCamp] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Lade aktives Lager
      const settings = await AppSettings.list();
      let activeCampData = null;
      if (settings.length > 0 && settings[0].active_camp_id) {
        const campsData = await Camp.list();
        setCamps(campsData);
        activeCampData = campsData.find(c => c.id === settings[0].active_camp_id);
        setActiveCamp(activeCampData);
        setSelectedCamp(activeCampData?.id || 'all');
      }

      // Lade Audit-Logs (neueste zuerst)
      const logsData = await AuditLog.list('-created_date', 1000);
      setLogs(logsData);
    } catch (error) {
      console.error('Fehler beim Laden der Audit-Logs:', error);
    }
    setIsLoading(false);
  };

  const filterLogs = useCallback(() => {
    let filtered = [...logs];

    // Nach Lager filtern
    if (selectedCamp !== 'all') {
      filtered = filtered.filter(log => log.camp_id === selectedCamp);
    }

    // Nach Aktion filtern
    if (selectedAction !== 'all') {
      filtered = filtered.filter(log => log.action === selectedAction);
    }

    // Nach Suchbegriff filtern
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(term) ||
        log.entity_type.toLowerCase().includes(term) ||
        (log.details && log.details.toLowerCase().includes(term))
      );
    }

    setFilteredLogs(filtered);
  }, [logs, selectedCamp, selectedAction, searchTerm]); // Dependencies for useCallback

  useEffect(() => {
    filterLogs();
  }, [filterLogs]); // Now depends on the memoized filterLogs function

  const getActionBadge = (action) => {
    const colors = {
      transaction_created: 'bg-green-100 text-green-800',
      participant_created: 'bg-blue-100 text-blue-800',
      balance_topped_up: 'bg-yellow-100 text-yellow-800',
      product_created: 'bg-purple-100 text-purple-800',
      admin_login: 'bg-red-100 text-red-800',
      data_exported: 'bg-gray-100 text-gray-800',
      full_backup_created: 'bg-orange-100 text-orange-800'
    };

    const labels = {
      transaction_created: 'Kauf',
      participant_created: 'TN erstellt',
      balance_topped_up: 'Aufladung',
      product_created: 'Produkt erstellt',
      admin_login: 'Admin Login',
      data_exported: 'Export',
      full_backup_created: 'Backup'
    };

    return (
      <Badge className={colors[action] || 'bg-gray-100 text-gray-800'}>
        {labels[action] || action}
      </Badge>
    );
  };

  const formatDetails = (details) => {
    try {
      const parsed = JSON.parse(details);
      return Object.entries(parsed)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    } catch {
      return details || '';
    }
  };

  const exportLogs = () => {
    const csvData = [
      'Datum,Zeit,Aktion,Entität,Details,Lager',
      ...filteredLogs.map(log => {
        const date = new Date(log.created_date);
        return `${date.toLocaleDateString('de-DE')},${date.toLocaleTimeString('de-DE')},"${log.action}","${log.entity_type}","${formatDetails(log.details).replace(/"/g, '""')}","${log.camp_name || ''}"`;
      })
    ];

    const csv = csvData.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const uniqueActions = [...new Set(logs.map(log => log.action))];

  if (isLoading) {
    return <div className="p-6">Lade Audit-Logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Audit-Log
        </h1>
        <Button onClick={exportLogs} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          CSV-Export
        </Button>
      </div>

      <Alert>
        <AlertTitle>Was ist das Audit-Log?</AlertTitle>
        <AlertDescription>
          Hier werden alle wichtigen Aktionen in der App protokolliert: Käufe, Aufladungen, 
          neue Teilnehmer, Admin-Logins und Exporte. Dies hilft bei der Nachverfolgung von Änderungen.
        </AlertDescription>
      </Alert>

      {/* Filter */}
      <Card className="content-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Lager</label>
              <Select value={selectedCamp} onValueChange={setSelectedCamp}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Lager</SelectItem>
                  {camps.map(camp => (
                    <SelectItem key={camp.id} value={camp.id}>
                      {camp.name} ({camp.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Aktion</label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Aktionen</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Suche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Details durchsuchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {filteredLogs.length} von {logs.length} Einträgen werden angezeigt
          </div>
        </CardContent>
      </Card>

      {/* Logs Tabelle */}
      <Card className="content-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum & Zeit</TableHead>
                  <TableHead>Aktion</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Browser</TableHead>
                  <TableHead>Lager</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map(log => (
                    <TableRow key={log.id} className="themed-list-item">
                      <TableCell className="font-mono text-sm">
                        <div>
                          {new Date(log.created_date).toLocaleDateString('de-DE')}
                        </div>
                        <div className="text-xs opacity-70">
                          {new Date(log.created_date).toLocaleTimeString('de-DE')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getActionBadge(log.action)}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-sm">
                          <div className="font-medium">{log.entity_type}</div>
                          {log.details && (
                            <div className="text-xs opacity-70 truncate">
                              {formatDetails(log.details)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs opacity-70 max-w-xs truncate">
                        {log.user_agent}
                      </TableCell>
                      <TableCell>
                        {log.camp_name && (
                          <Badge variant="outline" className="text-xs">
                            {log.camp_name}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Keine Audit-Logs gefunden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditLogPage() {
  return <AuditLogContent />;
}
