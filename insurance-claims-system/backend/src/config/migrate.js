const { pool } = require('./database');
require('dotenv').config();

const migration = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('policyholder', 'claims_adjuster', 'claims_manager', 'compliance_officer', 'executive')),
  branch VARCHAR(100) DEFAULT 'Main',
  is_active BOOLEAN DEFAULT true,
  locked_until TIMESTAMP,
  login_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policies table
CREATE TABLE IF NOT EXISTS policies (
  id SERIAL PRIMARY KEY,
  policy_number VARCHAR(50) UNIQUE NOT NULL,
  policyholder_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('auto', 'home', 'health', 'life')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  premium DECIMAL(12,2) NOT NULL,
  coverage_limit DECIMAL(12,2) NOT NULL,
  deductible DECIMAL(12,2) NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  state VARCHAR(2) NOT NULL CHECK (state IN ('TX', 'CA', 'NY')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claims table
CREATE TABLE IF NOT EXISTS claims (
  id SERIAL PRIMARY KEY,
  claim_number VARCHAR(50) UNIQUE NOT NULL,
  policy_id INTEGER REFERENCES policies(id) ON DELETE CASCADE,
  claimant_id INTEGER REFERENCES users(id),
  adjuster_id INTEGER REFERENCES users(id),
  manager_id INTEGER REFERENCES users(id),
  type VARCHAR(50) NOT NULL CHECK (type IN ('auto_collision', 'auto_theft', 'home_damage', 'home_theft', 'health_medical', 'health_prescription', 'life_death', 'life_disability')),
  status VARCHAR(50) NOT NULL DEFAULT 'filed' CHECK (status IN ('filed', 'under_review', 'investigation', 'approved', 'denied', 'paid', 'closed', 'appealed')),
  amount_claimed DECIMAL(12,2) NOT NULL,
  amount_approved DECIMAL(12,2),
  incident_date DATE NOT NULL,
  incident_description TEXT NOT NULL,
  filed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  decision_date TIMESTAMP,
  decision_reason TEXT,
  fraud_score DECIMAL(5,2) DEFAULT 0,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claim documents table
CREATE TABLE IF NOT EXISTS claim_documents (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER REFERENCES claims(id) ON DELETE CASCADE,
  uploaded_by INTEGER REFERENCES users(id),
  document_type VARCHAR(100) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claim notes table
CREATE TABLE IF NOT EXISTS claim_notes (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER REFERENCES claims(id) ON DELETE CASCADE,
  author_id INTEGER REFERENCES users(id),
  note_text TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claim status history table (audit trail)
CREATE TABLE IF NOT EXISTS claim_status_history (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER REFERENCES claims(id) ON DELETE CASCADE,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Decision rules table (configurable business rules)
CREATE TABLE IF NOT EXISTS decision_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(200) NOT NULL,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('auto_approve', 'auto_deny', 'refer_adjuster', 'refer_manager', 'fraud_check')),
  conditions JSONB NOT NULL,
  action VARCHAR(100) NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  state VARCHAR(2) CHECK (state IN ('TX', 'CA', 'NY', NULL)),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compliance flags table
CREATE TABLE IF NOT EXISTS compliance_flags (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER REFERENCES claims(id) ON DELETE CASCADE,
  flag_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved BOOLEAN DEFAULT false,
  resolved_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(200) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  request_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fraud indicators table
CREATE TABLE IF NOT EXISTS fraud_indicators (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER REFERENCES claims(id) ON DELETE CASCADE,
  indicator_type VARCHAR(100) NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER REFERENCES claims(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'check',
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'completed', 'failed')),
  reference_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token blacklist table
CREATE TABLE IF NOT EXISTS token_blacklist (
  id SERIAL PRIMARY KEY,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_claimant ON claims(claimant_id);
CREATE INDEX IF NOT EXISTS idx_claims_adjuster ON claims(adjuster_id);
CREATE INDEX IF NOT EXISTS idx_claims_policy ON claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_filed_date ON claims(filed_date);
CREATE INDEX IF NOT EXISTS idx_policies_policyholder ON policies(policyholder_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_compliance_flags_claim ON compliance_flags(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_status_history_claim ON claim_status_history(claim_id);
CREATE INDEX IF NOT EXISTS idx_fraud_indicators_claim ON fraud_indicators(claim_id);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash ON token_blacklist(token_hash);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);
`;

async function migrate() {
  try {
    console.log('Running database migrations...');
    await pool.query(migration);
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate().catch(() => process.exit(1));
}

module.exports = { migrate, migration };
