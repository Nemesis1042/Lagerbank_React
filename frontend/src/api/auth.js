// Authentication service for managing user sessions
class AuthService {
  constructor() {
    this.sessionToken = localStorage.getItem('sessionToken');
    this.authid = localStorage.getItem('authid');
    this.userType = localStorage.getItem('userType');
  }

  // Login with password
  async login(password, username = 'admin') {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password, username })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.sessionToken = data.sessionToken;
        this.authid = data.authid;
        this.userType = data.userType;

        // Store in localStorage
        localStorage.setItem('sessionToken', this.sessionToken);
        localStorage.setItem('authid', this.authid);
        localStorage.setItem('userType', this.userType);

        return { success: true, authid: this.authid, userType: this.userType };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error during login' };
    }
  }

  // Logout
  async logout() {
    try {
      if (this.sessionToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': this.sessionToken
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and instance variables
      this.sessionToken = null;
      this.authid = null;
      this.userType = null;
      
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('authid');
      localStorage.removeItem('userType');
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.sessionToken && this.authid && this.userType !== 'anonymous';
  }

  // Get current user info
  getCurrentUser() {
    return {
      authid: this.authid,
      userType: this.userType,
      isAuthenticated: this.isAuthenticated()
    };
  }

  // Get session token for API requests
  getSessionToken() {
    return this.sessionToken;
  }

  // Get authid
  getAuthId() {
    return this.authid || 'anonymous';
  }

  // Verify session with server
  async verifySession() {
    try {
      if (!this.sessionToken) {
        return false;
      }

      const response = await fetch('/api/auth/session', {
        headers: {
          'X-Session-Token': this.sessionToken
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.isAuthenticated) {
          // Update local data if needed
          this.authid = data.authid;
          this.userType = data.userType;
          localStorage.setItem('authid', this.authid);
          localStorage.setItem('userType', this.userType);
          return true;
        }
      }
      
      // Session is invalid, clear local data
      await this.logout();
      return false;
    } catch (error) {
      console.error('Session verification error:', error);
      return false;
    }
  }

  // Set up automatic session token inclusion in API requests
  setupApiInterceptor() {
    // This would be called during app initialization
    const originalFetch = window.fetch;
    
    window.fetch = async (url, options = {}) => {
      // Only add session token to API requests
      if (url.startsWith('/api/') && this.sessionToken) {
        options.headers = {
          ...options.headers,
          'X-Session-Token': this.sessionToken
        };
      }
      
      return originalFetch(url, options);
    };
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
