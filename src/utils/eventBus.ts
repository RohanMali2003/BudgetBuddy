type EventCallback = (...args: any[]) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(...args);
        } catch (error) {
          console.error(`[EventBus] Error in listener for "${event}":`, error);
        }
      }
    }
  }
}

export const eventBus = new EventBus();

// Event names
export const EVENTS = {
  TRANSACTION_ADDED: 'TRANSACTION_ADDED',
  BUDGET_UPDATED: 'BUDGET_UPDATED',
  SMS_IMPORT_PROGRESS: 'SMS_IMPORT_PROGRESS',
} as const;
