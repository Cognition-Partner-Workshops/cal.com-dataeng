const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*]/, 'Password must contain at least one special character'),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  role: z.enum(['policyholder', 'claims_adjuster', 'claims_manager', 'compliance_officer', 'executive']),
  branch: z.string().max(100).optional(),
});

const createClaimSchema = z.object({
  policy_id: z.number().int().positive('Policy ID is required'),
  type: z.enum(['auto_collision', 'auto_theft', 'home_damage', 'home_theft', 'health_medical', 'health_prescription', 'life_death', 'life_disability']),
  amount_claimed: z.number().positive('Claim amount must be positive'),
  incident_date: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date <= new Date();
  }, 'Incident date must be a valid past date'),
  incident_description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
});

const updateClaimSchema = z.object({
  status: z.enum(['filed', 'under_review', 'investigation', 'approved', 'denied', 'paid', 'closed', 'appealed']).optional(),
  amount_approved: z.number().min(0).optional(),
  adjuster_id: z.number().int().positive().optional(),
  manager_id: z.number().int().positive().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  decision_reason: z.string().max(2000).optional(),
});

const claimDecisionSchema = z.object({
  decision: z.enum(['approve', 'deny', 'refer_manager', 'request_info']),
  amount_approved: z.number().min(0).optional(),
  reason: z.string().min(5, 'Decision reason is required').max(2000),
});

const assignClaimSchema = z.object({
  adjuster_id: z.number().int().positive('Adjuster ID is required'),
});

const createNoteSchema = z.object({
  note_text: z.string().min(1, 'Note text is required').max(5000),
  is_internal: z.boolean().optional().default(false),
});

const createPolicySchema = z.object({
  policy_number: z.string().min(1, 'Policy number is required'),
  policyholder_id: z.number().int().positive(),
  type: z.enum(['auto', 'home', 'health', 'life']),
  premium: z.number().positive(),
  coverage_limit: z.number().positive(),
  deductible: z.number().min(0).default(0),
  effective_date: z.string(),
  expiration_date: z.string(),
  state: z.enum(['TX', 'CA', 'NY']),
});

const createRuleSchema = z.object({
  rule_name: z.string().min(1, 'Rule name is required').max(200),
  rule_type: z.enum(['auto_approve', 'auto_deny', 'refer_adjuster', 'refer_manager', 'fraud_check']),
  conditions: z.record(z.any()),
  action: z.string().min(1).max(100),
  priority: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  state: z.enum(['TX', 'CA', 'NY']).nullable().optional(),
});

const updateRuleSchema = z.object({
  rule_name: z.string().min(1).max(200).optional(),
  conditions: z.record(z.any()).optional(),
  action: z.string().min(1).max(100).optional(),
  priority: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

const createFlagSchema = z.object({
  claim_id: z.number().int().positive(),
  flag_type: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
}

module.exports = {
  loginSchema,
  registerSchema,
  createClaimSchema,
  updateClaimSchema,
  claimDecisionSchema,
  assignClaimSchema,
  createNoteSchema,
  createPolicySchema,
  createRuleSchema,
  updateRuleSchema,
  createFlagSchema,
  paginationSchema,
  validate,
  validateQuery,
};
