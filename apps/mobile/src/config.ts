import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 4000;
const API_PREFIX = '/api/v1';

/**
 * Resolution order:
 * 1. `EXPO_PUBLIC_API_URL` (set it in apps/mobile/.env for physical devices or a deployed API).
 * 2. The LAN host Metro is served from (works for Expo Go on a phone and for emulators).
 * 3. Platform loopback: the Android emulator reaches the host machine at 10.0.2.2.
 */
export function resolveApiUrl(
  explicit = process.env.EXPO_PUBLIC_API_URL,
  hostUri = Constants.expoConfig?.hostUri,
  os = Platform.OS,
): string {
  const configured = explicit?.trim();
  if (configured) return configured.replace(/\/+$/, '');

  const host = hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${API_PORT}${API_PREFIX}`;
  }
  const loopback = os === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${loopback}:${API_PORT}${API_PREFIX}`;
}

export const API_URL = resolveApiUrl();
export const REQUEST_TIMEOUT_MS = 15_000;
export const APP_SCHEME = 'techcapsule';
