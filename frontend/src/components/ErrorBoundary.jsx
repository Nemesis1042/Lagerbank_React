import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{backgroundColor: 'var(--color-bg)'}}>
          <div className="max-w-md w-full">
            <Alert variant="destructive" className="content-card">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Ein Fehler ist aufgetreten</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <p>Die Anwendung ist auf einen unerwarteten Fehler gestoßen.</p>
                <p className="text-sm opacity-75">
                  Fehler: {this.state.error?.message || 'Unbekannter Fehler'}
                </p>
                <Button 
                  onClick={this.handleReset} 
                  className="w-full mt-4 primary-btn"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Anwendung neu laden
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;