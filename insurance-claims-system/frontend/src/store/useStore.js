import { create } from 'zustand';
import { authAPI, claimsAPI, policiesAPI, dashboardAPI, complianceAPI, decisioningAPI } from '../utils/api';

const useStore = create((set, get) => ({
  // Auth state
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  authLoading: false,
  authError: null,

  login: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const { data } = await authAPI.login({ email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isAuthenticated: true, authLoading: false });
      return data.user;
    } catch (error) {
      const msg = error.response?.data?.error || 'Login failed';
      set({ authError: msg, authLoading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try { await authAPI.logout(); } catch (e) { /* ignore */ }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  register: async (userData) => {
    set({ authLoading: true, authError: null });
    try {
      const { data } = await authAPI.register(userData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isAuthenticated: true, authLoading: false });
      return data.user;
    } catch (error) {
      const msg = error.response?.data?.error || 'Registration failed';
      set({ authError: msg, authLoading: false });
      throw new Error(msg);
    }
  },

  // Claims state
  claims: [],
  claimsPagination: { page: 1, limit: 20, total: 0, pages: 0 },
  currentClaim: null,
  claimsLoading: false,
  claimsError: null,

  fetchClaims: async (params = {}) => {
    set({ claimsLoading: true, claimsError: null });
    try {
      const { data } = await claimsAPI.list(params);
      set({ claims: data.claims, claimsPagination: data.pagination, claimsLoading: false });
    } catch (error) {
      set({ claimsError: error.response?.data?.error || 'Failed to fetch claims', claimsLoading: false });
    }
  },

  fetchClaim: async (id) => {
    set({ claimsLoading: true, claimsError: null });
    try {
      const { data } = await claimsAPI.get(id);
      set({ currentClaim: data, claimsLoading: false });
      return data;
    } catch (error) {
      set({ claimsError: error.response?.data?.error || 'Failed to fetch claim', claimsLoading: false });
    }
  },

  createClaim: async (claimData) => {
    try {
      const { data } = await claimsAPI.create(claimData);
      const { claims } = get();
      set({ claims: [data.claim, ...claims] });
      return data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create claim');
    }
  },

  decideClaim: async (id, decision) => {
    try {
      const { data } = await claimsAPI.decide(id, decision);
      const { claims } = get();
      set({ claims: claims.map((c) => (c.id === parseInt(id) ? data : c)), currentClaim: data });
      return data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to process decision');
    }
  },

  assignClaim: async (id, adjusterId) => {
    try {
      const { data } = await claimsAPI.assign(id, { adjuster_id: adjusterId });
      const { claims } = get();
      set({ claims: claims.map((c) => (c.id === parseInt(id) ? data : c)), currentClaim: data });
      return data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to assign claim');
    }
  },

  // Policies state
  policies: [],
  policiesPagination: { page: 1, limit: 20, total: 0, pages: 0 },
  policiesLoading: false,

  fetchPolicies: async (params = {}) => {
    set({ policiesLoading: true });
    try {
      const { data } = await policiesAPI.list(params);
      set({ policies: data.policies, policiesPagination: data.pagination, policiesLoading: false });
    } catch (error) {
      set({ policiesLoading: false });
    }
  },

  // Dashboard state
  dashboardData: null,
  dashboardLoading: false,

  fetchDashboard: async (type) => {
    set({ dashboardLoading: true });
    try {
      let data;
      if (type === 'executive') {
        const res = await dashboardAPI.getExecutive();
        data = res.data;
      } else if (type === 'adjuster') {
        const res = await dashboardAPI.getAdjuster();
        data = res.data;
      } else if (type === 'manager') {
        const res = await dashboardAPI.getManager();
        data = res.data;
      }
      set({ dashboardData: data, dashboardLoading: false });
      return data;
    } catch (error) {
      set({ dashboardLoading: false });
    }
  },

  // Compliance state
  auditLog: [],
  complianceFlags: [],
  complianceReports: null,
  complianceLoading: false,

  fetchAuditLog: async (params = {}) => {
    set({ complianceLoading: true });
    try {
      const { data } = await complianceAPI.getAuditLog(params);
      set({ auditLog: data.audit_log, complianceLoading: false });
    } catch (error) {
      set({ complianceLoading: false });
    }
  },

  fetchComplianceFlags: async (params = {}) => {
    set({ complianceLoading: true });
    try {
      const { data } = await complianceAPI.getFlags(params);
      set({ complianceFlags: data.flags, complianceLoading: false });
    } catch (error) {
      set({ complianceLoading: false });
    }
  },

  fetchComplianceReports: async () => {
    set({ complianceLoading: true });
    try {
      const { data } = await complianceAPI.getReports();
      set({ complianceReports: data, complianceLoading: false });
      return data;
    } catch (error) {
      set({ complianceLoading: false });
    }
  },

  resolveFlag: async (id) => {
    try {
      await complianceAPI.resolveFlag(id);
      const { complianceFlags } = get();
      set({ complianceFlags: complianceFlags.map((f) => (f.id === parseInt(id) ? { ...f, resolved: true } : f)) });
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to resolve flag');
    }
  },

  // Decision rules state
  decisionRules: [],
  rulesLoading: false,

  fetchDecisionRules: async (params = {}) => {
    set({ rulesLoading: true });
    try {
      const { data } = await decisioningAPI.getRules(params);
      set({ decisionRules: data, rulesLoading: false });
    } catch (error) {
      set({ rulesLoading: false });
    }
  },
}));

export default useStore;
