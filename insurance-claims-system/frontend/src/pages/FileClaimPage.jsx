import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import useStore from '../store/useStore';

const claimTypes = [
  { value: 'auto_collision', label: 'Auto Collision' },
  { value: 'auto_comprehensive', label: 'Auto Comprehensive' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'liability', label: 'Liability' },
  { value: 'medical', label: 'Medical' },
  { value: 'workers_comp', label: "Workers' Compensation" },
  { value: 'fire', label: 'Fire' },
  { value: 'theft', label: 'Theft' },
  { value: 'natural_disaster', label: 'Natural Disaster' },
  { value: 'other', label: 'Other' },
];

export default function FileClaimPage() {
  const navigate = useNavigate();
  const { policies, fetchPolicies, createClaim, claimsLoading } = useStore();
  const [form, setForm] = useState({
    policy_id: '',
    type: '',
    amount_claimed: '',
    incident_date_month: '',
    incident_date_day: '',
    incident_date_year: '',
    incident_description: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPolicies();
  }, []);

  const activePolicies = policies.filter((p) => p.status === 'active');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const month = parseInt(form.incident_date_month, 10);
    const day = parseInt(form.incident_date_day, 10);
    const year = parseInt(form.incident_date_year, 10);
    const currentYear = new Date().getFullYear();

    if (!month || month < 1 || month > 12) { setError('Invalid month (1-12)'); return; }
    if (!day || day < 1 || day > 31) { setError('Invalid day (1-31)'); return; }
    if (!year || year < 2020 || year > currentYear) { setError(`Invalid year (2020-${currentYear})`); return; }

    const incident_date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    try {
      await createClaim({
        policy_id: parseInt(form.policy_id, 10),
        type: form.type,
        amount_claimed: parseFloat(form.amount_claimed),
        incident_date,
        incident_description: form.incident_description,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const update = (field, value) => setForm({ ...form, [field]: value });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">File a New Claim</h1>
          <p className="text-gray-600 text-sm">Submit a claim against one of your active policies</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5" noValidate>
        {/* Policy Selection */}
        <div>
          <label htmlFor="policy_id" className="block text-sm font-medium text-gray-700 mb-1">Policy</label>
          <select
            id="policy_id"
            value={form.policy_id}
            onChange={(e) => update('policy_id', e.target.value)}
            className="input-field"
            required
            aria-required="true"
          >
            <option value="">Select a policy...</option>
            {activePolicies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.policy_number} — {p.type} ({p.state}) — Coverage: ${parseFloat(p.coverage_limit).toLocaleString()}
              </option>
            ))}
          </select>
          {activePolicies.length === 0 && (
            <p className="text-xs text-red-500 mt-1">No active policies found. You need an active policy to file a claim.</p>
          )}
        </div>

        {/* Claim Type */}
        <div>
          <label htmlFor="claim_type" className="block text-sm font-medium text-gray-700 mb-1">Claim Type</label>
          <select
            id="claim_type"
            value={form.type}
            onChange={(e) => update('type', e.target.value)}
            className="input-field"
            required
            aria-required="true"
          >
            <option value="">Select claim type...</option>
            {claimTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount_claimed" className="block text-sm font-medium text-gray-700 mb-1">Amount Claimed ($)</label>
          <input
            id="amount_claimed"
            type="number"
            step="0.01"
            min="1"
            value={form.amount_claimed}
            onChange={(e) => update('amount_claimed', e.target.value)}
            className="input-field"
            placeholder="0.00"
            required
            aria-required="true"
          />
        </div>

        {/* Incident Date — separate MM/DD/YYYY fields */}
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-1">Incident Date</legend>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="incident_month" className="sr-only">Month</label>
              <input
                id="incident_month"
                type="number"
                min="1"
                max="12"
                value={form.incident_date_month}
                onChange={(e) => update('incident_date_month', e.target.value)}
                className="input-field"
                placeholder="MM"
                required
                aria-required="true"
                aria-label="Incident month"
              />
            </div>
            <div>
              <label htmlFor="incident_day" className="sr-only">Day</label>
              <input
                id="incident_day"
                type="number"
                min="1"
                max="31"
                value={form.incident_date_day}
                onChange={(e) => update('incident_date_day', e.target.value)}
                className="input-field"
                placeholder="DD"
                required
                aria-required="true"
                aria-label="Incident day"
              />
            </div>
            <div>
              <label htmlFor="incident_year" className="sr-only">Year</label>
              <input
                id="incident_year"
                type="number"
                min="2020"
                max={new Date().getFullYear()}
                value={form.incident_date_year}
                onChange={(e) => update('incident_date_year', e.target.value)}
                className="input-field"
                placeholder="YYYY"
                required
                aria-required="true"
                aria-label="Incident year"
              />
            </div>
          </div>
        </fieldset>

        {/* Description */}
        <div>
          <label htmlFor="incident_description" className="block text-sm font-medium text-gray-700 mb-1">
            Incident Description
          </label>
          <textarea
            id="incident_description"
            value={form.incident_description}
            onChange={(e) => update('incident_description', e.target.value)}
            className="input-field"
            rows={5}
            required
            aria-required="true"
            placeholder="Describe what happened, including date, location, and any relevant details..."
          />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={claimsLoading} className="btn-primary flex items-center gap-2">
            <FileText size={18} />
            {claimsLoading ? 'Submitting...' : 'Submit Claim'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
