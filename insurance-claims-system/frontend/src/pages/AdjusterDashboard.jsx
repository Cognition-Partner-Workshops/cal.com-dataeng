import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import useStore from '../store/useStore';

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const statusColors = {
  filed: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  investigation: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800',
  paid: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-gray-100 text-gray-800',
  appealed: 'bg-purple-100 text-purple-800',
};

export default function AdjusterDashboard() {
  const { dashboardData, dashboardLoading, fetchDashboard } = useStore();

  useEffect(() => {
    fetchDashboard('adjuster');
  }, []);

  if (dashboardLoading || !dashboardData) {
    return <div className="flex items-center justify-center py-12" role="status"><span className="text-gray-500">Loading dashboard...</span></div>;
  }

  const { my_claims, stats, recent_activity, unassigned_claims } = dashboardData;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Adjuster Dashboard</h1>
        <p className="text-gray-600 text-sm">Manage your assigned claims and review queue</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Adjuster statistics">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><ClipboardList size={20} className="text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Total Assigned</p>
              <p className="text-2xl font-bold">{stats?.total_assigned || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg"><Clock size={20} className="text-yellow-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold">{stats?.active || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><CheckCircle size={20} className="text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold">{stats?.approved || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg"><AlertTriangle size={20} className="text-red-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Urgent</p>
              <p className="text-2xl font-bold">{stats?.urgent || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Active Claims */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Active Claims</h2>
          {my_claims?.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No active claims assigned</p>
          ) : (
            <div className="space-y-3">
              {my_claims?.slice(0, 8).map((claim) => (
                <Link key={claim.id} to={`/claims/${claim.id}`} className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{claim.claim_number}</p>
                      <p className="text-xs text-gray-500 capitalize">{claim.type?.replace(/_/g, ' ')} - {claim.claimant_first_name} {claim.claimant_last_name}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`badge ${statusColors[claim.status]}`}>{claim.status?.replace(/_/g, ' ')}</span>
                      <span className={`badge ${priorityColors[claim.priority]}`}>{claim.priority}</span>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>${parseFloat(claim.amount_claimed).toLocaleString()}</span>
                    <span>Fraud: {parseFloat(claim.fraud_score).toFixed(1)}%</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Unassigned Claims Queue */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Unassigned Claims Queue</h2>
          {unassigned_claims?.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">No unassigned claims</p>
          ) : (
            <div className="space-y-3">
              {unassigned_claims?.map((claim) => (
                <Link key={claim.id} to={`/claims/${claim.id}`} className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{claim.claim_number}</p>
                      <p className="text-xs text-gray-500 capitalize">{claim.type?.replace(/_/g, ' ')} - {claim.claimant_first_name} {claim.claimant_last_name}</p>
                    </div>
                    <span className={`badge ${priorityColors[claim.priority]}`}>{claim.priority}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">${parseFloat(claim.amount_claimed).toLocaleString()} - Filed {new Date(claim.filed_date).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {recent_activity?.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {recent_activity?.map((activity, idx) => (
              <div key={idx} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">{activity.claim_number}</span>
                  <span className="text-gray-500"> — {activity.from_status} → {activity.to_status}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(activity.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
