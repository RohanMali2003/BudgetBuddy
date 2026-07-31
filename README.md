# 💸 BudgetBuddy

> **Privacy-First, On-Device Financial Intelligence**  
> *Track spending automatically from bank SMS. Zero cloud. Zero tracking. 100% Local.*

BudgetBuddy is a commercial-grade, zero-cloud personal finance assistant built with **React Native** and powered by a **Dual-Engine Architecture**:
- **Engine A (Deterministic Regex)**: Ultra-fast (< 5ms) deterministic parsing for standardized Indian bank SMS formats.
- **Engine B (On-Device SLM)**: On-device Small Language Model (**Qwen 2.5 0.5B Instruct**) running locally via C++ `llama.rn` bindings for unstructured or non-standard SMS fallback.

---

## 📱 How It Works on Android Phones

On a physical Android phone, **no terminals, PowerShell, or ADB commands are needed!** BudgetBuddy is built as a complete consumer application:

1. **Automatic Transaction Tracking**:
   - Grant SMS permission during Onboarding.
   - Whenever you pay via UPI, Credit/Debit card, Net Banking, or receive a salary/refund, your phone's Android OS automatically triggers BudgetBuddy in the background.
   - Transactions are instantly parsed and added to your Dashboard with zero user effort!

2. **One-Tap Historical Import**:
   - Tap **"Import SMS History"** in Settings or Onboarding.
   - The app scans your existing inbox, parses all past bank SMS messages, and populates your full spending history in seconds.

3. **One-Tap In-App AI Model Downloader**:
   - Go to **Settings ⚙️ → SLM Model Status**.
   - Tap **"Download AI Model (~398 MB)"**.
   - BudgetBuddy downloads and configures the AI model directly on your phone with an in-app progress bar!

---

## 💻 Developer & Emulator Setup Guide

If you are a developer testing in **BlueStacks**, **Android Studio Emulator**, or via **USB Debugging**:

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Connect BlueStacks / Emulator / Phone
- **BlueStacks**: Enable ADB in Settings → `adb connect localhost:5555`
- **Physical Phone**: Enable USB Debugging in Developer Options → Plug in USB

### Step 3: Run the App
```bash
npm run android
```

---

## 🧪 Developer Simulation & Testing (ADB CLI)

When testing on emulators where real cellular SMS does not arrive, you can simulate bank SMS using ADB:

```powershell
# HDFC Debit Test
adb emu sms send HDFCBK "Your a/c XX1234 was debited by Rs.450.00 on 31-Jul-26 for UPI txn to Swiggy. Avl Bal: Rs.12500.00"

# Salary Credit Test
adb emu sms send ICICIB "Rs 75,000.00 credited to a/c XX5678 on 31-JUL-26 by NEFT SALARY. Avl Bal Rs 1,12,000.00"
```

---

## 📝 Sample Bank SMS Formats

BudgetBuddy automatically recognizes SMS formats from major Indian banks and payment apps:

| Bank / Provider | Sample SMS Text | Expected Output |
| :--- | :--- | :--- |
| **HDFC Bank** | `Your A/C XX4321 is debited for Rs.349.00 on 31-Jul-26 trf to SWIGGY. Avl Bal Rs.14,250.00.` | **DEBIT ₹349.00** (Food) |
| **ICICI Bank** | `INR 2,499.00 spent on HDFC Bank Card XX9012 at AMAZON on 2026-07-31` | **DEBIT ₹2,499.00** (Shopping) |
| **SBI / NEFT** | `Rs.75,000.00 credited to A/c XX5678 on 31-JUL-26 by SALARY NEFT.` | **CREDIT ₹75,000.00** (Income) |
| **Airtel / Utilities** | `Paid Rs.1,250.00 to AIRTEL BILL from A/c XX1234 on 31-Jul-26` | **DEBIT ₹1,250.00** (Utilities) |
| **Unstructured (Engine B)** | `Hey, ₹180 received in your account from Alex via UPI payment. Ref ID 981273.` | **CREDIT ₹180.00** (SLM AI Fallback) |

---

## 🛠️ Tech Stack & Architecture

- **UI Framework**: React Native 0.86 with TypeScript
- **Database**: `@op-engineering/op-sqlite` with WAL mode
- **SLM Engine**: `llama.rn` with C++ bindings for GGUF model execution
- **State & Events**: Event Bus for real-time reactivity across screens
- **Privacy Enforcement**: Hardcoded `NetworkBlockInterceptor` preventing any outgoing HTTP traffic
