import { buildExtractionPrompt, buildCategorizationPrompt } from '../../src/engines/slmPrompts';

describe('slmPrompts', () => {
  describe('buildExtractionPrompt', () => {
    it('should format ChatML prompt with truncated SMS', () => {
      const sms = 'Rs 500 debited from A/c XX1234 on 31-Jul-26 to ZOMATO';
      const prompt = buildExtractionPrompt(sms);

      expect(prompt).toContain('<|im_start|>system');
      expect(prompt).toContain('<|im_start|>user');
      expect(prompt).toContain('<|im_start|>assistant');
      expect(prompt).toContain(sms);
      expect(prompt).toContain('FOOD, GROCERIES, TRANSPORTATION');
    });

    it('should truncate SMS longer than 500 chars', () => {
      const longSms = 'A'.repeat(600);
      const prompt = buildExtractionPrompt(longSms);

      expect(prompt).toContain('A'.repeat(500));
      expect(prompt).not.toContain('A'.repeat(501));
    });
  });

  describe('buildCategorizationPrompt', () => {
    it('should format ChatML prompt for merchant categorization', () => {
      const prompt = buildCategorizationPrompt('STARBUCKS');

      expect(prompt).toContain('Merchant: "STARBUCKS"');
      expect(prompt).toContain('Respond with ONLY the category name in uppercase');
    });
  });
});
