import { eventBus, EVENTS } from '@/utils/eventBus';

describe('EventBus', () => {
  it('subscribes and receives events', () => {
    const callback = jest.fn();
    const unsubscribe = eventBus.on(EVENTS.TRANSACTION_ADDED, callback);

    eventBus.emit(EVENTS.TRANSACTION_ADDED, { id: 'test-1' });
    expect(callback).toHaveBeenCalledWith({ id: 'test-1' });

    unsubscribe();
    eventBus.emit(EVENTS.TRANSACTION_ADDED, { id: 'test-2' });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('handles multiple listeners and errors gracefully', () => {
    const errorListener = jest.fn(() => {
      throw new Error('Listener error');
    });
    const normalListener = jest.fn();

    eventBus.on(EVENTS.BUDGET_UPDATED, errorListener);
    eventBus.on(EVENTS.BUDGET_UPDATED, normalListener);

    expect(() => {
      eventBus.emit(EVENTS.BUDGET_UPDATED, '2026-07');
    }).not.toThrow();

    expect(errorListener).toHaveBeenCalledWith('2026-07');
    expect(normalListener).toHaveBeenCalledWith('2026-07');
  });
});
