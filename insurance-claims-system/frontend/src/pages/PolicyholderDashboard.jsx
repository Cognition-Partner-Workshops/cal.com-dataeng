import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Clock, CheckCircle, XCircle, DollarSign, AlertTriangle } from 'lucide-react';
import useStore from '../store/useStore';

const statusConfig = {
  filed: { color: 'bg-blue-100 text-blue-800', icon: Clock },
  under_review: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  investigation: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  denied: { color: 'bg-red-100 text-red-800', icon: XCircle },
  paid: { color: 'bg-emerald-100 text-emerald-800', icon: DollarSign },
  closed: { color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  appealed: { color: 'bg-purple-100 text-purple-800', icon: AlertTriangle },
};

export default function PolicyholderDashboard() {
  const { claims, claimsPagination, fetchClaims, claimsLoading, policies, fetchPolicies } = useStore();
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchClaims({ status: statusFilter || undefined });
    fetchPolicies();
  }, [statusFilter]);

  const totalClaimed = claims.reduce((sum, c) => sum + parseFloat(c.amount_claimed || 0), 0);
  const totalApproved = claims.reduce((sum, c) => sum + parseFloat(c.amount_approved || 0), 0);
  const activeClaims = claims.filter((c) => !['closed', 'paid', 'denied'].includes(c.status)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600 text-sm">View your claims and policies</p>
        </div>
        <Link to="/claims/new" className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          File a Claim
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Claims summary">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><FileText size={20} className="text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Total Claims</p>
              <p className="text-2xl font-bold text-gray-900">{claimsPagination.total}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg"><Clock size={20} className="text-yellow-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Active Claims</p>
              <p className="text-2xl font-bold text-gray-900">{activeClaims}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><DollarSign size={20} className="text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Total Claimed</p>
              <p className="text-2xl font-bold text-gray-900">${totalClaimed.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg"><CheckCircle size={20} className="text-emerald-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Total Approved</p>
              <p className="text-2xl font-bold text-gray-900">${totalApproved.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Policies */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">My Policies</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-600">Policy #</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Type</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Coverage</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">State</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Expires</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr key={policy.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{policy.policy_number}</td>
                  <td className="py-3 px-2 capitalize">{policy.type}</td>
                  <td className="py-3 px-2">
                    <span className={`badge ${policy.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {policy.status}
                    </span>
                  </td>
                  <td className="py-3 px-2">${parseFloat(policy.coverage_limit).toLocaleString()}</td>
                  <td className="py-3 px-2">{policy.state}</td>
                  <td className="py-3 px-2">{new Date(policy.expiration_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claims List */}
      <div className="card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">My Claims</h2>
          <div>
            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-sm py-1.5"
            >
              <option value="">All Statuses</option>
              <option value="filed">Filed</option>
              <option value="under_review">Under Review</option>
              <option value="investigation">Investigation</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="paid">Paid</option>
              <option value="closed">Closed</option>
              <option value="appealed">Appealed</option>
            </select>
          </div>
        </div>

        {claimsLoading ? (
          <div className="text-center py-8" role="status"><span className="text-gray-500">Loading claims...</span></div>
        ) : claims.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No claims found. <Link to="/claims/new" className="text-primary-600 hover:underline">File your first claim</Link></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Claim #</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Type</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Amount</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Filed</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => {
                  const config = statusConfig[claim.status] || statusConfig.filed;
                  const StatusIcon = config.icon;
                  return (
                    <tr key={claim.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium">{claim.claim_number}</td>
                      <td className="py-3 px-2 capitalize">{claim.type.replace(/_/g, ' ')}</td>
                      <td className="py-3 px-2">
                        <span className={`badge ${config.color} flex items-center gap-1 w-fit`}>
                          <StatusIcon size={12} />
                          {claim.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-2">${parseFloat(claim.amount_claimed).toLocaleString()}</td>
                      <td className="py-3 px-2">{new Date(claim.filed_date).toLocaleDateString()}</td>
                      <td className="py-3 px-2">
                        <Link to={`/claims/${claim.id}`} className="text-primary-600 hover:underline text-sm font-medium">View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
