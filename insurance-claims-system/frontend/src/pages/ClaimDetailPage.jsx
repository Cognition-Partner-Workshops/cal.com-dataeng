import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertTriangle, MessageSquare, FileText, History } from 'lucide-react';
import useStore from '../store/useStore';
import { claimsAPI } from '../utils/api';

const statusConfig = {
  filed: { color: 'bg-blue-100 text-blue-800', label: 'Filed' },
  under_review: { color: 'bg-yellow-100 text-yellow-800', label: 'Under Review' },
  investigation: { color: 'bg-orange-100 text-orange-800', label: 'Investigation' },
  approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
  denied: { color: 'bg-red-100 text-red-800', label: 'Denied' },
  paid: { color: 'bg-emerald-100 text-emerald-800', label: 'Paid' },
  closed: { color: 'bg-gray-100 text-gray-800', label: 'Closed' },
  appealed: { color: 'bg-purple-100 text-purple-800', label: 'Appealed' },
};

export default function ClaimDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, currentClaim, fetchClaim, decideClaim, assignClaim, claimsLoading } = useStore();
  const [activeTab, setActiveTab] = useState('details');
  const [notes, setNotes] = useState([]);
  const [history, setHistory] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [decisionForm, setDecisionForm] = useState({ decision: '', reason: '', amount_approved: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchClaim(id);
    loadNotes();
    loadHistory();
    loadDocuments();
  }, [id]);

  const loadNotes = async () => {
    try {
      const { data } = await claimsAPI.getNotes(id);
      setNotes(data);
    } catch (e) { /* ignore */ }
  };

  const loadHistory = async () => {
    try {
      const { data } = await claimsAPI.getHistory(id);
      setHistory(data);
    } catch (e) { /* ignore */ }
  };

  const loadDocuments = async () => {
    try {
      const { data } = await claimsAPI.getDocuments(id);
      setDocuments(data);
    } catch (e) { /* ignore */ }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await claimsAPI.addNote(id, { note_text: newNote, is_internal: isInternal });
      setNewNote('');
      setIsInternal(false);
      loadNotes();
      setSuccess('Note added successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add note');
    }
  };

  const handleDecision = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await decideClaim(id, {
        decision: decisionForm.decision,
        reason: decisionForm.reason,
        amount_approved: decisionForm.amount_approved ? parseFloat(decisionForm.amount_approved) : undefined,
      });
      setSuccess(`Claim ${decisionForm.decision}ed successfully`);
      setDecisionForm({ decision: '', reason: '', amount_approved: '' });
      loadHistory();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  if (claimsLoading || !currentClaim) {
    return <div className="flex items-center justify-center py-12" role="status"><span className="text-gray-500">Loading claim details...</span></div>;
  }

  const claim = currentClaim;
  const config = statusConfig[claim.status] || statusConfig.filed;
  const canDecide = (user.role === 'claims_adjuster' && claim.amount_claimed <= 10000) || user.role === 'claims_manager';
  const canAddInternalNotes = user.role !== 'policyholder';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{claim.claim_number}</h1>
            <p className="text-gray-600 text-sm capitalize">{claim.type?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge text-sm px-3 py-1 ${config.color}`}>{config.label}</span>
          {claim.fraud_score > 0 && (
            <span className={`badge text-sm px-3 py-1 ${parseFloat(claim.fraud_score) >= 50 ? 'bg-red-100 text-red-800' : parseFloat(claim.fraud_score) >= 25 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
              Fraud Score: {parseFloat(claim.fraud_score).toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm" role="alert" aria-live="polite">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm" role="status" aria-live="polite">{success}</div>}

      {/* Claim Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Claim Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Amount Claimed</span><span className="font-bold text-lg">${parseFloat(claim.amount_claimed).toLocaleString()}</span></div>
            {claim.amount_approved !== null && <div className="flex justify-between"><span className="text-gray-500">Amount Approved</span><span className="font-medium text-green-600">${parseFloat(claim.amount_approved || 0).toLocaleString()}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">Incident Date</span><span>{new Date(claim.incident_date).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Filed Date</span><span>{new Date(claim.filed_date).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Priority</span><span className="capitalize">{claim.priority}</span></div>
          </div>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Policy Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Policy #</span><span className="font-medium">{claim.policy_number}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="capitalize">{claim.policy_type}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Coverage</span><span>${parseFloat(claim.coverage_limit || 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Deductible</span><span>${parseFloat(claim.deductible || 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">State</span><span>{claim.policy_state}</span></div>
          </div>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">People</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Claimant</span><span>{claim.claimant_first_name} {claim.claimant_last_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Adjuster</span><span>{claim.adjuster_first_name ? `${claim.adjuster_first_name} ${claim.adjuster_last_name}` : 'Unassigned'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Manager</span><span>{claim.manager_first_name ? `${claim.manager_first_name} ${claim.manager_last_name}` : '-'}</span></div>
          </div>
        </div>
      </div>

      {/* Incident Description */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-600 mb-2">Incident Description</h3>
        <p className="text-sm text-gray-800">{claim.incident_description}</p>
        {claim.decision_reason && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-600">Decision Reason</p>
            <p className="text-sm text-gray-800">{claim.decision_reason}</p>
          </div>
        )}
      </div>

      {/* Fraud Indicators */}
      {claim.fraud_indicators?.length > 0 && (user.role !== 'policyholder') && (
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            Fraud Indicators
          </h3>
          <div className="space-y-2">
            {claim.fraud_indicators.map((fi, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium capitalize">{fi.indicator_type?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500">{fi.details ? JSON.stringify(fi.details) : ''}</p>
                </div>
                <span className="badge bg-red-100 text-red-800">{parseFloat(fi.score).toFixed(1)} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4" role="tablist">
          {[
            { id: 'details', label: 'Notes', icon: MessageSquare },
            { id: 'history', label: 'History', icon: History },
            { id: 'documents', label: 'Documents', icon: FileText },
            ...(canDecide && ['filed', 'under_review', 'investigation', 'appealed'].includes(claim.status) ? [{ id: 'decision', label: 'Make Decision', icon: CheckCircle }] : []),
          ].map((tab) => {
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

      {/* Notes Tab */}
      {activeTab === 'details' && (
        <div className="space-y-4" role="tabpanel">
          <form onSubmit={handleAddNote} className="card">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Add Note</h3>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="input-field mb-3"
              rows={3}
              placeholder="Enter your note..."
              aria-label="Note text"
            />
            <div className="flex items-center justify-between">
              {canAddInternalNotes && (
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="rounded" />
                  Internal note (not visible to policyholder)
                </label>
              )}
              <button type="submit" className="btn-primary text-sm">Add Note</button>
            </div>
          </form>
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className={`card ${note.is_internal ? 'border-l-4 border-l-yellow-400' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{note.first_name} {note.last_name}</span>
                    <span className="badge bg-gray-100 text-gray-600 text-xs capitalize">{note.role?.replace(/_/g, ' ')}</span>
                    {note.is_internal && <span className="badge bg-yellow-100 text-yellow-800 text-xs">Internal</span>}
                  </div>
                  <span className="text-xs text-gray-400">{new Date(note.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-700">{note.note_text}</p>
              </div>
            ))}
            {notes.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No notes yet</p>}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="card" role="tabpanel">
          <div className="space-y-4">
            {history.map((entry, idx) => (
              <div key={idx} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                <div className="w-3 h-3 rounded-full bg-primary-600 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {entry.from_status && <span className="badge bg-gray-100 text-gray-600">{entry.from_status?.replace(/_/g, ' ')}</span>}
                    {entry.from_status && <span className="text-gray-400">→</span>}
                    <span className={`badge ${statusConfig[entry.to_status]?.color || 'bg-gray-100 text-gray-800'}`}>{entry.to_status?.replace(/_/g, ' ')}</span>
                  </div>
                  {entry.reason && <p className="text-sm text-gray-600">{entry.reason}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {entry.first_name ? `${entry.first_name} ${entry.last_name}` : 'System'} — {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {history.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No history records</p>}
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="card" role="tabpanel">
          {documents.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No documents uploaded</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">{doc.file_name}</p>
                      <p className="text-xs text-gray-500">{doc.document_type} — uploaded by {doc.first_name} {doc.last_name}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Decision Tab */}
      {activeTab === 'decision' && canDecide && (
        <div className="card" role="tabpanel">
          <h3 className="text-lg font-semibold mb-4">Make Decision</h3>
          <form onSubmit={handleDecision} className="space-y-4">
            <div>
              <label htmlFor="decision" className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
              <select
                id="decision"
                value={decisionForm.decision}
                onChange={(e) => setDecisionForm({ ...decisionForm, decision: e.target.value })}
                className="input-field"
                required
                aria-required="true"
              >
                <option value="">Select decision...</option>
                <option value="approve">Approve</option>
                <option value="deny">Deny</option>
                {user.role === 'claims_adjuster' && <option value="refer_manager">Refer to Manager</option>}
                <option value="request_info">Request More Information</option>
              </select>
            </div>
            {decisionForm.decision === 'approve' && (
              <div>
                <label htmlFor="amount_approved" className="block text-sm font-medium text-gray-700 mb-1">Approved Amount</label>
                <input
                  id="amount_approved"
                  type="number"
                  step="0.01"
                  value={decisionForm.amount_approved}
                  onChange={(e) => setDecisionForm({ ...decisionForm, amount_approved: e.target.value })}
                  className="input-field"
                  placeholder={`Max: $${parseFloat(claim.amount_claimed).toLocaleString()}`}
                />
              </div>
            )}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea
                id="reason"
                value={decisionForm.reason}
                onChange={(e) => setDecisionForm({ ...decisionForm, reason: e.target.value })}
                className="input-field"
                rows={3}
                required
                aria-required="true"
                placeholder="Provide detailed reason for your decision..."
              />
            </div>
            <button type="submit" className={decisionForm.decision === 'deny' ? 'btn-danger' : 'btn-primary'}>
              Submit Decision
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
