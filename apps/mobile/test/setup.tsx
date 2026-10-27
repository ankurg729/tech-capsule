/* eslint-disable @typescript-eslint/no-require-imports */

// In-memory keychain so session tests can assert exactly what gets persisted.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      store.delete(k);
    }),
    __store: store,
  };
});

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: undefined, version: '0.1.0' } },
}));

// Icon fonts are native assets; render the glyph name instead.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text } = require('react-native');
  const Icon = ({ name }: { name: string }) => <Text accessible={false}>{`icon:${name}`}</Text>;
  return { __esModule: true, default: Icon };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});
