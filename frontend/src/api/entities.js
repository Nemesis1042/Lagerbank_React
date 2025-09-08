import apiClient from './base44Client.js';

// Hilfsfunktion für Requests
async function apiRequest(path, options = {}) {
  return apiClient.request(`/entities${path}`, options);
}

// ==================== Participant ====================
export const Participant = {
  list: () => apiRequest("/Participant"),
  filter: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/Participant?${queryString}`);
  },
  getById: (id) => apiRequest(`/Participant/${id}`),
  create: (data) => apiRequest("/Participant", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/Participant/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/Participant/${id}`, { method: "DELETE" }),
  bulkCreate: (data) => apiRequest("/Participant/bulk", { method: "POST", body: JSON.stringify(data) }),
};

// ==================== Product ====================
export const Product = {
  list: () => apiRequest("/Product"),
  getById: (id) => apiRequest(`/Product/${id}`),
  create: (data) => apiRequest("/Product", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/Product/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/Product/${id}`, { method: "DELETE" }),
};

// ==================== Transaction ====================
export const Transaction = {
  list: () => apiRequest("/Transaction"),
  filter: (params, ordering, limit) => {
    const queryParams = new URLSearchParams(params);
    
    // Add ordering parameter if provided
    if (ordering) {
      queryParams.append(ordering, ''); // Add the ordering parameter (e.g., '-created_at')
    }
    
    // Add limit parameter if provided
    if (limit) {
      queryParams.append(limit.toString(), ''); // Add the limit as a parameter
    }
    
    return apiRequest(`/Transaction?${queryParams.toString()}`);
  },
  getById: (id) => apiRequest(`/Transaction/${id}`),
  create: (data) => apiRequest("/Transaction", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/Transaction/${id}`, { method: "PUT", body: JSON.stringify(data) }),
};

// ==================== Deposit ====================
export const Deposit = {
  list: () => apiRequest("/Deposit"),
  getById: (id) => apiRequest(`/Deposit/${id}`),
  create: (data) => apiRequest("/Deposit", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/Deposit/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/Deposit/${id}`, { method: "DELETE" }),
};

// ==================== Camp ====================
export const Camp = {
  list: () => apiRequest("/Camp"),
  getById: (id) => apiRequest(`/Camp/${id}`),
  create: (data) => apiRequest("/Camp", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/Camp/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => apiRequest(`/Camp/${id}`, { method: "DELETE" }),
};

// ==================== AppSettings ====================
export const AppSettings = {
  list: () => apiRequest("/AppSettings"),
  getById: (id) => apiRequest(`/AppSettings/${id}`),
  create: (data) => apiRequest("/AppSettings", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => apiRequest(`/AppSettings/${id}`, { method: "PUT", body: JSON.stringify(data) }),
};

// ==================== AuditLog ====================
export const AuditLog = {
  list: () => apiRequest("/AuditLog"),
  getById: (id) => apiRequest(`/AuditLog/${id}`),
  create: (data) => apiRequest("/AuditLog", { method: "POST", body: JSON.stringify(data) }),
  // update/delete meist nicht sinnvoll für Logs
};

// ==================== User/Auth ====================
export const User = {
  me: async () => ({ id: 1, name: "Local User" }),
};
