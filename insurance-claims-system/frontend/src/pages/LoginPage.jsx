import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import useStore from '../store/useStore';

const demoAccounts = [
  { email: 'john.doe@safeguard.com', password: 'Policyholder#2024!Secure', role: 'Policyholder', color: 'bg-blue-100 text-blue-800' },
  { email: 'adjuster.mike@safeguard.com', password: 'Adjuster#Mike2024!Sec', role: 'Claims Adjuster', color: 'bg-green-100 text-green-800' },
  { email: 'manager.lisa@safeguard.com', password: 'Manager#Lisa2024!Sec!', role: 'Claims Manager', color: 'bg-purple-100 text-purple-800' },
  { email: 'compliance.tom@safeguard.com', password: 'Compliance#Tom2024!S!', role: 'Compliance Officer', color: 'bg-orange-100 text-orange-800' },
  { email: 'exec.patricia@safeguard.com', password: 'Executive#Pat2024!Se!', role: 'Executive', color: 'bg-red-100 text-red-800' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, authLoading, authError } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDemoLogin = async (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
    try {
      await login(account.email, account.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Branding */}
        <div className="flex flex-col justify-center text-white p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield size={48} className="text-accent-400" />
            <div>
              <h1 className="text-3xl font-bold">SafeGuard Insurance</h1>
              <p className="text-primary-200 text-sm">Claims Management System</p>
            </div>
          </div>
          <p className="text-primary-100 text-lg mb-8 leading-relaxed">
            Enterprise-grade insurance claims processing with intelligent decisioning,
            fraud detection, and regulatory compliance across TX, CA, and NY.
          </p>

          {/* Demo Quick Login */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5">
            <h2 className="text-sm font-semibold text-accent-400 mb-3 uppercase tracking-wider">Demo Quick Login</h2>
            <div className="space-y-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  onClick={() => handleDemoLogin(account)}
                  disabled={authLoading}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-left disabled:opacity-50"
                  aria-label={`Login as ${account.role}`}
                >
                  <span className="text-sm font-medium">{account.email}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${account.color}`}>{account.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign In</h2>

          {(error || authError) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm" role="alert" aria-live="polite">
              {error || authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@safeguard.com"
                required
                autoComplete="email"
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  aria-required="true"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full btn-primary py-3 text-base"
            >
              {authLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:underline font-medium">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
