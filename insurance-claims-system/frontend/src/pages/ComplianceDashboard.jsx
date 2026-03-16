import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, FileText, Search } from 'lucide-react';
import useStore from '../store/useStore';

const severityColors = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export default function ComplianceDashboard() {
  const {
    auditLog, complianceFlags, complianceReports,
    fetchAuditLog, fetchComplianceFlags, fetchComplianceReports,
    resolveFlag, complianceLoading,
  } = useStore();
  const [activeTab, setActiveTab] = useState('flags');
  const [flagFilter, setFlagFilter] = useState('');

  useEffect(() => {
    fetchComplianceFlags({ resolved: flagFilter || undefined });
    fetchAuditLog({ limit: 50 });
    fetchComplianceReports();
  }, [flagFilter]);

  const handleResolve = async (flagId) => {
    try {
      await resolveFlag(flagId);
      fetchComplianceFlags({ resolved: flagFilter || undefined });
    } catch (error) {
      alert(error.message);
    }
  };

  const tabs = [
    { id: 'flags', label: 'Compliance Flags', icon: AlertTriangle },
    { id: 'audit', label: 'Audit Log', icon: FileText },
    { id: 'reports', label: 'Reports', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
        <p className="text-gray-600 text-sm">Monitor regulatory compliance and audit trails</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Compliance summary">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg"><AlertTriangle size={20} className="text-red-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Open Flags</p>
              <p className="text-2xl font-bold text-red-600">{complianceFlags?.filter(f => !f.resolved).length || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><CheckCircle size={20} className="text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{complianceFlags?.filter(f => f.resolved).length || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><FileText size={20} className="text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-600">Audit Entries</p>
              <p className="text-2xl font-bold">{auditLog?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><Shield size={20} className="text-purple-600" /></div>
            <div>
              <p className="text-sm text-gray-600">States Monitored</p>
              <p className="text-2xl font-bold">3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4" aria-label="Compliance sections" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Flags Tab */}
      {activeTab === 'flags' && (
        <div className="card" role="tabpanel" aria-label="Compliance Flags">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Compliance Flags</h2>
            <div>
              <label htmlFor="flag-filter" className="sr-only">Filter flags</label>
              <select id="flag-filter" value={flagFilter} onChange={(e) => setFlagFilter(e.target.value)} className="input-field text-sm py-1.5">
                <option value="">All Flags</option>
                <option value="false">Open</option>
                <option value="true">Resolved</option>
              </select>
            </div>
          </div>
          {complianceFlags?.length === 0 ? (
            <p className="text-gray-500 py-4">No flags found</p>
          ) : (
            <div className="space-y-3">
              {complianceFlags?.map((flag) => (
                <div key={flag.id} className={`p-4 border rounded-lg ${flag.resolved ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge ${severityColors[flag.severity]}`}>{flag.severity}</span>
                        <span className="text-sm font-medium text-gray-700">{flag.flag_type?.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-gray-500">Claim: {flag.claim_number}</span>
                      </div>
                      <p className="text-sm text-gray-600">{flag.description}</p>
                      {flag.resolved && (
                        <p className="text-xs text-green-600 mt-1">Resolved by {flag.resolver_first_name} {flag.resolver_last_name}</p>
                      )}
                    </div>
                    {!flag.resolved && (
                      <button onClick={() => handleResolve(flag.id)} className="btn-primary text-xs px-3 py-1">
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="card" role="tabpanel" aria-label="Audit Log">
          <h2 className="text-lg font-semibold mb-4">Audit Log</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Timestamp</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">User</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Action</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Entity</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-600">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLog?.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 text-xs">{new Date(entry.created_at).toLocaleString()}</td>
                    <td className="py-3 px-2">{entry.first_name ? `${entry.first_name} ${entry.last_name}` : 'System'}</td>
                    <td className="py-3 px-2"><span className="badge bg-gray-100 text-gray-800">{entry.action}</span></td>
                    <td className="py-3 px-2 capitalize">{entry.entity_type} #{entry.entity_id}</td>
                    <td className="py-3 px-2 text-xs text-gray-500 max-w-xs truncate">
                      {entry.new_values ? JSON.stringify(entry.new_values).substring(0, 80) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6" role="tabpanel" aria-label="Compliance Reports">
          {/* By State */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Claims by State</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-600">State</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Total Claims</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Approved</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Denied</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Avg Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceReports?.by_state?.map((row) => (
                    <tr key={row.state} className="border-b border-gray-100">
                      <td className="py-3 px-2 font-medium">{row.state}</td>
                      <td className="py-3 px-2">{row.total_claims}</td>
                      <td className="py-3 px-2 text-green-600">{row.approved}</td>
                      <td className="py-3 px-2 text-red-600">{row.denied}</td>
                      <td className="py-3 px-2">${parseFloat(row.avg_claim_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Decision Breakdown */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Decision Breakdown</h2>
            {complianceReports?.decision_breakdown && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{complianceReports.decision_breakdown.auto_approved || 0}</p>
                  <p className="text-sm text-gray-600">Auto-Approved</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{complianceReports.decision_breakdown.manual_approved || 0}</p>
                  <p className="text-sm text-gray-600">Manual Approved</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{complianceReports.decision_breakdown.denied || 0}</p>
                  <p className="text-sm text-gray-600">Denied</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{complianceReports.decision_breakdown.pending_review || 0}</p>
                  <p className="text-sm text-gray-600">Pending Review</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
