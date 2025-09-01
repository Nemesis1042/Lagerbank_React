// frontend/src/api/base44Client.js

// Dummy-Client, um die bisherigen Importe unverändert zu lassen
export const base44 = {
  entities: {},        // wird von entities.js genutzt
  integrations: {},    // wird von integrations.js genutzt
  auth: {
    me: async () => ({ id: 1, name: "Local User" }) // Dummy-Auth
  }
};
