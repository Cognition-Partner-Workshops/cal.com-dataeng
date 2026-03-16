// Mock the database query function
const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
jest.mock('../../src/config/database', () => ({
  query: mockQuery,
  pool: { query: mockQuery },
}));

const { logAudit } = require('../../src/middleware/auditLog');

describe('Audit Log', () => {
  beforeEach(() => {
    mockQuery.mockClear();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('should log audit entry with all fields', async () => {
    await logAudit(
      1,              // userId
      'UPDATE_CLAIM', // action
      'claim',        // entityType
      42,             // entityId
      { status: 'filed' },    // oldValues
      { status: 'approved' }, // newValues
      '127.0.0.1',   // ipAddress
      'req-123'       // requestId
    );

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const call = mockQuery.mock.calls[0];
    expect(call[0]).toContain('INSERT INTO audit_log');
    expect(call[1]).toContain(1); // userId
    expect(call[1]).toContain('UPDATE_CLAIM');
    expect(call[1]).toContain('claim');
    expect(call[1]).toContain(42);
  });

  it('should handle missing optional fields', async () => {
    await logAudit(
      1,            // userId
      'VIEW_CLAIM', // action
      'claim',      // entityType
      42            // entityId
    );

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const call = mockQuery.mock.calls[0];
    // ipAddress and requestId should be null
    expect(call[1]).toContain(null);
  });

  it('should handle database errors gracefully', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    // Should not throw - logAudit catches errors internally
    await expect(
      logAudit(1, 'TEST', 'test', 1, null, null, null, null)
    ).resolves.not.toThrow();
  });

  it('should stringify old and new values as JSON', async () => {
    const oldValues = { status: 'filed', amount: 1000 };
    const newValues = { status: 'approved', amount: 950 };

    await logAudit(1, 'UPDATE', 'claim', 42, oldValues, newValues, '10.0.0.1', 'req-456');

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const call = mockQuery.mock.calls[0];
    expect(call[1]).toContain(JSON.stringify(oldValues));
    expect(call[1]).toContain(JSON.stringify(newValues));
  });
});
