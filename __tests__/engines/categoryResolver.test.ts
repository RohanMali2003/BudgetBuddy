import { resolveCategory } from '../../src/engines/categoryResolver';
import { getCachedMerchantCategory, cacheMerchantCategory } from '../../src/db/categoryRepo';
import { slmEngine } from '../../src/engines/slmEngine';

jest.mock('../../src/db/categoryRepo', () => ({
  getCachedMerchantCategory: jest.fn(),
  cacheMerchantCategory: jest.fn(),
}));

jest.mock('../../src/engines/slmEngine', () => ({
  slmEngine: {
    isModelAvailable: jest.fn(),
    acquire: jest.fn(),
    release: jest.fn(),
    complete: jest.fn(),
  },
}));

describe('categoryResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should resolve known hardcoded merchants directly', async () => {
    expect(await resolveCategory('SWIGGY')).toBe('FOOD');
    expect(await resolveCategory('ZOMATO RESTAURANT')).toBe('FOOD');
    expect(await resolveCategory('UBER TRIP')).toBe('TRANSPORTATION');
    expect(await resolveCategory('BLINKIT BLINKIT')).toBe('GROCERIES');
    expect(await resolveCategory('ATM CASH')).toBe('ATM');
  });

  it('should check SQLite cache if not in hardcoded list', async () => {
    (getCachedMerchantCategory as jest.Mock).mockReturnValue('SHOPPING');

    const result = await resolveCategory('RANDOM_LOCAL_STORE');
    expect(result).toBe('SHOPPING');
    expect(getCachedMerchantCategory).toHaveBeenCalledWith('RANDOM_LOCAL_STORE');
  });

  it('should fall back to OTHER if model is unavailable and not cached', async () => {
    (getCachedMerchantCategory as jest.Mock).mockReturnValue(null);
    (slmEngine.isModelAvailable as jest.Mock).mockReturnValue(false);

    const result = await resolveCategory('UNKNOWN_SHOP');
    expect(result).toBe('OTHER');
  });

  it('should use SLM inference if available and cache result', async () => {
    (getCachedMerchantCategory as jest.Mock).mockReturnValue(null);
    (slmEngine.isModelAvailable as jest.Mock).mockReturnValue(true);
    (slmEngine.complete as jest.Mock).mockResolvedValue('SHOPPING');

    const result = await resolveCategory('NEW_FASHION_BOUTIQUE');

    expect(result).toBe('SHOPPING');
    expect(slmEngine.acquire).toHaveBeenCalled();
    expect(slmEngine.release).toHaveBeenCalled();
    expect(cacheMerchantCategory).toHaveBeenCalledWith('NEW_FASHION_BOUTIQUE', 'SHOPPING');
  });
});
