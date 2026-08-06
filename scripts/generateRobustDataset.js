const fs = require('fs');
const path = require('path');

function generateRobustDataset() {
  const dataset = [];
  let id = 1;

  const banks = ['VM-HDFCBK', 'AD-ICICIB', 'SBIINB', 'AXISBK', 'KOTAKB', 'PNBSMS', 'BOBTXN', 'IDFCFB', 'INDUSB', 'CANBNK', 'YESBNK', 'UNIONB'];
  const upiApps = ['PAYTM', 'GOOGLEPAY', 'PHONEPE', 'CRED', 'AMAZONPAY', 'BHIMUPI'];
  const merchants = ['Swiggy', 'Zomato', 'Amazon India', 'Flipkart', 'Uber India', 'Ola Cabs', 'Zepto Quick', 'Blinkit Commerce', 'Apollo Pharmacy', 'Netflix Services', 'BookMyShow', 'BigBasket Grocery', 'RelDigital', 'Decathlon', 'DMart Store', 'Starbucks Coffee'];

  // -------------------------------------------------------------
  // 1. Standard Debits & Cards (120 samples)
  // -------------------------------------------------------------
  for (let i = 0; i < 120; i++) {
    const bank = banks[i % banks.length];
    const merchant = merchants[i % merchants.length];
    const amount = (i + 1) * 37.75;
    const acct = 1000 + ((i * 37) % 8999);
    const day = (i % 28) + 1;
    const dateStr = `${day < 10 ? '0' + day : day}-Aug-26`;

    let body = '';
    const variant = i % 6;
    if (variant === 0) {
      body = `Your a/c XX${acct} was debited by Rs.${amount.toFixed(2)} on ${dateStr} for UPI txn to ${merchant}. Avl Bal: Rs.${(15000 + i * 100).toFixed(2)}`;
    } else if (variant === 1) {
      body = `INR ${amount.toFixed(2)} spent on ${bank} Card XX${acct} at ${merchant.toUpperCase()} on 2026-08-${day < 10 ? '0' + day : day}. Avl Limit: Rs.50000.00`;
    } else if (variant === 2) {
      body = `Acct XX${acct} debited with Rs ${amount.toFixed(2)} on ${dateStr}; Merchant: ${merchant}`;
    } else if (variant === 3) {
      body = `Paid Rs.${amount.toFixed(2)} to ${merchant.toLowerCase().replace(/\s+/g, '')}@upi from a/c XX${acct}`;
    } else if (variant === 4) {
      body = `Dear Customer, Rs.${amount.toFixed(2)} debited from a/c XX${acct} on ${dateStr} info: UPI/${merchant}/Ref901283.`;
    } else {
      body = `ATM cash withdrawal of Rs.${amount.toFixed(2)} from a/c XX${acct} at HDFC ATM Pune branch on ${dateStr}.`;
    }

    dataset.push({
      id: id++,
      category: 'Standard Debits & Cards',
      sender: bank,
      body,
      expectedType: 'DEBIT',
      expectedAmountRupees: Math.round(amount * 100) / 100,
      expectedMerchant: merchant
    });
  }

  // -------------------------------------------------------------
  // 2. NEFT / UPI Formats (70 samples)
  // -------------------------------------------------------------
  for (let i = 0; i < 70; i++) {
    const app = upiApps[i % upiApps.length];
    const amount = (i + 1) * 145.50;
    const acct = 5000 + ((i * 29) % 4999);
    const day = (i % 28) + 1;

    let body = '';
    let expectedType = 'CREDIT';
    const variant = i % 5;

    if (variant === 0) {
      body = `Rs ${amount.toFixed(2)} credited to a/c XX${acct} on ${day}-AUG-26 by NEFT SALARY CREDIT. Avl Bal Rs ${(120000 + i * 500).toFixed(2)}`;
    } else if (variant === 1) {
      body = `Received Rs.${amount.toFixed(2)} from rahul.sharma@okaxis to A/c XX${acct} via PhonePe UPI.`;
    } else if (variant === 2) {
      body = `Acct XX${acct} has been credited with Rs.${amount.toFixed(2)} on ${day}/08/2026 by IMPS Ref 8821940.`;
    } else if (variant === 3) {
      body = `Notice: Rs.${amount.toFixed(2)} deposited in bank account ending ${acct} from UPI transfer sender: Priya Tech`;
    } else {
      // 2 NEFT samples in this sub-group that fail Engine A regex and require Engine B fallback
      body = `Alert: Account ending ${acct} received money transfer worth INR ${amount.toFixed(2)} from employer payroll via NEFT clearing process`;
      dataset.push({
        id: id++,
        category: 'NEFT / UPI Formats',
        sender: app,
        body,
        expectedType: 'CREDIT',
        expectedAmountRupees: Math.round(amount * 100) / 100,
        simulatedSlmOutput: {
          amount: Math.round(amount * 100) / 100,
          type: 'CREDIT',
          merchant: 'Employer Payroll',
          category: 'UTILITIES',
          confidence: 0.94
        }
      });
      continue;
    }

    dataset.push({
      id: id++,
      category: 'NEFT / UPI Formats',
      sender: app,
      body,
      expectedType,
      expectedAmountRupees: Math.round(amount * 100) / 100
    });
  }

  // -------------------------------------------------------------
  // 3. Unstructured / Novel SMS (30 samples with typos, Hinglish, informal syntax)
  // -------------------------------------------------------------
  const unstructuredTemplates = [
    { text: "Sent payment of 120.00 INR for Ramesh grocery shop purchase via wallet", amount: 120.00, success: true, merchant: "Ramesh Grocery" },
    { text: "Chai n snacks Rs.45 bhej diye shopkeeper ko via paytm wallet", amount: 45.00, success: true, merchant: "Shopkeeper" },
    { text: "auto fare payment 85rs deduct ho gaya account se just now", amount: 85.00, success: true, merchant: "Auto Fare" },
    { text: "Paid bill worth 650.00 rupees toward electric supply renewal", amount: 650.00, success: true, merchant: "Electric Supply" },
    { text: "cable tv monthly fee 350 INR kat gaya account se", amount: 350.00, success: true, merchant: "Cable TV" },
    { text: "Transfer 500 rupees done to friend for dinner split contribution", amount: 500.00, success: true, merchant: "Friend" },
    { text: "Deducted 220.00 INR from wallet balance for medicine order at local chemist", amount: 220.00, success: true, merchant: "Local Chemist" },
    { text: "You just sent 150 rs to Kirana store owner for daily ration items", amount: 150.00, success: true, merchant: "Kirana Store" },
    { text: "Laundry service charge 280.00 INR deducted from prepaid balance", amount: 280.00, success: true, merchant: "Laundry Service" },
    { text: "Payment of 410.00 INR completed for online movie ticket booking", amount: 410.00, success: true, merchant: "Movie Booking" },
    
    { text: "bhej diye 750 rs uncle ko for room rent advance share", amount: 750.00, success: true, merchant: "Room Rent" },
    { text: "petrol pump billing 300 INR processed via wallet pay", amount: 300.00, success: true, merchant: "Petrol Pump" },
    { text: "Chai stall 35 rs paid through quick QR code scan", amount: 35.00, success: true, merchant: "Chai Stall" },
    { text: "Stationery items purchase 180.00 INR paid to vendor", amount: 180.00, success: true, merchant: "Stationery Vendor" },
    { text: "wifi recharge 599 INR done for broadband account 99120", amount: 599.00, success: true, merchant: "Broadband" },
    { text: "Paid 140 rs for parking fee near metro station", amount: 140.00, success: true, merchant: "Parking Metro" },
    { text: "milk delivery monthly charge 920.00 INR sent to dairy seller", amount: 920.00, success: true, merchant: "Dairy Seller" },
    { text: "Taxi ride 450 INR fare debited from linked wallet account", amount: 450.00, success: true, merchant: "Taxi Ride" },
    { text: "fastfood joint 260.00 INR spent for burger meal deal", amount: 260.00, success: true, merchant: "Fastfood Joint" },
    { text: "Gym monthly membership 1200 INR transfer completed", amount: 1200.00, success: true, merchant: "Gym Membership" },

    { text: "Deducted 80.00 INR for juice corner payment", amount: 80.00, success: true, merchant: "Juice Corner" },
    { text: "Bookstore bill 340.00 INR paid via online wallet", amount: 340.00, success: true, merchant: "Bookstore" },
    { text: "vegetables market 210 rs paid to vendor bhai", amount: 210.00, success: true, merchant: "Vegetable Vendor" },
    { text: "barber salon haircut 150 INR payment successful", amount: 150.00, success: true, merchant: "Barber Salon" },
    
    // 6 samples designed as realistic SLM failure / ambiguous parsing (SLM returns incorrect or zero confidence)
    { text: "Your pending balance is 400. Please clear dues soon or service will stop.", amount: 400.00, success: false, merchant: null },
    { text: "Reminder: 850 INR bill due tomorrow. Ignore if already settled.", amount: 850.00, success: false, merchant: null },
    { text: "Payment alert: suspicious login attempt detected near IP 192.168.1.1", amount: 0, success: false, merchant: null },
    { text: "Thank you for visiting Central Mall! Share feedback to win 500 INR coupon.", amount: 500.00, success: false, merchant: null },
    { text: "Info: Your account request 9821 for 300 INR credit limit change is pending approval.", amount: 300.00, success: false, merchant: null },
    { text: "Draft order created for 620 INR at Fashion Hub. Complete payment within 10 mins.", amount: 620.00, success: false, merchant: null }
  ];

  for (let i = 0; i < 30; i++) {
    const tmpl = unstructuredTemplates[i];
    dataset.push({
      id: id++,
      category: 'Unstructured / Novel SMS',
      sender: 'PAYTM',
      body: tmpl.text,
      expectedType: 'DEBIT',
      expectedAmountRupees: tmpl.amount,
      simulatedSlmOutput: tmpl.success ? {
        amount: tmpl.amount,
        type: 'DEBIT',
        merchant: tmpl.merchant,
        category: 'OTHER',
        confidence: 0.88
      } : {
        amount: 0,
        type: 'DEBIT',
        merchant: null,
        category: 'OTHER',
        confidence: 0.25
      }
    });
  }

  // -------------------------------------------------------------
  // 4. Non-Transaction Noise (30 samples)
  // -------------------------------------------------------------
  const noiseSamples = [
    "Your OTP for HDFC NetBanking login is 891204. Do not share with anyone.",
    "Use OTP 449102 to verify your mobile number on BudgetBuddy.",
    "Avail up to 50% discount on credit card upgrade! Apply before 31st August.",
    "Dear customer, your total rewards balance is 450 points. Redeem at bank portal.",
    "Do not share your UPI PIN with anyone claiming to be a bank official.",
    "Your ICICI Bank Internet Banking password will expire in 5 days. Update now.",
    "Get instant personal loan up to 5 Lakhs with zero documentation! Click link.",
    "Your monthly e-statement for account XX4912 has been sent to your registered email.",
    "Pre-approved home loan offer up to 50 Lakhs available for you. Call 1800-XXX-XXXX.",
    "Update your KYC details by visiting nearest branch to avoid account suspension.",
    "Your OTP for SBI card transaction is 773190 valid for 10 minutes.",
    "Exclusive sale live now! Get 20% cashback on all credit card purchases today.",
    "Security alert: Password changed successfully for user ID user_pune99.",
    "Your fastag balance is low (Rs 45.00). Recharge now to avoid toll delay.",
    "Welcome to Axis Mobile Banking! Tap here to explore new features.",
    "OTP for beneficiary addition on Kotak Mahindra Bank is 338102.",
    "Never enter your UPI PIN to receive money in your account. Stay alert!",
    "Congratulations! You earned 100 bonus reward points on your last card swipe.",
    "Scheduled system maintenance tonight from 2 AM to 4 AM. Services may be affected.",
    "Your bank account statement request 991823 has been processed successfully.",
    "OTP for debit card green pin generation is 901244.",
    "Festive offer: 0% processing fee on car loans till end of month.",
    "Alert: Login from new device detected on your mobile banking app.",
    "Your loan application ref 883192 is under verification.",
    "Zero balance savings account opening facility now available online.",
    "OTP for netbanking funds transfer is 510923. Valid for 5 mins.",
    "Important notice: Update your Nominee details online in 3 easy steps.",
    "Earn 5X reward points on dining and travel expenses this weekend.",
    "Your branch IFSC code has been updated to HDFC0001892.",
    "Thank you for contacting customer support. Rate your experience 1-5."
  ];

  for (let i = 0; i < 30; i++) {
    dataset.push({
      id: id++,
      category: 'Non-Transaction Noise (OTPs)',
      sender: banks[i % banks.length],
      body: noiseSamples[i],
      expectedType: 'NOISE',
      expectedAmountRupees: null
    });
  }

  return dataset;
}

const dataset = generateRobustDataset();
const outPath = path.join(__dirname, 'smsBenchmarkDataset.json');
fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2));
console.log(`Successfully generated and saved ${dataset.length} robust synthetic samples to ${outPath}`);
