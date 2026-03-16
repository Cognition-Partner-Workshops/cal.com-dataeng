const { CircuitBreaker } = require('../../src/utils/circuitBreaker');

describe('CircuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 500 });
  });

  it('should start in CLOSED state', () => {
    expect(breaker.state).toBe('CLOSED');
  });

  it('should execute successful calls', async () => {
    const result = await breaker.execute(() => Promise.resolve('success'));
    expect(result).toBe('success');
  });

  it('should track failures', async () => {
    try {
      await breaker.execute(() => Promise.reject(new Error('fail')));
    } catch (e) {
      expect(e.message).toBe('fail');
    }
    expect(breaker.failureCount).toBe(1);
  });

  it('should open after threshold failures', async () => {
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch (e) { /* expected */ }
    }
    expect(breaker.state).toBe('OPEN');
  });

  it('should reject calls when OPEN', async () => {
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch (e) { /* expected */ }
    }
    await expect(breaker.execute(() => Promise.resolve('ok'))).rejects.toThrow('Circuit breaker is OPEN');
  });

  it('should transition to HALF_OPEN after reset timeout via execute', async () => {
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch (e) { /* expected */ }
    }
    expect(breaker.state).toBe('OPEN');
    await new Promise(resolve => setTimeout(resolve, 600));
    // State transitions to HALF_OPEN when execute is called after timeout
    const result = await breaker.execute(() => Promise.resolve('probe'));
    expect(result).toBe('probe');
    // After one success in HALF_OPEN, failureCount resets but needs 3 successes to close
  });

  it('should close after enough successful calls in HALF_OPEN', async () => {
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch (e) { /* expected */ }
    }
    await new Promise(resolve => setTimeout(resolve, 600));
    // Need 3 successes in HALF_OPEN to close
    await breaker.execute(() => Promise.resolve('ok1'));
    await breaker.execute(() => Promise.resolve('ok2'));
    await breaker.execute(() => Promise.resolve('ok3'));
    expect(breaker.state).toBe('CLOSED');
    expect(breaker.failureCount).toBe(0);
  });

  it('should reopen after failure in HALF_OPEN', async () => {
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch (e) { /* expected */ }
    }
    await new Promise(resolve => setTimeout(resolve, 600));
    try {
      await breaker.execute(() => Promise.reject(new Error('still failing')));
    } catch (e) { /* expected */ }
    expect(breaker.state).toBe('OPEN');
  });

  it('should reset failure count on success', async () => {
    try {
      await breaker.execute(() => Promise.reject(new Error('fail')));
    } catch (e) { /* expected */ }
    expect(breaker.failureCount).toBe(1);
    await breaker.execute(() => Promise.resolve('ok'));
    expect(breaker.failureCount).toBe(0);
  });
});
