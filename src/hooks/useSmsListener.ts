import { useEffect, useRef } from 'react';
import { AppState, InteractionManager, type AppStateStatus } from 'react-native';
import { onBankSmsReceived, startListening, stopListening, checkSmsPermissions } from '@/bridge/smsListener';
import { processBankSms } from '@/engines/router';
import { slmEngine } from '@/engines/slmEngine';
import { eventBus, EVENTS } from '@/utils/eventBus';
import type { RawBankSms } from '@/utils/types';

/**
 * Hook that manages the SMS listener lifecycle.
 * - Starts listening when permissions are granted.
 * - Processes incoming SMS through the dual-engine router.
 * - Emits TRANSACTION_ADDED events for UI refresh.
 * - Unloads SLM on app background.
 */
export function useSmsListener(enabled: boolean = true): void {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!enabled) return;

    let unsubscribeSms: (() => void) | null = null;

    const setup = async () => {
      const hasPermission = await checkSmsPermissions();
      if (!hasPermission) {
        console.log('[useSmsListener] SMS permissions not granted');
        return;
      }

      // Start the native foreground service
      startListening();

      // Listen for incoming bank SMS
      unsubscribeSms = onBankSmsReceived((sms: RawBankSms) => {
        // Process after current interactions complete (don't block UI)
        InteractionManager.runAfterInteractions(async () => {
          const tx = await processBankSms(sms);
          if (tx) {
            eventBus.emit(EVENTS.TRANSACTION_ADDED, tx);
          }
        });
      });
    };

    setup();

    // Handle app state changes — unload SLM on background
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (
        appState.current === 'active' &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        console.log('[useSmsListener] App going to background, unloading SLM');
        slmEngine.forceUnload();
      }
      appState.current = nextState;
    });

    return () => {
      unsubscribeSms?.();
      appStateSubscription.remove();
      stopListening();
    };
  }, [enabled]);
}
