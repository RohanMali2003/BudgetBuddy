# BudgetBuddy Paper — Content Verification Protocol

Goal: For every empirical claim in the paper, confirm it against the actual repo/device rather than trusting the write-up. Run these in order; each section tells you exactly what a PASS looks like and what a hallucinated/rounded number would look like.

---

## 1. Test Suite Claims (Section 7.1)

**Claim to verify:** "40 test cases across 8 test suites, all passing in 19.154s," with these exact file names:
```
__tests__/engines/categoryResolver.test.ts
__tests__/math/financialMath.test.ts
__tests__/engines/slmPrompts.test.ts
__tests__/engines/regexParser.test.ts
__tests__/engines/slmEngine.test.ts
__tests__/utils/eventBus.test.ts
__tests__/engines/importSmsHistory.test.ts
__tests__/App.test.tsx
```

**Run:**
```bash
# 1. Confirm the files actually exist and match the paper's list exactly
find . -type f \( -name "*.test.ts" -o -name "*.test.tsx" \) | sort

# 2. Re-run the full suite fresh, no cache, and capture real timing
npx jest --clearCache
npx jest --verbose 2>&1 | tee jest_output_raw.log
```

**Pass criteria:**
- The file list from `find` matches the paper's list exactly (no missing/extra files, no renamed files).
- `Test Suites: 8 passed, 8 total` and `Tests: 40 passed, 40 total` appear verbatim in `jest_output_raw.log`.
- Timing is in the same ballpark (±20%) — CI-machine variance is normal, but if it's now 45s or 6s, the paper's number needs updating to reflect current reality, not the one-off run that got written down.

**Red flag:** If the file list differs (e.g., you've since refactored and `importSmsHistory.test.ts` no longer exists, or there are now 11 suites), the paper is describing a stale snapshot — either re-run and update the numbers, or note the git commit hash the numbers correspond to.

---

## 2. SMS Parsing Accuracy Benchmark (Table III-A / III-B, Section 7.2)

This is the highest-risk section for hallucination because it's the core empirical result and requires an actual 250-sample labeled dataset + a script that ran the pipeline against it.

**Ask yourself first:** Does a benchmark script and labeled dataset actually exist in your repo right now? If not, these numbers cannot be verified and should be treated as provisional until you build the harness.

**Run (if the harness exists):**
```bash
# Locate the benchmark script/dataset
find . -iname "*benchmark*" -o -iname "*sms_test_set*" -o -iname "*250*"

# Re-run it and capture raw output
node scripts/runSmsBenchmark.ts > benchmark_output.json   # adjust path to your actual script
```

**Independently recompute the numbers from raw output** — do not trust a summary table; recompute from the per-sample results:
```python
import json

with open("benchmark_output.json") as f:
    results = json.load(f)  # expect list of {category, engine_used, correct: bool}

from collections import defaultdict
totals = defaultdict(lambda: {"n": 0, "correct": 0})
for r in results:
    totals[r["category"]]["n"] += 1
    totals[r["category"]]["correct"] += int(r["correct"])

for cat, v in totals.items():
    print(cat, v["n"], v["correct"], round(100 * v["correct"] / v["n"], 1))
```

**Pass criteria:**
- Recomputed per-category N and accuracy % match Table III-A exactly (120/70/30/30 = 250 total, and the accuracy percentages).
- The routing split (218 to Engine A / 32 to Engine B = 87.2%/12.8%) matches Table III-B, recomputed as `count(engine_used=='A') / 250`.

**Verify the confidence intervals independently** (don't trust that "Wilson 95% CI" was actually computed — recompute it):
```python
from scipy.stats import norm
import math

def wilson_ci(successes, n, z=1.96):
    if n == 0:
        return (0, 0)
    phat = successes / n
    denom = 1 + z**2/n
    center = (phat + z**2/(2*n)) / denom
    margin = (z * math.sqrt((phat*(1-phat) + z**2/(4*n)) / n)) / denom
    return (max(0, center - margin) * 100, min(1, center + margin) * 100)

print(wilson_ci(120, 120))   # expect ≈ (96.9, 100.0) per Table III-A row 1
print(wilson_ci(70, 70))     # expect ≈ (94.8, 100.0)
print(wilson_ci(28, 30))     # expect ≈ (78.7, 98.2)
print(wilson_ci(30, 30))     # expect ≈ (88.6, 100.0)
print(wilson_ci(248, 250))   # expect ≈ (97.1, 99.8) — overall pipeline
```
If your recomputed intervals don't match the table to within rounding, the CIs in the paper were either miscalculated or not actually computed from the stated N — a real risk when an LLM assistant "fills in" a plausible-looking CI without doing the arithmetic.

---

## 3. Latency Benchmarks (Section 7.3)

**Claim:** Engine A <1ms cold, 2.1ms warm, >450 SMS/s; Engine B 2850ms cold, 1420ms warm, 0.7 SMS/s.

**Run:**
```typescript
// benchmarkLatency.ts — adjust imports to your actual modules
import { performance } from 'perf_hooks';
import { parseWithEngineA } from './src/engines/regexParser';

const sampleSms = "Rs.500 spent on Card XX1234 at Amazon on 15-Jan-25";
const N = 1000;
const timings: number[] = [];

for (let i = 0; i < N; i++) {
  const start = performance.now();
  parseWithEngineA(sampleSms);
  timings.push(performance.now() - start);
}

timings.sort((a, b) => a - b);
console.log('median:', timings[Math.floor(N/2)]);
console.log('p95:', timings[Math.floor(N*0.95)]);
console.log('mean:', timings.reduce((a,b) => a+b) / N);
```

Do the same for Engine B (`slmEngine.ts`), separately measuring cold (first call after `forceUnload()`) vs. warm (subsequent calls within the 30s window).

**Pass criteria:** Re-measured medians land within the same order of magnitude as the paper's numbers on your actual test device — not necessarily identical (device/thermal variance is real), but if Engine A now measures 40ms instead of 2.1ms, or Engine B warm is 200ms instead of 1420ms, the paper's numbers are stale or wrong.

**Verify the weighted-average arithmetic independently** — this is pure math, zero ambiguity:
```python
print(0.872 * 2.1 + 0.128 * 1420)  # paper claims 183.6ms
```
This checks out to 183.66 — correct. Good sign that at least the arithmetic in the paper wasn't fabricated, only that the two inputs (2.1ms, 1420ms) need independent confirmation from step above.

---

## 4. Memory Footprint Claims (Section 7.4)

**Claim:** 38 MB idle → 42 MB (Engine A) → 436 MB (Engine B active) → 44 MB (post-unload).

This cannot be verified from code alone — it requires an actual on-device profiling session. Do this:

**Run:**
1. Install a release/profile build on the physical Android 14 ARM64 device mentioned in the paper.
2. Open Android Studio → Profiler → attach to the running process.
3. Trigger: app idle (30s) → screenshot memory graph → send Engine-A-only SMS → screenshot → send Engine-B-triggering SMS → screenshot at peak → wait 30s idle → screenshot post-unload.
4. Export the raw `.hprof` or profiler session, not just a rounded number typed into a table.

**Pass criteria:** Each screenshot's reported RAM is within ~10% of what's written in the paper. Keep the screenshots/exports as supplementary evidence — reviewers may ask for them, and "we ran Android Profiler" with no artifact to show is functionally the same as an unverified claim.

---

## 5. Security Egress Test (Section 7.5)

**Claim:** "100% of test cases" — synthetic `fetch` calls all caught, all returned HTTP 403.

**Run:**
```typescript
// networkBlockTest.ts
import { NetworkBlockInterceptor } from './android/app/src/main/kotlin/.../NetworkBlockInterceptor'; // or however it's tested from JS

const testUrls = [
  'https://api.example.com/telemetry',
  'https://firebase.googleapis.com/log',
  'https://raw.githubusercontent.com/test',
  // add every synthetic egress point actually tested in the paper
];

for (const url of testUrls) {
  const res = await fetch(url).catch(e => e);
  console.log(url, res.status ?? res.message);
}
```
Or, more accurately, locate and re-run the actual Jest/instrumented test that generated this claim:
```bash
find . -iname "*network*test*" -o -iname "*egress*test*"
npx jest __tests__/security/networkEgress.test.ts --verbose
```

**Pass criteria:** Every synthetic call returns 403 and the interceptor's log line `BLOCKED outgoing request to: <url>` appears for each. Count exactly how many test cases were run.

---

## 6. Code Listings — Verify They Match the Actual Source

**Run, for each listed file:**
```bash
# Engine A regex pattern
diff <(sed -n '/DEBIT_SPENT_ON_CARD/,/type:/p' src/engines/regexParser.ts) paper_listing_1.ts

# SlmEngine class (Section 4.3)
diff src/engines/slmEngine.ts paper_listing_slmengine.ts

# financialMath.ts (Section 5.1)
diff src/math/financialMath.ts paper_listing_financialmath.ts

# NetworkBlockInterceptor.kt (Section 6.1)
diff android/app/src/main/kotlin/com/budgetbuddy/network/NetworkBlockInterceptor.kt paper_listing_interceptor.kt
```

**Pass criteria:** Diffs should be empty or trivial (whitespace/comments only).

---

## 7. Math Formulas — Recompute Against Actual Function Behavior

**Run:**
```typescript
import { netBalance, budgetPercentUsed } from './src/math/financialMath';

// Eq. netBalance
console.log(netBalance([
  { type: 'CREDIT', amount: 150000 }, // 1500.00 rupees in paise
  { type: 'DEBIT', amount: 50000 },
]));
// Expect: 100000 (i.e., 1000.00 INR net) — confirm by hand: 150000 - 50000

// Eq. budgetPercentUsed
console.log(budgetPercentUsed(1000000, 750000)); // expect 75
console.log(budgetPercentUsed(0, 50000)); // expect 0 (guard clause)
```

Verify deduplication hash formulation:
```bash
grep -n "SHA-256\|sha256\|dedup" src/engines/deduplication.ts
```

---

## 8. Architecture Diagram vs. Real File Structure

**Run:**
```bash
for f in SmsReceiver.kt SmsNativeModule.kt router.ts deduplication.ts categoryResolver.ts transactionRepo.ts slmEngine.ts slmPrompts.ts financialMath.ts NetworkBlockInterceptor.kt; do
  echo "=== $f ==="
  find . -name "$f"
done
```

---

## 9. Sender ID / Bank Coverage Claim (Section 7.2)

Verify the 12 sender IDs listed in Section 7.2 (`VM-HDFCBK`, `AD-ICICIB`, `SBIINB`, `AXISBK`, `KOTAKB`, `PNBSMS`, `BOBTXN`, `IDFCFB`, `INDUSB`, `PAYTM`, `GOOGLEPAY`, `PHONEPE`):
```bash
grep -n "VM-HDFCBK\|AD-ICICIB\|SBIINB\|AXISBK\|KOTAKB\|PNBSMS\|BOBTXN\|IDFCFB\|INDUSB\|PAYTM\|GOOGLEPAY\|PHONEPE" src/**/*.ts android/**/*.kt
```

---

## 10. Model Size Claims (398 MB / 436 MB)

**Run:**
```bash
ls -lh path/to/qwen2.5-0.5b-instruct-q4_k_m.gguf
du -sh path/to/model/
```

---

## 11. General Anti-Hallucination Checklist Before Resubmission

- [ ] Do you have the raw 250-sample labeled SMS dataset (or a synthetic equivalent) saved somewhere, with per-sample ground truth and predicted output?
- [ ] Do you have the raw Jest output log from an actual run (not retyped from memory) matching the "40 tests, 8 suites, 19.154s" claim?
- [ ] Do you have Android Profiler screenshots or exported traces for the four memory phases?
- [ ] Do you have a saved log of the security egress test run, showing each blocked URL and 403 response?
- [ ] Does every code listing in the paper `diff` cleanly (or near-cleanly) against the current repo state?
- [ ] Have you independently recomputed every Wilson CI, weighted latency average, and percentage in the tables from raw counts?
- [ ] Does the 12 institutions list match the actual count of distinct sender IDs in your test set?
- [ ] Is every file/module named in the architecture description and diagrams traceable to a real file in the repo at the commit you're citing?
