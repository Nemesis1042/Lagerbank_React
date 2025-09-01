const API_BASE = "http://localhost:4000/api/entities";

// Hilfsfunktion für Requests
async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
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
  getById: (id) => apiRequest(`/Transaction/${id}`),
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
  // create/update/delete meist nicht sinnvoll für Logs
};

// ==================== User/Auth ====================
export const User = {
  me: async () => ({ id: 1, name: "Local User" }),
};
