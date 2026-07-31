import { slmEngine, parseSlmOutput } from '../../src/engines/slmEngine';

jest.mock('llama.rn', () => ({
  initLlama: jest.fn(),
}));

describe('slmEngine', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('parseSlmOutput', () => {
    it('should parse valid JSON SLM response into paise', () => {
      const raw = '```json\n{"amount": 540.50, "type": "DEBIT", "merchant": "ZOMATO", "category": "FOOD", "confidence": 0.95}\n```';
      const parsed = parseSlmOutput(raw);

      expect(parsed).toEqual({
        amount: 54050,
        type: 'DEBIT',
        merchantOrVpa: 'ZOMATO',
        category: 'FOOD',
        confidence: 0.95,
      });
    });

    it('should fallback category to OTHER if invalid', () => {
      const raw = '{"amount": 100, "type": "CREDIT", "merchant": "TEST", "category": "INVALID_CAT", "confidence": 0.8}';
      const parsed = parseSlmOutput(raw);

      expect(parsed?.category).toBe('OTHER');
    });

    it('should return null for malformed output or non-positive amount', () => {
      expect(parseSlmOutput('No json here')).toBeNull();
      expect(parseSlmOutput('{"amount": -10, "type": "DEBIT"}')).toBeNull();
      expect(parseSlmOutput('{"amount": 100, "type": "INVALID"}')).toBeNull();
    });
  });

  describe('lifecycle management', () => {
    it('should track model path and loaded state', () => {
      expect(slmEngine.isLoaded()).toBe(false);
      expect(slmEngine.isModelAvailable()).toBe(true);

      slmEngine.setModelPath('');
      expect(slmEngine.isModelAvailable()).toBe(false);

      slmEngine.setModelPath('/path/to/model.gguf');
      expect(slmEngine.getModelPath()).toBe('/path/to/model.gguf');
      expect(slmEngine.isModelAvailable()).toBe(true);
    });
  });
});
