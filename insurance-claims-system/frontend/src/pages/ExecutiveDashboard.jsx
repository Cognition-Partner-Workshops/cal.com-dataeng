import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, DollarSign, AlertTriangle, Shield, BarChart3, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import useStore from '../store/useStore';

const COLORS = ['#1E3A5F', '#D4A843', '#059669', '#DC2626', '#7C3AED', '#2563EB', '#F59E0B', '#6B7280'];

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

export default function ExecutiveDashboard() {
  const { dashboardData, dashboardLoading, fetchDashboard } = useStore();

  useEffect(() => {
    fetchDashboard('executive');
  }, []);

  if (dashboardLoading || !dashboardData) {
    return <div className="flex items-center justify-center py-12" role="status"><span className="text-gray-500">Loading executive dashboard...</span></div>;
  }

  const { overview, claims_by_status, claims_by_type, claims_by_state, monthly_trends, top_adjusters, fraud_metrics, recent_claims, financial_summary } = dashboardData;

  const pieData = claims_by_status?.map((item) => ({
    name: item.status?.replace(/_/g, ' '),
    value: parseInt(item.count, 10),
  })) || [];

  const trendData = monthly_trends?.map((item) => ({
    month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    filed: parseInt(item.claims_filed, 10),
    claimed: Math.round(parseFloat(item.total_claimed || 0)),
    approved: Math.round(parseFloat(item.total_approved || 0)),
  })).reverse() || [];

  const stateData = claims_by_state?.map((item) => ({
    state: item.state,
    claims: parseInt(item.count, 10),
    amount: Math.round(parseFloat(item.total_amount || 0)),
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
        <p className="text-gray-600 text-sm">Enterprise KPIs and portfolio analytics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Key performance indicators">
        <div className="card border-l-4 border-l-primary-600">
          <p className="text-sm text-gray-600">Total Claims</p>
          <p className="text-3xl font-bold text-gray-900">{overview?.total_claims || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Avg: ${parseFloat(overview?.avg_claim_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="card border-l-4 border-l-accent-400">
          <p className="text-sm text-gray-600">Total Claimed</p>
          <p className="text-3xl font-bold text-gray-900">${parseFloat(overview?.total_claimed || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-gray-500 mt-1">Approved: ${parseFloat(overview?.total_approved || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="card border-l-4 border-l-green-500">
          <p className="text-sm text-gray-600">Loss Ratio</p>
          <p className="text-3xl font-bold text-gray-900">{financial_summary?.loss_ratio || 0}%</p>
          <p className="text-xs text-gray-500 mt-1">Paid: ${parseFloat(financial_summary?.total_paid_out || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="card border-l-4 border-l-red-500">
          <p className="text-sm text-gray-600">Fraud Risk</p>
          <p className="text-3xl font-bold text-gray-900">{fraud_metrics?.high_risk_claims || 0}</p>
          <p className="text-xs text-gray-500 mt-1">High risk claims (score &gt;50)</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Claims by Status Pie Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChart size={18} className="text-primary-600" />
            Claims by Status
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Claims by State Bar Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-primary-600" />
            Claims Volume by State
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="state" />
                <YAxis />
                <Tooltip formatter={(value, name) => name === 'amount' ? `$${value.toLocaleString()}` : value} />
                <Legend />
                <Bar dataKey="claims" fill="#1E3A5F" name="Claims Count" />
                <Bar dataKey="amount" fill="#D4A843" name="Total Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-primary-600" />
          Monthly Trends
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(value, name) => name !== 'filed' ? `$${value.toLocaleString()}` : value} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="filed" stroke="#1E3A5F" strokeWidth={2} name="Claims Filed" />
              <Line yAxisId="right" type="monotone" dataKey="claimed" stroke="#D4A843" strokeWidth={2} name="Amount Claimed" />
              <Line yAxisId="right" type="monotone" dataKey="approved" stroke="#059669" strokeWidth={2} name="Amount Approved" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fraud Metrics */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Fraud Detection Metrics
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{fraud_metrics?.high_risk_claims || 0}</p>
              <p className="text-xs text-gray-600">High Risk</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{fraud_metrics?.medium_risk_claims || 0}</p>
              <p className="text-xs text-gray-600">Medium Risk</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{fraud_metrics?.low_risk_claims || 0}</p>
              <p className="text-xs text-gray-600">Low Risk</p>
            </div>
          </div>
          <div className="mt-4 flex justify-between text-sm text-gray-600">
            <span>Avg Score: {parseFloat(fraud_metrics?.avg_fraud_score || 0).toFixed(1)}</span>
            <span>Max Score: {parseFloat(fraud_metrics?.max_fraud_score || 0).toFixed(1)}</span>
          </div>
        </div>

        {/* Top Adjusters */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield size={18} className="text-primary-600" />
            Adjuster Performance
          </h2>
          <div className="space-y-3">
            {top_adjusters?.map((adj) => (
              <div key={adj.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{adj.first_name} {adj.last_name}</p>
                  <p className="text-xs text-gray-500">{adj.claims_handled} claims handled</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="badge bg-green-100 text-green-800">{adj.approved_count} approved</span>
                  <span className="badge bg-red-100 text-red-800">{adj.denied_count} denied</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Claims */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Claims</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-600">Claim #</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Type</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Amount</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Fraud Score</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">State</th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">Filed</th>
              </tr>
            </thead>
            <tbody>
              {recent_claims?.map((claim) => (
                <tr key={claim.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2">
                    <Link to={`/claims/${claim.id}`} className="text-primary-600 hover:underline font-medium">{claim.claim_number}</Link>
                  </td>
                  <td className="py-3 px-2 capitalize">{claim.type?.replace(/_/g, ' ')}</td>
                  <td className="py-3 px-2"><span className={`badge ${statusColors[claim.status]}`}>{claim.status?.replace(/_/g, ' ')}</span></td>
                  <td className="py-3 px-2">${parseFloat(claim.amount_claimed).toLocaleString()}</td>
                  <td className="py-3 px-2">
                    <span className={`badge ${parseFloat(claim.fraud_score) >= 50 ? 'bg-red-100 text-red-800' : parseFloat(claim.fraud_score) >= 25 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {parseFloat(claim.fraud_score).toFixed(1)}
                    </span>
                  </td>
                  <td className="py-3 px-2">{claim.policy_state}</td>
                  <td className="py-3 px-2">{new Date(claim.filed_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
