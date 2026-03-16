import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          localStorage.setItem('token', data.token);
          localStorage.setItem('refreshToken', data.refreshToken);
          error.config.headers.Authorization = `Bearer ${data.token}`;
          return api(error.config);
        } catch (refreshError) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

export const claimsAPI = {
  list: (params) => api.get('/claims', { params }),
  get: (id) => api.get(`/claims/${id}`),
  create: (data) => api.post('/claims', data),
  update: (id, data) => api.put(`/claims/${id}`, data),
  decide: (id, data) => api.post(`/claims/${id}/decide`, data),
  assign: (id, data) => api.post(`/claims/${id}/assign`, data),
  getHistory: (id) => api.get(`/claims/${id}/history`),
  getDocuments: (id) => api.get(`/claims/${id}/documents`),
  uploadDocument: (id, data) => api.post(`/claims/${id}/documents`, data),
  getNotes: (id) => api.get(`/claims/${id}/notes`),
  addNote: (id, data) => api.post(`/claims/${id}/notes`, data),
};

export const policiesAPI = {
  list: (params) => api.get('/policies', { params }),
  get: (id) => api.get(`/policies/${id}`),
  create: (data) => api.post('/policies', data),
};

export const decisioningAPI = {
  evaluate: (claimId) => api.post(`/decisioning/evaluate/${claimId}`),
  getRules: (params) => api.get('/decisioning/rules', { params }),
  createRule: (data) => api.post('/decisioning/rules', data),
  updateRule: (id, data) => api.put(`/decisioning/rules/${id}`, data),
};

export const complianceAPI = {
  getAuditLog: (params) => api.get('/compliance/audit-log', { params }),
  getFlags: (params) => api.get('/compliance/flags', { params }),
  createFlag: (data) => api.post('/compliance/flags', data),
  resolveFlag: (id) => api.put(`/compliance/flags/${id}/resolve`),
  getReports: () => api.get('/compliance/reports'),
};

export const dashboardAPI = {
  getExecutive: () => api.get('/dashboard/executive'),
  getAdjuster: () => api.get('/dashboard/adjuster'),
  getManager: () => api.get('/dashboard/manager'),
};

export default api;
