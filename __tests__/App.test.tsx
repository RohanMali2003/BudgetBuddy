import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    executeSync: jest.fn(() => ({ rows: [] })),
  })),
}));

jest.mock('@/bridge/smsListener', () => ({
  checkSmsPermissions: jest.fn().mockResolvedValue(true),
  startListening: jest.fn(),
  stopListening: jest.fn(),
  onBankSmsReceived: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('react-native-fs', () => ({
  ExternalDirectoryPath: '/sdcard/Android/data/com.budgetbuddy/files',
  exists: jest.fn().mockResolvedValue(false),
}));

import App from '../src/App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
