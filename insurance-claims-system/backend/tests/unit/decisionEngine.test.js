// Mock database before requiring the module
const mockQuery = jest.fn();
jest.mock('../../src/config/database', () => ({
  query: mockQuery,
  pool: { query: mockQuery },
}));

// Mock auditLog
jest.mock('../../src/middleware/auditLog', () => ({
  logAudit: jest.fn(),
}));

// Mock cache
jest.mock('../../src/utils/cache', () => ({
  rulesCache: { get: jest.fn(() => null), set: jest.fn() },
}));

const { calculateFraudScore } = require('../../src/services/decisionEngine');

describe('Decision Engine', () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe('calculateFraudScore', () => {
    it('should return low score for low-risk claim', async () => {
      // Mock: claim frequency check - 0 recent claims
      mockQuery.mockResolvedValueOnce({ rows: [{ claim_count: '0' }] });

      const claimData = {
        claimant_id: 1,
        amount_claimed: 500,
      };
      const policyData = {
        coverage_limit: 50000,
        effective_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        premium: 500,
      };

      const result = await calculateFraudScore(claimData, policyData);

      expect(result).toBeDefined();
      expect(typeof result.totalScore).toBe('number');
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.indicators)).toBe(true);
    });

    it('should flag high frequency claims', async () => {
      // Mock: 4 recent claims
      mockQuery.mockResolvedValueOnce({ rows: [{ claim_count: '4' }] });

      const claimData = {
        claimant_id: 1,
        amount_claimed: 500,
      };
      const policyData = {
        coverage_limit: 50000,
        effective_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        premium: 500,
      };

      const result = await calculateFraudScore(claimData, policyData);

      expect(result.totalScore).toBeGreaterThan(0);
      const freqIndicator = result.indicators.find(i => i.indicator_type === 'claim_frequency');
      expect(freqIndicator).toBeDefined();
    });

    it('should flag high amount vs limit ratio', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ claim_count: '0' }] });

      const claimData = {
        claimant_id: 1,
        amount_claimed: 48000,
      };
      const policyData = {
        coverage_limit: 50000, // 96% ratio
        effective_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        premium: 500,
      };

      const result = await calculateFraudScore(claimData, policyData);

      expect(result.totalScore).toBeGreaterThan(0);
      const amountIndicator = result.indicators.find(i => i.indicator_type === 'amount_vs_limit');
      expect(amountIndicator).toBeDefined();
    });

    it('should flag new policies (< 90 days)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ claim_count: '0' }] });

      const claimData = {
        claimant_id: 1,
        amount_claimed: 500,
      };
      const policyData = {
        coverage_limit: 50000,
        effective_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        premium: 500,
      };

      const result = await calculateFraudScore(claimData, policyData);

      expect(result.totalScore).toBeGreaterThan(0);
      const ageIndicator = result.indicators.find(i => i.indicator_type === 'policy_age');
      expect(ageIndicator).toBeDefined();
    });

    it('should flag premium anomaly (claim >> premium)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ claim_count: '0' }] });

      const claimData = {
        claimant_id: 1,
        amount_claimed: 15000,
      };
      const policyData = {
        coverage_limit: 50000,
        effective_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        premium: 100, // claim/premium ratio = 150 > 10
      };

      const result = await calculateFraudScore(claimData, policyData);

      expect(result.totalScore).toBeGreaterThan(0);
      const anomalyIndicator = result.indicators.find(i => i.indicator_type === 'premium_anomaly');
      expect(anomalyIndicator).toBeDefined();
    });

    it('should cap score at 100', async () => {
      // Many risk factors at once
      mockQuery.mockResolvedValueOnce({ rows: [{ claim_count: '10' }] });

      const claimData = {
        claimant_id: 1,
        amount_claimed: 49000,
      };
      const policyData = {
        coverage_limit: 50000,
        effective_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        premium: 50,
      };

      const result = await calculateFraudScore(claimData, policyData);

      expect(result.totalScore).toBeLessThanOrEqual(100);
    });
  });
});
