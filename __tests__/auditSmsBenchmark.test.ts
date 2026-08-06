import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { parseWithRegex } from '../src/engines/regexParser';
import { parseToPaise } from '../src/utils/currency';

const DATASET_PATH = path.resolve(__dirname, '../scripts/smsBenchmarkDataset.json');
const OUTPUT_DIR = path.resolve(__dirname, '../audit_output');

const PAPER_CLAIMS = {
  standardDebitsCards: { n: 120, correct: 120 },
  neftUpi: { n: 70, correct: 70 },
  unstructured: { n: 30, correct: 28 },
  noiseOtps: { n: 30, correct: 30 },
  overallPipeline: { n: 250, correct: 248 },
};

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

describe('Independent SMS Benchmark Auditor', () => {
  it('should run independent audit against shipping Engine A parser', () => {
    expect(fs.existsSync(DATASET_PATH)).toBe(true);

    const datasetHash = sha256File(DATASET_PATH);
    const samples = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8'));

    console.log('='.repeat(70));
    console.log('INDEPENDENT SMS BENCHMARK AUDITOR — read-only, no dataset writes');
    console.log('='.repeat(70));
    console.log(`Dataset: ${DATASET_PATH}`);
    console.log(`Dataset SHA-256: ${datasetHash}`);
    console.log(`Loaded ${samples.length} labeled samples.`);

    const results: any[] = [];
    const anomalies: any[] = [];

    for (const sample of samples) {
      let engineAResult: any = null;
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
        if (isNoise) {
          engineACorrect = false;
        } else {
          const expectedPaise = sample.expectedAmountRupees ? parseToPaise(sample.expectedAmountRupees.toString()) : null;
          const amountMatches = expectedPaise === null || (engineAResult.amount === expectedPaise);
          const typeMatches = sample.expectedType === undefined || engineAResult.type === sample.expectedType;
          engineACorrect = amountMatches && typeMatches;
        }
      } else if (isNoise) {
        engineACorrect = true;
      }

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

      let engineBAttempted = false;
      let engineBCorrect: boolean | null = null;
      if (!engineAMatched && !isNoise && sample.simulatedSlmOutput) {
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
        finalCorrect = 'UNVERIFIED';
      } else {
        finalCorrect = engineACorrect as boolean;
      }

      const result = {
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

    const byCategory: Record<string, any[]> = {};
    for (const r of results) {
      (byCategory[r.category] ||= []).push(r);
    }

    console.log('\n' + '='.repeat(70));
    console.log('INDEPENDENTLY RECOMPUTED RESULTS (Real Engine A parser + SLM fallback)');
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

    console.log('\n' + '='.repeat(70));
    console.log('ANOMALIES FOUND: ' + anomalies.length);
    console.log('='.repeat(70));
    if (anomalies.length === 0) {
      console.log('None found — Engine A did not match anything in the');
      console.log('UNSTRUCTURED category, consistent with the architecture');
      console.log('description in the paper.');
    }

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

    expect(overallCorrect).toBe(225);
    expect(anomalies.length).toBe(0);
  });
});
