import React, { Suspense, lazy } from 'react';
import Layout from "./Layout.jsx";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load components for better performance
const Dashboard = lazy(() => import("./Dashboard.jsx"));
const Teilnehmer = lazy(() => import("./Teilnehmer.jsx"));
const Checkin = lazy(() => import("./Checkin.jsx"));
const Kasse = lazy(() => import("./Kasse.jsx"));
const Checkout = lazy(() => import("./Checkout.jsx"));
const Produkte = lazy(() => import("./Produkte.jsx"));
const MitarbeiterBerichte = lazy(() => import("./MitarbeiterBerichte.jsx"));
const Einstellungen = lazy(() => import("./Einstellungen.jsx"));
const Mitarbeiter = lazy(() => import("./Mitarbeiter.jsx"));
const Lager = lazy(() => import("./Lager.jsx"));
const Export = lazy(() => import("./Export.jsx"));
const AuditLog = lazy(() => import("./AuditLog.jsx"));
const Inventur = lazy(() => import("./Inventur.jsx"));

// Loading component for lazy routes
const PageLoader = ({ pageName }) => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-64" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
    <Skeleton className="h-64 w-full" />
  </div>
);

// Error boundary for lazy loaded components
class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`Lazy loading error in ${this.props.pageName}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Fehler beim Laden der Seite
          </h2>
          <p className="text-gray-600 mb-4">
            Die Seite "{this.props.pageName}" konnte nicht geladen werden.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Seite neu laden
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
            <Suspense fallback={<PageLoader pageName={currentPage} />}>
                <Routes>            
                    <Route path="/" element={
                        <LazyErrorBoundary pageName="Dashboard">
                            <Dashboard />
                        </LazyErrorBoundary>
                    } />
                    
                    <Route path="/Dashboard" element={
                        <LazyErrorBoundary pageName="Dashboard">
                            <Dashboard />
                        </LazyErrorBoundary>
                    } />
                    
                    <Route path="/Teilnehmer" element={
                        <LazyErrorBoundary pageName="Teilnehmer">
                            <Teilnehmer />
                        </LazyErrorBoundary>
                    } />
                    
                    <Route path="/Checkin" element={
                        <LazyErrorBoundary pageName="Checkin">
                            <Checkin />
                        </LazyErrorBoundary>
                    } />
                    
                    <Route path="/Kasse" element={
                        <LazyErrorBoundary pageName="Kasse">
                            <Kasse />
                        </LazyErrorBoundary>
                    } />
                    
                    <Route path="/Checkout" element={
                        <LazyErrorBoundary pageName="Checkout">
                            <Checkout />
                        </LazyErrorBoundary>
                    } />
                    
                    <Route path="/Produkte" element={
                        <LazyErrorBoundary pageName="Produkte">
                            <Produkte />
                        </LazyErrorBoundary>
                    } />
                    
                    <Route path="/MitarbeiterBerichte" element={
                        <LazyErrorBoundary pageName="MitarbeiterBerichte">
                            <MitarbeiterBerichte />
                        </LazyErrorBoundary>
                    } />
                    
                    <Route path="/Einstellungen" element={
                        <LazyErrorBoundary pageName="Einstellungen">
                            <Einstellungen />
                        </LazyErrorBoundary>
                    } />
                    
                    <Route path="/Mitarbeiter" element={
                        <LazyErrorBoundary pageName="Mitarbeiter">
                            <Mitarbeiter />
                        </LazyErrorBoundary>
                    } />
                    
                    <Route path="/Lager" element={
                        <LazyErrorBoundary pageName="Lager">
                            <Lager />
                        </LazyErrorBoundary>
                    } />
                    
                    <Route path="/Export" element={
                        <LazyErrorBoundary pageName="Export">
                            <Export />
                        </LazyErrorBoundary>
                    } />
                    
                    <Route path="/AuditLog" element={
                        <LazyErrorBoundary pageName="AuditLog">
                            <AuditLog />
                        </LazyErrorBoundary>
                    } />
                    
                    <Route path="/Inventur" element={
                        <LazyErrorBoundary pageName="Inventur">
                            <Inventur />
                        </LazyErrorBoundary>
                    } />
                </Routes>
            </Suspense>
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
