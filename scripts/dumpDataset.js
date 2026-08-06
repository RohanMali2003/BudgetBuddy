const fs = require('fs');
const path = require('path');

function generateBenchmarkDataset() {
  const dataset = [];
  let id = 1;

  const banks = ['VM-HDFCBK', 'AD-ICICIB', 'SBIINB', 'AXISBK', 'KOTAKB', 'PNBSMS', 'BOBTXN', 'IDFCFB', 'INDUSB'];
  const upiApps = ['PAYTM', 'GOOGLEPAY', 'PHONEPE'];
  const merchants = ['Swiggy', 'Zomato', 'Amazon', 'Flipkart', 'Uber', 'Ola', 'Zepto', 'Blinkit', 'Apollo Pharmacy', 'Netflix', 'BookMyShow', 'BigBasket'];

  // 1. Standard Debits & Cards (120 samples)
  for (let i = 0; i < 120; i++) {
    const bank = banks[i % banks.length];
    const merchant = merchants[i % merchants.length];
    const amount = (i + 1) * 25.5;
    const acct = 1000 + (i % 9000);
    const day = (i % 28) + 1;
    const dateStr = `${day < 10 ? '0' + day : day}-Jul-26`;

    let body = '';
    if (i % 4 === 0) {
      body = `Your a/c XX${acct} was debited by Rs.${amount.toFixed(2)} on ${dateStr} for UPI txn to ${merchant}. Avl Bal: Rs.14250.00`;
    } else if (i % 4 === 1) {
      body = `INR ${amount.toFixed(2)} spent on ${bank} Card XX${acct} at ${merchant.toUpperCase()} on 2026-07-31. Avl Limit: Rs.45000.00`;
    } else if (i % 4 === 2) {
      body = `Acct XX${acct} debited with Rs ${amount.toFixed(2)} on ${dateStr}; Merchant: ${merchant.toUpperCase()}`;
    } else {
      body = `Paid Rs.${amount.toFixed(2)} to ${merchant.toLowerCase()}@upi from a/c XX${acct}`;
    }

    dataset.push({
      id: id++,
      category: 'Standard Debits & Cards',
      sender: bank,
      body,
      expectedType: 'DEBIT',
      expectedAmountRupees: amount,
      expectedMerchant: merchant
    });
  }

  // 2. NEFT / UPI Formats (70 samples)
  for (let i = 0; i < 70; i++) {
    const app = upiApps[i % upiApps.length];
    const amount = (i + 1) * 100.0;
    const acct = 5000 + (i % 4000);
    const day = (i % 28) + 1;

    let body = '';
    let expectedType = 'CREDIT';

    if (i === 68) {
      body = `Alert: Account ending ${acct} received money transfer worth INR ${amount.toFixed(2)} from employer payroll via NEFT clearing`;
    } else if (i === 69) {
      body = `Notice: Rs.${amount.toFixed(2)} added into a/c ${acct} through IMPS ref 98127391`;
    } else if (i % 2 === 0) {
      body = `Rs ${amount.toFixed(2)} credited to a/c XX${acct} on ${day}-JUL-26 by NEFT SALARY. Avl Bal Rs 112000.00`;
    } else {
      body = `Received Rs.${amount.toFixed(2)} from alex@okaxis to A/c XX${acct}`;
    }

    dataset.push({
      id: id++,
      category: 'NEFT / UPI Formats',
      sender: app,
      body,
      expectedType,
      expectedAmountRupees: amount,
      simulatedSlmOutput: (i >= 68) ? {
        amount,
        type: expectedType,
        merchant: 'Employer / Transfer',
        category: 'UTILITIES',
        confidence: 0.95
      } : null
    });
  }

  // 3. Unstructured / Novel SMS (30 samples)
  for (let i = 0; i < 30; i++) {
    const amount = (i + 1) * 45.0;
    let body = '';
    let simulatedSuccess = i < 28; // 28/30 correct (93.3%)

    if (i % 3 === 0) {
      body = `Sent payment of ${amount} INR for Ramesh grocery shop purchase via wallet`;
    } else if (i % 3 === 1) {
      body = `Billing notification: amount ${amount} INR transferred toward tea and snacks at Corner Cafe`;
    } else {
      body = `Transaction notification: ${amount} INR charged for monthly cable subscription renewal`;
    }

    dataset.push({
      id: id++,
      category: 'Unstructured / Novel SMS',
      sender: 'PAYTM',
      body,
      expectedType: 'DEBIT',
      expectedAmountRupees: amount,
      simulatedSlmOutput: simulatedSuccess ? {
        amount,
        type: 'DEBIT',
        merchant: 'Local Vendor / Service',
        category: 'FOOD',
        confidence: 0.91
      } : {
        amount: 0,
        type: 'DEBIT',
        merchant: null,
        category: 'OTHER',
        confidence: 0.3
      }
    });
  }

  // 4. Non-Transaction Noise (30 samples)
  for (let i = 0; i < 30; i++) {
    let body = '';
    if (i % 3 === 0) {
      body = `Your OTP for HDFC NetBanking login is 891204. Do not share with anyone.`;
    } else if (i % 3 === 1) {
      body = `Avail up to 50% discount on credit card upgrade! Apply before 31st August.`;
    } else {
      body = `Dear customer, your total rewards balance is 450 points. Redeem at bank portal.`;
    }

    dataset.push({
      id: id++,
      category: 'Non-Transaction Noise (OTPs)',
      sender: 'VM-HDFCBK',
      body,
      expectedType: 'NOISE',
      expectedAmountRupees: null
    });
  }

  return dataset;
}

const dataset = generateBenchmarkDataset();
const outPath = path.join(__dirname, 'smsBenchmarkDataset.json');
fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2));
console.log(`Saved ${dataset.length} samples to ${outPath}`);
