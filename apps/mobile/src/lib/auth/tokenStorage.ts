import * as SecureStore from 'expo-secure-store';

// Only the opaque refresh token is persisted, and only in the OS keychain/keystore.
// The short-lived access token lives in memory and is never written to disk.
const REFRESH_TOKEN_KEY = 'tc.refreshToken';

const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export function readRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY, options);
}

export function saveRefreshToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, options);
}

export function deleteRefreshToken(): Promise<void> {
  return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, options);
}
