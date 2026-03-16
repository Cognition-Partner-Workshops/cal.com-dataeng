import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import useStore from '../store/useStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, authLoading } = useStore();
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', role: 'policyholder', branch: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <Shield size={32} className="text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input id="first_name" type="text" className="input-field" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required aria-required="true" />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input id="last_name" type="text" className="input-field" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required aria-required="true" />
            </div>
          </div>
          <div>
            <label htmlFor="reg_email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input id="reg_email" type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required aria-required="true" autoComplete="email" />
          </div>
          <div>
            <label htmlFor="reg_password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input id="reg_password" type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required aria-required="true" autoComplete="new-password" placeholder="Min 12 chars, upper, lower, number, special" />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select id="role" className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} aria-required="true">
              <option value="policyholder">Policyholder</option>
              <option value="claims_adjuster">Claims Adjuster</option>
              <option value="claims_manager">Claims Manager</option>
              <option value="compliance_officer">Compliance Officer</option>
              <option value="executive">Executive</option>
            </select>
          </div>
          <button type="submit" disabled={authLoading} className="w-full btn-primary py-3">
            {authLoading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account? <Link to="/login" className="text-primary-600 hover:underline font-medium">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
