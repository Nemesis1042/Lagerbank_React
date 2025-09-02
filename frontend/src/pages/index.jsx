import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard.jsx";

import Teilnehmer from "./Teilnehmer.jsx";

import Checkin from "./Checkin.jsx";

import Kasse from "./Kasse.jsx";

import Checkout from "./Checkout.jsx";

import Produkte from "./Produkte.jsx";

import MitarbeiterBerichte from "./MitarbeiterBerichte.jsx";

import Einstellungen from "./Einstellungen.jsx";

import Mitarbeiter from "./Mitarbeiter.jsx";

import Lager from "./Lager.jsx";

import Export from "./Export.jsx";

import AuditLog from "./AuditLog.jsx";

import Inventur from "./Inventur.jsx";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Teilnehmer: Teilnehmer,
    
    Checkin: Checkin,
    
    Kasse: Kasse,
    
    Checkout: Checkout,
    
    Produkte: Produkte,
    
    MitarbeiterBerichte: MitarbeiterBerichte,
    
    Einstellungen: Einstellungen,
    
    Mitarbeiter: Mitarbeiter,
    
    Lager: Lager,
    
    Export: Export,
    
    AuditLog: AuditLog,
    
    Inventur: Inventur,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Teilnehmer" element={<Teilnehmer />} />
                
                <Route path="/Checkin" element={<Checkin />} />
                
                <Route path="/Kasse" element={<Kasse />} />
                
                <Route path="/Checkout" element={<Checkout />} />
                
                <Route path="/Produkte" element={<Produkte />} />
                
                <Route path="/MitarbeiterBerichte" element={<MitarbeiterBerichte />} />
                
                <Route path="/Einstellungen" element={<Einstellungen />} />
                
                <Route path="/Mitarbeiter" element={<Mitarbeiter />} />
                
                <Route path="/Lager" element={<Lager />} />
                
                <Route path="/Export" element={<Export />} />
                
                <Route path="/AuditLog" element={<AuditLog />} />
                
                <Route path="/Inventur" element={<Inventur />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
