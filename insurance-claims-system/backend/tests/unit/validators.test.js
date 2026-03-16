const { loginSchema, registerSchema, createClaimSchema, updateClaimSchema, claimDecisionSchema, createPolicySchema, createRuleSchema, paginationSchema } = require('../../src/utils/validators');

describe('Validators', () => {
  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const result = loginSchema.safeParse({ email: 'test@example.com', password: 'password123' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = loginSchema.safeParse({ email: 'not-email', password: 'password123' });
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({ email: 'test@example.com', password: '' });
      expect(result.success).toBe(false);
    });

    it('should reject missing fields', () => {
      const result = loginSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    const validRegister = {
      email: 'new@safeguard.com',
      password: 'StrongPass#123!Ab',
      first_name: 'John',
      last_name: 'Doe',
      role: 'policyholder',
    };

    it('should validate valid registration data', () => {
      const result = registerSchema.safeParse(validRegister);
      expect(result.success).toBe(true);
    });

    it('should reject weak password', () => {
      const result = registerSchema.safeParse({ ...validRegister, password: 'weak' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const result = registerSchema.safeParse({ ...validRegister, role: 'superadmin' });
      expect(result.success).toBe(false);
    });

    it('should accept all valid roles', () => {
      const roles = ['policyholder', 'claims_adjuster', 'claims_manager', 'compliance_officer', 'executive'];
      roles.forEach(role => {
        const result = registerSchema.safeParse({ ...validRegister, role });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('createClaimSchema', () => {
    const validClaim = {
      policy_id: 1,
      type: 'auto_collision',
      amount_claimed: 5000,
      incident_date: '2024-01-15',
      incident_description: 'Car accident at intersection',
    };

    it('should validate valid claim data', () => {
      const result = createClaimSchema.safeParse(validClaim);
      expect(result.success).toBe(true);
    });

    it('should reject negative amount', () => {
      const result = createClaimSchema.safeParse({ ...validClaim, amount_claimed: -100 });
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const result = createClaimSchema.safeParse({ policy_id: 1 });
      expect(result.success).toBe(false);
    });

    it('should accept all valid claim types', () => {
      const types = ['auto_collision', 'auto_theft', 'home_damage', 'home_theft', 'health_medical', 'health_prescription', 'life_death', 'life_disability'];
      types.forEach(type => {
        const result = createClaimSchema.safeParse({ ...validClaim, type });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('claimDecisionSchema', () => {
    it('should validate approve decision', () => {
      const result = claimDecisionSchema.safeParse({ decision: 'approve', reason: 'Valid claim', amount_approved: 5000 });
      expect(result.success).toBe(true);
    });

    it('should validate deny decision', () => {
      const result = claimDecisionSchema.safeParse({ decision: 'deny', reason: 'Insufficient evidence' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid decision type', () => {
      const result = claimDecisionSchema.safeParse({ decision: 'maybe', reason: 'test' });
      expect(result.success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    it('should validate valid pagination', () => {
      const result = paginationSchema.safeParse({ page: '1', limit: '20' });
      expect(result.success).toBe(true);
    });

    it('should use defaults for empty input', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});
