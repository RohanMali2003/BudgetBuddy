import { initLlama, type LlamaContext } from 'llama.rn';
import { VALID_CATEGORIES, type SlmExtractionResult, type TransactionCategory } from '@/utils/types';
import { SLM_IDLE_TIMEOUT_MS, SLM_MAX_TOKENS, SLM_TEMPERATURE, SLM_CONTEXT_SIZE } from '@/utils/constants';

const DEFAULT_MODEL_PATH = '/sdcard/Android/data/com.budgetbuddy/files/models/qwen2.5-0.5b-instruct-q4_k_m.gguf';

class SlmEngine {
  private context: LlamaContext | null = null;
  private unloadTimer: ReturnType<typeof setTimeout> | null = null;
  private refCount: number = 0;
  private isLoading: boolean = false;
  private loadPromise: Promise<void> | null = null;
  private modelPath: string = DEFAULT_MODEL_PATH;

  setModelPath(path: string): void {
    this.modelPath = path;
  }

  getModelPath(): string {
    return this.modelPath;
  }

  isLoaded(): boolean {
    return this.context !== null;
  }

  isModelAvailable(): boolean {
    return this.modelPath.length > 0;
  }

  /**
   * Acquire a reference — loads model if not already loaded.
   * Multiple callers can acquire simultaneously; the model stays loaded
   * until ALL callers have released AND the idle timeout expires.
   */
  async acquire(): Promise<void> {
    this.refCount++;
    this.clearUnloadTimer();

    if (this.context) return;

    if (this.isLoading && this.loadPromise) {
      await this.loadPromise;
      return;
    }

    this.isLoading = true;
    this.loadPromise = this.loadModel();
    try {
      await this.loadPromise;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Release a reference — starts idle unload timer if refCount hits 0.
   */
  release(): void {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0) {
      this.startUnloadTimer();
    }
  }

  /**
   * Force unload immediately — call on app background or when model needs to be freed.
   */
  async forceUnload(): Promise<void> {
    this.clearUnloadTimer();
    this.refCount = 0;
    if (this.context) {
      try {
        await this.context.release();
      } catch (error) {
        console.error('[SlmEngine] Error releasing context:', error);
      }
      this.context = null;
      console.log('[SlmEngine] Model unloaded');
    }
  }

  /**
   * Run inference with the given prompt. Must call acquire() first.
   */
  async complete(prompt: string): Promise<string> {
    if (!this.context) {
      throw new Error('[SlmEngine] Model not loaded. Call acquire() first.');
    }

    const result = await this.context.completion({
      prompt,
      n_predict: SLM_MAX_TOKENS,
      temperature: SLM_TEMPERATURE,
      top_p: 0.9,
      stop: ['```', '\n\n\n', '<|im_end|>'],
    });

    return result.text;
  }

  private async loadModel(): Promise<void> {
    if (!this.modelPath) {
      throw new Error('[SlmEngine] Model path not set. Call setModelPath() first.');
    }

    console.log('[SlmEngine] Loading model from:', this.modelPath);
    const startTime = Date.now();

    this.context = await initLlama({
      model: this.modelPath,
      n_ctx: SLM_CONTEXT_SIZE,
      n_threads: 4,
      n_gpu_layers: 0,  // CPU-only for maximum compatibility
    });

    const elapsed = Date.now() - startTime;
    console.log(`[SlmEngine] Model loaded in ${elapsed}ms`);
  }

  private startUnloadTimer(): void {
    this.unloadTimer = setTimeout(() => {
      console.log('[SlmEngine] Idle timeout reached, unloading model');
      this.forceUnload();
    }, SLM_IDLE_TIMEOUT_MS);
  }

  private clearUnloadTimer(): void {
    if (this.unloadTimer) {
      clearTimeout(this.unloadTimer);
      this.unloadTimer = null;
    }
  }
}

// Singleton
export const slmEngine = new SlmEngine();

/**
 * Parse the raw SLM output into a structured result.
 * Defensive — expects garbage and handles it.
 */
export function parseSlmOutput(raw: string): SlmExtractionResult | null {
  try {
    // Try to extract JSON from the response (SLM might add extra text)
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.warn('[SlmEngine] No JSON found in SLM output');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (typeof parsed.amount !== 'number' || parsed.amount <= 0) {
      console.warn('[SlmEngine] Invalid amount in SLM output:', parsed.amount);
      return null;
    }

    if (!['DEBIT', 'CREDIT'].includes(parsed.type)) {
      console.warn('[SlmEngine] Invalid type in SLM output:', parsed.type);
      return null;
    }

    // Validate category
    const category: TransactionCategory = VALID_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : 'OTHER';

    // Validate confidence
    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.5;

    return {
      amount: Math.round(parsed.amount * 100),  // Convert rupees to paise
      type: parsed.type as 'DEBIT' | 'CREDIT',
      merchantOrVpa: typeof parsed.merchant === 'string' ? parsed.merchant : null,
      category,
      confidence,
    };
  } catch (error) {
    console.warn('[SlmEngine] Failed to parse SLM output:', error, 'Raw:', raw.substring(0, 200));
    return null;
  }
}
