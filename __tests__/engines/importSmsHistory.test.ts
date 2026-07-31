import { importSmsHistory } from '@/engines/importSmsHistory';
import { readExistingSms } from '@/bridge/smsListener';
import { processBankSms } from '@/engines/router';
import { eventBus } from '@/utils/eventBus';

jest.mock('@/bridge/smsListener', () => ({
  readExistingSms: jest.fn(),
}));

jest.mock('@/engines/router', () => ({
  processBankSms: jest.fn(),
}));

describe('importSmsHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('imports SMS history and reports progress', async () => {
    const mockSmsList = [
      { sender: 'HDFCBK', body: 'Debited Rs 500', timestamp: 1000 },
      { sender: 'SBIINB', body: 'Credited Rs 1000', timestamp: 2000 },
    ];
    (readExistingSms as jest.Mock).mockResolvedValue(mockSmsList);
    (processBankSms as jest.Mock)
      .mockResolvedValueOnce({ id: 1, amountPaise: 50000 })
      .mockResolvedValueOnce(null);

    const onProgress = jest.fn();

    const result = await importSmsHistory(100, onProgress);

    expect(readExistingSms).toHaveBeenCalledWith(100);
    expect(processBankSms).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      total: 2,
      processed: 2,
      succeeded: 1,
      failed: 1,
      isComplete: true,
    });
    expect(onProgress).toHaveBeenCalled();
  });
});
