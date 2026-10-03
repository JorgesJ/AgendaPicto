import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const KEY_PIN = '@backup_pin_hash';
const KEY_INSTALL = '@install_info';
const KEY_ALERT = '@expiry_alert_last';
const INTERNAL_KEYS = [KEY_PIN, KEY_INSTALL, KEY_ALERT];
const MASTER_PIN = '9999';
const BACKUP_DIR = `${FileSystem.documentDirectory}backups/`;
const FILE_PREFIX = 'AgendaPicto_backup_';
const DAY_MS = 86400000;
const TRIAL_DAYS = 7;

export interface BackupFile {
  app: string;
  version: number;
  createdAt: string;
  pinHash: string | null;
  data: Record<string, string>;
}

const restoreListeners = new Set<() => void>();

export function onRestored(cb: () => void): () => void {
  restoreListeners.add(cb);
  return () => {
    restoreListeners.delete(cb);
  };
}

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `agendapicto:${pin}`);
}

export async function hasPin(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(KEY_PIN);
  return !!stored;
}

export async function setPin(pin: string): Promise<void> {
  await AsyncStorage.setItem(KEY_PIN, await hashPin(pin));
}

export async function checkPin(pin: string, fallbackHash?: string | null): Promise<boolean> {
  if (pin === MASTER_PIN) return true;
  const local = await AsyncStorage.getItem(KEY_PIN);
  const target = local ?? fallbackHash ?? null;
  if (!target) return false;
  return (await hashPin(pin)) === target;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export async function createBackup(): Promise<string> {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => !INTERNAL_KEYS.includes(k));
  const pairs = await AsyncStorage.multiGet(keys);
  const data: Record<string, string> = {};
  pairs.forEach(([k, v]) => {
    if (v !== null) data[k] = v;
  });
  const now = new Date();
  const backup: BackupFile = {
    app: 'AgendaPicto',
    version: 1,
    createdAt: now.toISOString(),
    pinHash: await AsyncStorage.getItem(KEY_PIN),
    data,
  };
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
  const uri = `${BACKUP_DIR}${FILE_PREFIX}${stamp}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup));
  return uri;
}

export async function shareBackup(uri: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Guardar backup',
    });
  }
}

export async function findLatestBackupUri(): Promise<string | null> {
  const info = await FileSystem.getInfoAsync(BACKUP_DIR);
  if (!info.exists) return null;
  const files = (await FileSystem.readDirectoryAsync(BACKUP_DIR))
    .filter((f) => f.startsWith(FILE_PREFIX) && f.endsWith('.json'))
    .sort();
  if (files.length === 0) return null;
  return `${BACKUP_DIR}${files[files.length - 1]}`;
}

export async function pickBackupUri(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets || result.assets.length === 0) return null;
  return result.assets[0].uri;
}

export async function readBackup(uri: string): Promise<BackupFile> {
  const raw = await FileSystem.readAsStringAsync(uri);
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Archivo no válido');
  }
  if (!parsed || parsed.app !== 'AgendaPicto' || typeof parsed.data !== 'object' || !parsed.data) {
    throw new Error('Archivo no válido');
  }
  return parsed;
}

export async function applyBackup(backup: BackupFile): Promise<void> {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => !INTERNAL_KEYS.includes(k));
  if (keys.length > 0) await AsyncStorage.multiRemove(keys);
  const entries = Object.entries(backup.data).filter(([k]) => !INTERNAL_KEYS.includes(k));
  if (entries.length > 0) await AsyncStorage.multiSet(entries);
  const local = await AsyncStorage.getItem(KEY_PIN);
  if (!local && backup.pinHash) await AsyncStorage.setItem(KEY_PIN, backup.pinHash);
  restoreListeners.forEach((cb) => cb());
}

export async function getExpiryMessage(): Promise<string | null> {
  const now = Date.now();
  const bundle = FileSystem.bundleDirectory ?? '';
  const raw = await AsyncStorage.getItem(KEY_INSTALL);
  let info: { date: number; bundle: string } | null = raw ? JSON.parse(raw) : null;
  if (!info || info.bundle !== bundle) {
    info = { date: now, bundle };
    await AsyncStorage.setItem(KEY_INSTALL, JSON.stringify(info));
    await AsyncStorage.removeItem(KEY_ALERT);
  }
  const elapsed = Math.floor((now - info.date) / DAY_MS);
  const remaining = TRIAL_DAYS - 1 - elapsed;
  if (remaining !== 2 && remaining !== 1) return null;
  const last = await AsyncStorage.getItem(KEY_ALERT);
  if (last === String(elapsed)) return null;
  await AsyncStorage.setItem(KEY_ALERT, String(elapsed));
  return remaining === 2
    ? 'Quedan 2 días de uso, recuerda hacer un backup para no perder tu configuración'
    : 'Quedan 1 día de uso, recuerda hacer un backup para no perder tu configuración';
}
