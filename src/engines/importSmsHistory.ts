import { readExistingSms } from '@/bridge/smsListener';
import { processBankSms } from './router';
import { eventBus, EVENTS } from '@/utils/eventBus';
import { InteractionManager } from 'react-native';
import type { RawBankSms } from '@/utils/types';

export interface ImportProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  isComplete: boolean;
}

/**
 * Import existing SMS from the inbox.
 * Processes them one at a time through the router.
 * Emits progress events via the event bus.
 */
export async function importSmsHistory(
  count: number = 200,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportProgress> {
  const smsList: RawBankSms[] = await readExistingSms(count);
  const total = smsList.length;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  const emitProgress = () => {
    const progress: ImportProgress = {
      total,
      processed,
      succeeded,
      failed,
      isComplete: processed >= total,
    };
    onProgress?.(progress);
    eventBus.emit(EVENTS.SMS_IMPORT_PROGRESS, progress);
  };

  emitProgress(); // Initial progress

  for (const sms of smsList) {
    // Process each SMS, yielding to the UI between each one
    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(async () => {
        try {
          const tx = await processBankSms(sms);
          if (tx) {
            succeeded++;
            eventBus.emit(EVENTS.TRANSACTION_ADDED, tx);
          } else {
            failed++; // Duplicate or unparseable
          }
        } catch (error) {
          failed++;
          console.error('[ImportHistory] Failed to process SMS:', error);
        } finally {
          processed++;
          emitProgress();
          resolve();
        }
      });
    });

    // Small delay between SMS to prevent UI freezing
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }

  return { total, processed, succeeded, failed, isComplete: true };
}
