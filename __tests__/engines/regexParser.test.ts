import { parseWithRegex } from '../../src/engines/regexParser';

describe('Engine A: Regex Parser', () => {
  // ---------- DEBIT TESTS ----------

  test('HDFC standard debit', () => {
    const sms = 'Your a/c XX1234 debited by Rs.500.00 on 30-Jul-26. UPI Ref:412345678901. Available Bal:Rs.12,345.67';
    const result = parseWithRegex(sms);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50000);  // 500.00 * 100
    expect(result!.type).toBe('DEBIT');
    expect(result!.accountTail).toBe('1234');
    expect(result!.balance).toBe(1234567);  // 12345.67 * 100
  });

  test('Card spend at merchant', () => {
    const sms = 'INR 200.00 spent on HDFC Bank Card XX9012 at AMAZON on 2026-07-30';
    const result = parseWithRegex(sms);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(20000);
    expect(result!.type).toBe('DEBIT');
    expect(result!.merchantOrVpa).toContain('AMAZON');
  });

  test('SBI debit with merchant', () => {
    const sms = 'Dear Customer, Your A/c X1234 is debited for Rs.350.00 on 30Jul26 trf to JOHN-UPI';
    const result = parseWithRegex(sms);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(35000);
    expect(result!.type).toBe('DEBIT');
  });

  test('ICICI debit with merchant field', () => {
    const sms = 'Acct XX1234 debited with Rs 750 on 30-Jul-26; Merchant: SWIGGY';
    const result = parseWithRegex(sms);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(75000);
    expect(result!.type).toBe('DEBIT');
    expect(result!.merchantOrVpa).toContain('SWIGGY');
  });

  test('Paid to UPI ID', () => {
    const sms = 'Paid Rs.150.00 to merchant@upi from A/c XX1234';
    const result = parseWithRegex(sms);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(15000);
    expect(result!.type).toBe('DEBIT');
    expect(result!.merchantOrVpa).toContain('merchant@upi');
  });

  test('ATM withdrawal', () => {
    const sms = 'ATM withdrawal Rs.2000 from a/c XX5678 on 30-Jul-26. Avl Bal Rs.8,500.00';
    const result = parseWithRegex(sms);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(200000);
    expect(result!.type).toBe('DEBIT');
  });

  test('Amount with commas', () => {
    const sms = 'Your a/c XX9999 debited by Rs.1,25,000.50 on 15-Jan-26';
    const result = parseWithRegex(sms);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(12500050);  // 1,25,000.50 in paise
  });

  // ---------- CREDIT TESTS ----------

  test('NEFT credit', () => {
    const sms = 'Rs 1,500.00 credited to a/c XX5678 on 30-JUL-26 by NEFT';
    const result = parseWithRegex(sms);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(150000);
    expect(result!.type).toBe('CREDIT');
  });

  test('UPI received', () => {
    const sms = 'Received Rs.500.00 from name@okaxis to A/c XX5678';
    const result = parseWithRegex(sms);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50000);
    expect(result!.type).toBe('CREDIT');
    expect(result!.merchantOrVpa).toContain('name@okaxis');
  });

  test('Account credited', () => {
    const sms = 'Your account XX1234 has been credited by Rs.25000.00';
    const result = parseWithRegex(sms);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(2500000);
    expect(result!.type).toBe('CREDIT');
  });

  test('ICICI credit with date', () => {
    const sms = 'ICICI Bank Acct XX4321 credited Rs.5000.00 on 30-Jul-2026';
    const result = parseWithRegex(sms);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500000);
    expect(result!.type).toBe('CREDIT');
  });

  // ---------- NON-TRANSACTION TESTS (should return null) ----------

  test('OTP message returns null', () => {
    const sms = 'Your OTP for transaction is 123456. Valid for 5 mins. Do not share.';
    const result = parseWithRegex(sms);
    expect(result).toBeNull();
  });

  test('Personal text returns null', () => {
    const sms = 'Hey, are you coming to the party tonight?';
    const result = parseWithRegex(sms);
    expect(result).toBeNull();
  });

  test('Promotional SMS returns null', () => {
    const sms = 'SALE! Get 50% off on all items. Use code SAVE50. Shop now at example.com';
    const result = parseWithRegex(sms);
    expect(result).toBeNull();
  });

  // ---------- EDGE CASES ----------

  test('Amount without decimal', () => {
    const sms = 'Your a/c XX1234 debited by Rs.500 on 30-Jul-26';
    const result = parseWithRegex(sms);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50000);
  });

  test('Amount with INR prefix', () => {
    const sms = 'INR 1500 debited from a/c XX7890';
    const result = parseWithRegex(sms);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(150000);
  });

  test('Balance extraction', () => {
    const sms = 'Your a/c XX1234 debited by Rs.100.00. Available Bal: Rs.5,000.00';
    const result = parseWithRegex(sms);
    expect(result).not.toBeNull();
    expect(result!.balance).toBe(500000);
  });
});
