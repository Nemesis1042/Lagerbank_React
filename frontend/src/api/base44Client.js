// API Client für Backend-Kommunikation
const API_BASE_URL = 'http://localhost:4000/api';

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
}

const apiClient = new ApiClient();
export default apiClient;

// Dummy-Export für Kompatibilität
export const base44 = {
  entities: {},
  integrations: {},
  auth: {
    me: async () => ({ id: 1, name: "Local User" })
  }
};
