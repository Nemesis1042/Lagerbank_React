import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import ErrorBoundary from "@/components/ErrorBoundary.jsx"
import authService from "@/api/auth"
import { useEffect } from 'react'

function App() {
  useEffect(() => {
    // Initialize authentication service
    authService.setupApiInterceptor();
    
    // Verify existing session on app start
    authService.verifySession().catch(error => {
      console.log('Session verification failed:', error);
    });
  }, []);

  return (
    <ErrorBoundary>
      <Pages />
      <Toaster />
    </ErrorBoundary>
  )
}

export default App
