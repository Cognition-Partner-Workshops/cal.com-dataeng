const { InMemoryCache } = require('../../src/utils/cache');

describe('InMemoryCache', () => {
  let cache;

  beforeEach(() => {
    cache = new InMemoryCache(1000); // 1 second TTL for testing
  });

  afterEach(() => {
    if (cache) {
      cache.destroy();
    }
  });

  it('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return null for missing keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should delete values', () => {
    cache.set('key1', 'value1');
    cache.delete('key1');
    expect(cache.get('key1')).toBeNull();
  });

  it('should clear all values', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  it('should handle complex objects', () => {
    const obj = { name: 'test', nested: { value: 42 } };
    cache.set('obj', obj);
    expect(cache.get('obj')).toEqual(obj);
  });

  it('should handle arrays', () => {
    const arr = [1, 2, 3, { nested: true }];
    cache.set('arr', arr);
    expect(cache.get('arr')).toEqual(arr);
  });

  it('should expire entries after TTL', async () => {
    cache.set('expiring', 'value');
    expect(cache.get('expiring')).toBe('value');
    await new Promise(resolve => setTimeout(resolve, 1200));
    expect(cache.get('expiring')).toBeNull();
  });

  it('should overwrite existing values', () => {
    cache.set('key', 'original');
    cache.set('key', 'updated');
    expect(cache.get('key')).toBe('updated');
  });
});
