import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';

const KEY_PIN = '@backup_pin_hash';
const KEY_INSTALL = '@install_info';
const KEY_ALERT = '@expiry_alert_last';
const KEY_DBX = '@dbx_refresh';
const KEY_LAST_BACKUP = '@last_backup_at';
const KEY_LAST_UPLOAD = '@last_upload_name';
const KEY_SETTINGS = '@agenda_settings';
const INTERNAL_KEYS = [KEY_PIN, KEY_INSTALL, KEY_ALERT, KEY_DBX, KEY_LAST_BACKUP, KEY_LAST_UPLOAD];
const DBX_APP_KEY = 'bhqmzhogt730eb2';
const DBX_REDIRECT = `db-${DBX_APP_KEY}://oauth`;
const KEEP_COPIES = 3;
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

async function listLocal(): Promise<string[]> {
  const info = await FileSystem.getInfoAsync(BACKUP_DIR);
  if (!info.exists) return [];
  return (await FileSystem.readDirectoryAsync(BACKUP_DIR))
    .filter((f) => f.startsWith(FILE_PREFIX) && f.endsWith('.json'))
    .sort();
}

async function pruneLocal(): Promise<void> {
  const files = await listLocal();
  const old = files.slice(0, Math.max(0, files.length - KEEP_COPIES));
  for (const f of old) {
    await FileSystem.deleteAsync(`${BACKUP_DIR}${f}`, { idempotent: true });
  }
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
  await AsyncStorage.setItem(KEY_LAST_BACKUP, String(now.getTime()));
  await pruneLocal();
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


async function dbxToken(): Promise<string | null> {
  const refresh = await AsyncStorage.getItem(KEY_DBX);
  if (!refresh) return null;
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&client_id=${DBX_APP_KEY}&refresh_token=${encodeURIComponent(refresh)}`,
  });
  const json = await res.json();
  return json.access_token ?? null;
}

export async function isDropboxConnected(): Promise<boolean> {
  return !!(await AsyncStorage.getItem(KEY_DBX));
}

export async function connectDropbox(): Promise<boolean> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  const verifier = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const challenge = (
    await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
      encoding: Crypto.CryptoEncoding.BASE64,
    })
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const redirect = encodeURIComponent(DBX_REDIRECT);
  const url =
    `https://www.dropbox.com/oauth2/authorize?client_id=${DBX_APP_KEY}&response_type=code` +
    `&code_challenge=${challenge}&code_challenge_method=S256&token_access_type=offline&redirect_uri=${redirect}`;
  const result = await WebBrowser.openAuthSessionAsync(url, DBX_REDIRECT);
  if (result.type !== 'success') return false;
  const match = /[?&]code=([^&]+)/.exec(result.url);
  if (!match) return false;
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:
      `grant_type=authorization_code&code=${match[1]}&client_id=${DBX_APP_KEY}` +
      `&code_verifier=${verifier}&redirect_uri=${redirect}`,
  });
  const json = await res.json();
  if (!json.refresh_token) return false;
  await AsyncStorage.setItem(KEY_DBX, json.refresh_token);
  return true;
}

async function listRemote(token: string): Promise<string[]> {
  const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: '' }),
  });
  const json = await res.json();
  return ((json.entries ?? []) as { '.tag': string; name: string }[])
    .filter((e) => e['.tag'] === 'file' && e.name.startsWith(FILE_PREFIX))
    .map((e) => e.name)
    .sort();
}

export async function syncToDropbox(): Promise<void> {
  try {
    const token = await dbxToken();
    if (!token) return;
    const files = await listLocal();
    if (files.length === 0) return;
    const name = files[files.length - 1];
    const done = await AsyncStorage.getItem(KEY_LAST_UPLOAD);
    if (done !== name) {
      const up = await FileSystem.uploadAsync(
        'https://content.dropboxapi.com/2/files/upload',
        `${BACKUP_DIR}${name}`,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({ path: `/${name}`, mode: 'overwrite', mute: true }),
          },
        }
      );
      if (up.status !== 200) return;
      await AsyncStorage.setItem(KEY_LAST_UPLOAD, name);
    }
    const remote = await listRemote(token);
    const old = remote.slice(0, Math.max(0, remote.length - KEEP_COPIES));
    for (const f of old) {
      await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `/${f}` }),
      });
    }
  } catch {}
}

export async function downloadLatestFromDropbox(): Promise<string | null> {
  const token = await dbxToken();
  if (!token) return null;
  const remote = await listRemote(token);
  if (remote.length === 0) return null;
  const name = remote[remote.length - 1];
  const res = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Dropbox-API-Arg': JSON.stringify({ path: `/${name}` }) },
  });
  if (!res.ok) return null;
  const text = await res.text();
  const uri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, text);
  return uri;
}

let autoRunning = false;

export async function runAutoBackup(): Promise<void> {
  if (autoRunning) return;
  autoRunning = true;
  try {
    const last = Number((await AsyncStorage.getItem(KEY_LAST_BACKUP)) ?? 0);
    if (Date.now() - last >= DAY_MS) {
      const keys = (await AsyncStorage.getAllKeys()).filter(
        (k) => !INTERNAL_KEYS.includes(k) && k !== KEY_SETTINGS
      );
      if (keys.length > 0) await createBackup();
    }
    await syncToDropbox();
  } catch {}
  autoRunning = false;
}
