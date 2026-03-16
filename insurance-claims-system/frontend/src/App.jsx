import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useStore from './store/useStore';
import Layout from './components/layout/Layout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const PolicyholderDashboard = lazy(() => import('./pages/PolicyholderDashboard'));
const AdjusterDashboard = lazy(() => import('./pages/AdjusterDashboard'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const ComplianceDashboard = lazy(() => import('./pages/ComplianceDashboard'));
const ExecutiveDashboard = lazy(() => import('./pages/ExecutiveDashboard'));
const ClaimDetailPage = lazy(() => import('./pages/ClaimDetailPage'));
const FileClaimPage = lazy(() => import('./pages/FileClaimPage'));

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function DashboardRouter() {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" replace />;
  switch (user.role) {
    case 'policyholder': return <PolicyholderDashboard />;
    case 'claims_adjuster': return <AdjusterDashboard />;
    case 'claims_manager': return <ManagerDashboard />;
    case 'compliance_officer': return <ComplianceDashboard />;
    case 'executive': return <ExecutiveDashboard />;
    default: return <Navigate to="/login" replace />;
  }
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    <span className="sr-only">Loading...</span>
  </div>
);

export default function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardRouter />} />
            <Route path="claims" element={<DashboardRouter />} />
            <Route path="claims/new" element={<ProtectedRoute allowedRoles={['policyholder']}><FileClaimPage /></ProtectedRoute>} />
            <Route path="claims/:id" element={<ClaimDetailPage />} />
            <Route path="policies" element={<DashboardRouter />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
