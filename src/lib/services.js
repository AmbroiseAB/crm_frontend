import api from "./api";

/* ── Auth ───────────────────────────────────────────────────────────── */
export const authApi = {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/profile", data),
};

/* ── Leads ──────────────────────────────────────────────────────────── */
export const leadsApi = {
  list: (params) => api.get("/leads", { params }),
  get: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post("/leads", data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  remove: (id) => api.delete(`/leads/${id}`),
  reorder: (updates) => api.patch("/leads/reorder", { updates }),
  interactions: (id, params) => api.get(`/leads/${id}/interactions`, { params }),
  createInteraction: (id, data) => api.post(`/leads/${id}/interactions`, data),
  updateNextAction: (id, data) => api.patch(`/leads/${id}/next-action`, data),
  completeNextAction: (id) => api.post(`/leads/${id}/next-action/complete`),
  stageHistory: (id) => api.get(`/leads/${id}/stage-history`),
  updateQualification: (id, data) => api.patch(`/leads/${id}/qualification`, data),
};

/* ── Contacts ───────────────────────────────────────────────────────── */
export const contactsApi = {
  list: (params) => api.get("/contacts", { params }),
  get: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post("/contacts", data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  remove: (id) => api.delete(`/contacts/${id}`),  
};

/* ── Notes ──────────────────────────────────────────────────────────── */
export const notesApi = {
  list: (params) => api.get("/notes", { params }),
  create: (data) => api.post("/notes", data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  remove: (id) => api.delete(`/notes/${id}`),  
};

/* ── Tasks ──────────────────────────────────────────────────────────── */
export const tasksApi = {
  list: (params) => api.get("/tasks", { params }),
  create: (data) => api.post("/tasks", data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  remove: (id) => api.delete(`/tasks/${id}`),  
};

/* ── AI ─────────────────────────────────────────────────────────────── */
export const aiApi = {
  status: () => api.get("/ai/status"),
  leadSummary: (data) => api.post("/ai/lead-summary", data),
  generateEmail: (data) => api.post("/ai/generate-email", data),
  salesInsights: (data) => api.post("/ai/sales-insights", data),
  results: (params) => api.get("/ai/results", {params}),
};  

/* ── Analytics (computed from the in-memory leads, so the dashboard always
      matches the Leads/Pipeline pages) ──────────────────────────────────── */
export const analyticsApi = {
  overview: () => api.get("/analytics/overview"),
};

export const actionCenterApi = {
  get: () => api.get("/action-center"),
};

export const notificationsApi = {
  list: () => api.get("/notifications"),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  remove: (id) => api.delete(`/notifications/${id}`),
  clear: () => api.delete("/notifications"),
};

export const pipelineApi = {
  intelligence: () => api.get("/pipeline/intelligence"),
};

