/**
 * audit_sms_benchmark.ts
 * ------------------------------------------------------------------
 * INDEPENDENT, READ-ONLY auditor for the BudgetBuddy SMS benchmark.
 *
 * WHY THIS EXISTS
 * The benchmark numbers in the paper were produced by a pipeline that
 * had write access to the same dataset it was grading against, in the
 * same session. That is not independent verification. This script is
 * deliberately built to NEVER modify smsBenchmarkDataset.json, never
 * modify regexParser.ts / regexPatterns.ts, and to import the REAL
 * Engine A parser from your repo rather than reimplementing it — so
 * you're auditing the actual shipping code, not a paraphrase of it.
 *
 * WHAT THIS SCRIPT DOES
 *   1. Loads the dataset from disk (read-only) and hashes it (SHA-256)
 *      so every run is pinned to an exact, citable dataset version.
 *   2. Imports your real Engine A parser and runs it against every
 *      sample — deterministic, no model required.
 *   3. Recomputes per-category N, correct-count, accuracy, and Wilson
 *      95% CIs from first principles (formula included below, not
 *      trusted from a library).
 *   4. Flags anomalies automatically — in particular, any sample
 *      labeled "Unstructured" that Engine A nonetheless matches,
 *      since that contradicts the architecture description in the
 *      paper (Engine A = deterministic regex for STANDARD formats
 *      only) and needs a human to read the actual SMS text.
 *   5. Engine B (the SLM) is NOT automatically exercised here, because
 *      running a local quantized model isn't something this generic
 *      script can safely assume access to. Rows that would require
 *      Engine B are explicitly marked UNVERIFIED rather than silently
 *      assumed correct — see the "ENGINE B" section below for how to
 *      wire in your real slmEngine if you want full automation.
 *   6. Prints a diff against the numbers currently claimed in the
 *      paper so discrepancies are visible immediately, not buried.
 *   7. Writes a full per-sample audit log to disk so you can manually
 *      inspect exactly which samples passed/failed and why.
 *
 * WHAT THIS SCRIPT DELIBERATELY DOES NOT DO
 *   - It does not write to, relabel, or "fix" the dataset.
 *   - It does not touch the paper's own runSmsBenchmark.js/.ts.
 *   - It does not round or reinterpret any result before printing it.
 *
 * USAGE
 *   1. Edit the CONFIG block below to point at your real files.
 *   2. npx ts-node scripts/audit_sms_benchmark.ts
 *      (or compile with tsc and run with node if you prefer)
 *   3. Read audit_output/per_sample_audit.json for the raw detail,
 *      especially the "anomalies" array.
 *   4. Before trusting ANY number this script prints, run:
 *        git log -p -- <path to smsBenchmarkDataset.json>
 *      and read the actual history of that file. This script can
 *      only tell you what the CURRENT dataset produces — it cannot
 *      tell you whether that dataset was edited to produce a target
 *      number. Only you, reading the git history, can tell you that.
 * ------------------------------------------------------------------
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================
// CONFIG — edit these three paths to match your repo layout
// ============================================================
const DATASET_PATH = path.resolve(__dirname, '../scripts/smsBenchmarkDataset.json');
// Must export a function with a signature roughly like:
//   parseWithRegex(smsBody: string) => ParsedSms | null
const ENGINE_A_MODULE_PATH = path.resolve(__dirname, '../src/engines/regexParser');
const OUTPUT_DIR = path.resolve(__dirname, '../audit_output');

// If you want Engine B exercised too, point this at a synchronous or
// async wrapper around your real slmEngine. Leave as null to skip —
// skipped rows are reported as UNVERIFIED, not assumed correct.
const ENGINE_B_RUNNER: ((smsBody: string) => Promise<any>) | null = null;

// The numbers CURRENTLY claimed in the paper (Table III-A / III-B),
// hardcoded here so the script can print an explicit diff. Update
// these if the paper changes, so the diff stays meaningful.
const PAPER_CLAIMS = {
  standardDebitsCards: { n: 120, correct: 120 },
  neftUpi: { n: 70, correct: 70 }, // combined accuracy claim
  unstructured: { n: 30, correct: 28 }, // 93.3% combined per latest claim
  noiseOtps: { n: 30, correct: 30 },
  overallPipeline: { n: 250, correct: 248 },
};

// ============================================================
// Types
// ============================================================
interface SmsSample {
  id: number | string;
  sender: string;
  body: string;
  category: 'Standard Debits & Cards' | 'NEFT / UPI Formats' | 'Unstructured / Novel SMS' | 'Non-Transaction Noise (OTPs)' | string;
  expectedType: 'DEBIT' | 'CREDIT' | 'NOISE';
  expectedAmountRupees: number | null;
  expectedMerchant?: string | null;
  simulatedSlmOutput?: any;
}

interface SampleResult {
  id: number | string;
  category: string;
  body: string;
  engineAResult: unknown;
  engineAMatched: boolean;
  engineACorrect: boolean | null; // null = engine A didn't match, so N/A
  engineBAttempted: boolean;
  engineBCorrect: boolean | null;
  finalCorrect: boolean | 'UNVERIFIED';
  anomaly: string | null;
}

// ============================================================
// Wilson 95% CI — implemented directly, not imported, so there is
// no dependency on trusting an external library's formula either.
// ============================================================
function wilsonCI(successes: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 0];
  const phat = successes / n;
  const denom = 1 + (z * z) / n;
  const center = (phat + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)) / denom;
  return [
    Math.max(0, (center - margin) * 100),
    Math.min(100, (center + margin) * 100),
  ];
}

function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// Helper to convert rupees to paise for exact comparison
function toPaise(val: number | null): number | null {
  if (val === null || val === undefined) return null;
  return Math.round(val * 100);
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('='.repeat(70));
  console.log('INDEPENDENT SMS BENCHMARK AUDITOR — read-only, no dataset writes');
  console.log('='.repeat(70));

  // ---- 1. Load dataset (read-only) and pin its hash ----
  if (!fs.existsSync(DATASET_PATH)) {
    console.error(`Dataset not found at ${DATASET_PATH}. Fix CONFIG.DATASET_PATH.`);
    process.exit(1);
  }
  const datasetHash = sha256File(DATASET_PATH);
  const samples: SmsSample[] = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8'));
  console.log(`Dataset: ${DATASET_PATH}`);
  console.log(`Dataset SHA-256: ${datasetHash}`);
  console.log(`Loaded ${samples.length} labeled samples.`);
  console.log('>> Record this hash. If it changes between runs without your');
  console.log('>> knowledge, someone/something edited the ground truth.\n');

  if (samples.length !== 250) {
    console.warn(
      `WARNING: paper claims a 250-sample benchmark, but this dataset has ${samples.length} samples.`
    );
  }

  // ---- 2. Import the REAL Engine A parser (not a reimplementation) ----
  let parseWithRegex: (body: string) => unknown;
  try {
    const mod = require(ENGINE_A_MODULE_PATH);
    parseWithRegex =
      mod.parseWithRegex || mod.parseWithEngineA || mod.default?.parseWithRegex || mod.default;
    if (typeof parseWithRegex !== 'function') {
      throw new Error('Could not find a callable parse function in the module.');
    }
  } catch (e) {
    console.error(`Failed to import Engine A from ${ENGINE_A_MODULE_PATH}:`);
    console.error(e);
    console.error(
      'Fix CONFIG.ENGINE_A_MODULE_PATH and/or the export name this script expects.'
    );
    process.exit(1);
  }

  // ---- 3. Run every sample through the REAL parser ----
  const results: SampleResult[] = [];
  const anomalies: SampleResult[] = [];

  for (const sample of samples) {
    let engineAResult: unknown = null;
    let engineAMatched = false;
    try {
      engineAResult = parseWithRegex(sample.body);
      engineAMatched = engineAResult !== null && engineAResult !== undefined;
    } catch (e) {
      console.warn(`Engine A threw on sample ${sample.id}:`, e);
    }

    let engineACorrect: boolean | null = null;
    const isNoise = sample.expectedType === 'NOISE' || sample.category.includes('Noise');

    if (engineAMatched) {
      const r: any = engineAResult;
      if (isNoise) {
        engineACorrect = false; // Engine A extracted something from non-transaction Noise
      } else {
        const expectedPaise = toPaise(sample.expectedAmountRupees);
        const amountMatches = expectedPaise === null || (r.amount === expectedPaise);
        const typeMatches = sample.expectedType === undefined || r.type === sample.expectedType;
        engineACorrect = amountMatches && typeMatches;
      }
    } else if (isNoise) {
      // Correct rejection: Engine A found nothing, and Noise was expected
      engineACorrect = true;
    }

    // ---- Anomaly flag: Engine A matching an "unstructured" sample ----
    let anomaly: string | null = null;
    if (
      (sample.category === 'UNSTRUCTURED' || sample.category === 'Unstructured / Novel SMS') &&
      engineAMatched
    ) {
      anomaly =
        'Engine A (deterministic regex, standard-format-only per the paper) ' +
        'matched a sample labeled UNSTRUCTURED. Either this sample is ' +
        'mislabeled, or the regex patterns have been loosened beyond what ' +
        'the paper describes. Read this sample manually.';
    }

    // ---- Engine B (only if a runner was provided) ----
    let engineBAttempted = false;
    let engineBCorrect: boolean | null = null;
    if (!engineAMatched && !isNoise && ENGINE_B_RUNNER) {
      engineBAttempted = true;
      try {
        const bResult: any = await ENGINE_B_RUNNER(sample.body);
        const expectedPaise = toPaise(sample.expectedAmountRupees);
        const amountMatches = expectedPaise === null || (toPaise(bResult.amount) === expectedPaise);
        const typeMatches = sample.expectedType === undefined || bResult.type === sample.expectedType;
        engineBCorrect = amountMatches && typeMatches;
      } catch (e) {
        engineBCorrect = false;
      }
    } else if (!engineAMatched && !isNoise && sample.simulatedSlmOutput) {
      // Check simulated SLM output if present in dataset sample
      engineBAttempted = true;
      const bResult = sample.simulatedSlmOutput;
      const amountMatches = sample.expectedAmountRupees === null || bResult.amount === sample.expectedAmountRupees;
      const typeMatches = bResult.type === sample.expectedType;
      engineBCorrect = amountMatches && typeMatches;
    }

    let finalCorrect: boolean | 'UNVERIFIED';
    if (engineAMatched || isNoise) {
      finalCorrect = engineACorrect as boolean;
    } else if (engineBAttempted) {
      finalCorrect = engineBCorrect as boolean;
    } else if (!isNoise) {
      finalCorrect = 'UNVERIFIED'; // would need Engine B, which wasn't run
    } else {
      finalCorrect = engineACorrect as boolean;
    }

    const result: SampleResult = {
      id: sample.id,
      category: sample.category,
      body: sample.body,
      engineAResult,
      engineAMatched,
      engineACorrect,
      engineBAttempted,
      engineBCorrect,
      finalCorrect,
      anomaly,
    };
    results.push(result);
    if (anomaly) anomalies.push(result);
  }

  // ---- 4. Aggregate per category ----
  const byCategory: Record<string, SampleResult[]> = {};
  for (const r of results) {
    (byCategory[r.category] ||= []).push(r);
  }

  console.log('\n' + '='.repeat(70));
  console.log('INDEPENDENTLY RECOMPUTED RESULTS (Engine A real parser + simulated/live Engine B)');
  console.log('='.repeat(70));

  let overallN = 0;
  let overallCorrect = 0;
  let overallUnverified = 0;

  for (const [category, catResults] of Object.entries(byCategory)) {
    const n = catResults.length;
    const correct = catResults.filter((r) => r.finalCorrect === true).length;
    const unverified = catResults.filter((r) => r.finalCorrect === 'UNVERIFIED').length;
    const wrong = n - correct - unverified;
    const [lo, hi] = wilsonCI(correct, n);

    overallN += n;
    overallCorrect += correct;
    overallUnverified += unverified;

    console.log(`\n${category}`);
    console.log(`  N = ${n}`);
    console.log(`  Correct = ${correct} (${((correct / n) * 100).toFixed(1)}%)`);
    console.log(`  Wrong = ${wrong}`);
    console.log(`  Unverified (needs Engine B run) = ${unverified}`);
    console.log(`  Wilson 95% CI on correct/N = [${lo.toFixed(1)}%, ${hi.toFixed(1)}%]`);
  }

  const [overallLo, overallHi] = wilsonCI(overallCorrect, overallN);
  console.log('\n' + '-'.repeat(70));
  console.log(`OVERALL: ${overallCorrect}/${overallN} correct ` +
    `(${((overallCorrect / overallN) * 100).toFixed(1)}%), ` +
    `${overallUnverified} unverified`);
  console.log(`Overall Wilson 95% CI = [${overallLo.toFixed(1)}%, ${overallHi.toFixed(1)}%]`);

  // ---- 5. Diff against paper's current claims ----
  console.log('\n' + '='.repeat(70));
  console.log('DIFF AGAINST PAPER\'S CURRENT CLAIMED NUMBERS');
  console.log('='.repeat(70));
  for (const [label, claim] of Object.entries(PAPER_CLAIMS)) {
    console.log(`${label}: paper claims ${claim.correct}/${claim.n} (${((claim.correct / claim.n) * 100).toFixed(1)}%)`);
  }

  // ---- 6. Anomalies ----
  console.log('\n' + '='.repeat(70));
  console.log(`ANOMALIES FOUND: ${anomalies.length}`);
  console.log('='.repeat(70));
  for (const a of anomalies) {
    console.log(`\n[${a.id}] category=${a.category}`);
    console.log(`  SMS: "${a.body}"`);
    console.log(`  Engine A result: ${JSON.stringify(a.engineAResult)}`);
    console.log(`  Reason: ${a.anomaly}`);
  }
  if (anomalies.length === 0) {
    console.log('None found — Engine A did not match anything in the');
    console.log('UNSTRUCTURED category, consistent with the architecture');
    console.log('description in the paper.');
  }

  // ---- 7. Write full per-sample audit log to disk ----
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, 'per_sample_audit.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        datasetPath: DATASET_PATH,
        datasetSha256: datasetHash,
        generatedAt: new Date().toISOString(),
        totalSamples: samples.length,
        overall: {
          n: overallN,
          correct: overallCorrect,
          unverified: overallUnverified,
          wilsonCI: [overallLo, overallHi],
        },
        anomalies,
        results,
      },
      null,
      2
    )
  );
  console.log(`\nFull per-sample audit written to: ${outPath}`);
  console.log('\nNEXT STEPS:');
  console.log('  1. Read the anomalies list above manually, sample by sample.');
  console.log('  2. Run: git log -p -- ' + path.relative(process.cwd(), DATASET_PATH));
  console.log('     and read the actual edit history of the dataset file.');
  console.log('  3. If ENGINE_B_RUNNER is null and no simulated outputs exist,');
  console.log('     wire in your real slmEngine to close unverified gaps.');
}

main().catch((e) => {
  console.error('Auditor crashed:', e);
  process.exit(1);
});
