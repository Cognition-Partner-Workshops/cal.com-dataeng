import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, AlertTriangle, DollarSign, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import useStore from '../store/useStore';

export default function ManagerDashboard() {
  const { dashboardData, dashboardLoading, fetchDashboard } = useStore();

  useEffect(() => {
    fetchDashboard('manager');
  }, []);

  if (dashboardLoading || !dashboardData) {
    return <div className="flex items-center justify-center py-12" role="status"><span className="text-gray-500">Loading dashboard...</span></div>;
  }

  const { team_stats, pending_approvals, adjuster_workload, recent_decisions } = dashboardData;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Claims Manager Dashboard</h1>
        <p className="text-gray-600 text-sm">Team oversight and high-value claim approvals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Manager statistics">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><TrendingUp size={20} className="text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Total Claims</p>
              <p className="text-2xl font-bold">{team_stats?.total_claims || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg"><AlertTriangle size={20} className="text-yellow-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Open Claims</p>
              <p className="text-2xl font-bold">{team_stats?.open_claims || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg"><DollarSign size={20} className="text-red-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Needs My Approval</p>
              <p className="text-2xl font-bold text-red-600">{team_stats?.needs_manager_approval || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><DollarSign size={20} className="text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Total Approved</p>
              <p className="text-2xl font-bold">${parseFloat(team_stats?.total_approved || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Pending High-Value Approvals
          </h2>
          {pending_approvals?.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No claims pending your approval</p>
          ) : (
            <div className="space-y-3">
              {pending_approvals?.map((claim) => (
                <Link key={claim.id} to={`/claims/${claim.id}`} className="block p-3 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{claim.claim_number}</p>
                      <p className="text-xs text-gray-600">{claim.claimant_first_name} {claim.claimant_last_name} ({claim.policy_state})</p>
                    </div>
                    <span className="text-lg font-bold text-red-700">${parseFloat(claim.amount_claimed).toLocaleString()}</span>
                  </div>
                  {claim.adjuster_first_name && (
                    <p className="text-xs text-gray-500 mt-1">Adjuster: {claim.adjuster_first_name} {claim.adjuster_last_name}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Adjuster Workload */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={18} className="text-primary-600" />
            Adjuster Workload
          </h2>
          <div className="space-y-3">
            {adjuster_workload?.map((adj) => (
              <div key={adj.id} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-sm">{adj.first_name} {adj.last_name}</p>
                  <span className="text-sm font-bold text-primary-600">{adj.total_claims || 0} claims</span>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span>Active: {adj.active_claims || 0}</span>
                  <span>Avg: ${parseFloat(adj.avg_claim_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${Math.min(((adj.active_claims || 0) / 10) * 100, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={adj.active_claims || 0}
                    aria-valuemax={10}
                    aria-label={`${adj.first_name} workload`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Decisions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Decisions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-600">Claim #</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Claimed</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Approved</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Adjuster</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent_decisions?.map((d) => (
                <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2">
                    <Link to={`/claims/${d.id}`} className="text-primary-600 hover:underline font-medium">{d.claim_number}</Link>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`badge ${d.status === 'approved' || d.status === 'paid' ? 'bg-green-100 text-green-800' : d.status === 'denied' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3 px-2">${parseFloat(d.amount_claimed).toLocaleString()}</td>
                  <td className="py-3 px-2">{d.amount_approved ? `$${parseFloat(d.amount_approved).toLocaleString()}` : '-'}</td>
                  <td className="py-3 px-2">{d.adjuster_first_name ? `${d.adjuster_first_name} ${d.adjuster_last_name}` : '-'}</td>
                  <td className="py-3 px-2">{d.decision_date ? new Date(d.decision_date).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
