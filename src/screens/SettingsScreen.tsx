import React, { useEffect, useState } from 'react';
import { Alert, AlertButton, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, PictoSize, Settings } from '../types';
import PinDialog from '../components/PinDialog';
import {
  BackupFile,
  applyBackup,
  checkPin,
  connectDropbox,
  createBackup,
  downloadLatestFromDropbox,
  findLatestBackupUri,
  hasPin,
  isDropboxConnected,
  pickBackupUri,
  readBackup,
  setPin,
  shareBackup,
  syncToDropbox,
} from '../backup';

interface Props {
  visible: boolean;
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
}

const SIZES: { value: PictoSize; label: string }[] = [
  { value: 'small', label: 'Pequeño' },
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Grande' },
];

const LANGS: { value: string; label: string }[] = [
  { value: 'es-ES', label: 'Español (España)' },
];

type PinAction =
  | { kind: 'backup'; mode: 'verify' | 'create' }
  | { kind: 'connect'; mode: 'verify' | 'create' }
  | { kind: 'restore'; mode: 'verify' };

export default function SettingsScreen({ visible, settings, onSave, onClose }: Props) {
  const [pinAction, setPinAction] = useState<PinAction | null>(null);
  const [pendingRestore, setPendingRestore] = useState<BackupFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [dbxConnected, setDbxConnected] = useState(false);

  useEffect(() => {
    if (visible) isDropboxConnected().then(setDbxConnected);
  }, [visible]);

  const startBackup = async () => {
    if (busy) return;
    const has = await hasPin();
    setPinAction({ kind: 'backup', mode: has ? 'verify' : 'create' });
  };

  const startConnect = async () => {
    if (busy) return;
    const has = await hasPin();
    setPinAction({ kind: 'connect', mode: has ? 'verify' : 'create' });
  };

  const startRestore = async () => {
    if (busy) return;
    const connected = await isDropboxConnected();
    const local = await findLatestBackupUri();
    const load = async (get: () => Promise<string | null>) => {
      try {
        const uri = await get();
        if (!uri) {
          Alert.alert('Restore', 'No se encontró ningún backup.');
          return;
        }
        const backup = await readBackup(uri);
        setPendingRestore(backup);
        setPinAction({ kind: 'restore', mode: 'verify' });
      } catch {
        Alert.alert('Restore', 'No se pudo leer el backup. Comprueba la conexión o que el archivo sea válido.');
      }
    };
    const buttons: AlertButton[] = [];
    if (connected) {
      buttons.push({ text: 'Última copia de Dropbox', onPress: () => load(downloadLatestFromDropbox) });
    }
    if (local) {
      buttons.push({ text: 'Última copia del iPad', onPress: () => load(async () => local) });
    }
    buttons.push({ text: 'Elegir archivo', onPress: () => load(pickBackupUri) });
    buttons.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert('Restaurar desde', undefined, buttons);
  };

  const runConnect = async () => {
    setBusy(true);
    try {
      const ok = await connectDropbox();
      setDbxConnected(ok);
      Alert.alert('Dropbox', ok ? 'Dropbox conectado correctamente.' : 'No se completó la conexión.');
    } catch (e) {
      Alert.alert('Dropbox', `No se pudo conectar: ${e instanceof Error ? e.message : String(e)}`);
    }
    setBusy(false);
  };

  const uploadNow = async () => {
    if (busy) return;
    setBusy(true);
    const err = await syncToDropbox(true);
    setBusy(false);
    Alert.alert('Dropbox', err ? `Error: ${err}` : 'Última copia subida a Dropbox.');
  };

  const runBackup = async () => {
    setBusy(true);
    try {
      const uri = await createBackup();
      await shareBackup(uri);
      await syncToDropbox();
      Alert.alert('Backup', 'Backup creado correctamente.');
    } catch {
      Alert.alert('Backup', 'No se pudo crear el backup.');
    }
    setBusy(false);
  };

  const runRestore = async (backup: BackupFile) => {
    setBusy(true);
    try {
      await applyBackup(backup);
      Alert.alert('Restore', 'Backup restaurado correctamente.');
    } catch {
      Alert.alert('Restore', 'No se pudo restaurar el backup.');
    }
    setBusy(false);
    setPendingRestore(null);
  };

  const handlePin = async (pin: string): Promise<string | null> => {
    if (!pinAction) return null;
    if (pinAction.kind === 'backup' || pinAction.kind === 'connect') {
      if (pinAction.mode === 'create') {
        await setPin(pin);
      } else if (!(await checkPin(pin))) {
        return 'PIN incorrecto';
      }
      const kind = pinAction.kind;
      setPinAction(null);
      setTimeout(kind === 'connect' ? runConnect : runBackup, 500);
      return null;
    }
    const backup = pendingRestore;
    if (!backup) return null;
    if (!(await checkPin(pin, backup.pinHash))) return 'PIN incorrecto';
    setPinAction(null);
    setTimeout(() => {
      Alert.alert(
        'Restaurar backup',
        'Se reemplazarán todos los pictos y agendas actuales por los del backup. ¿Continuar?',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => setPendingRestore(null) },
          { text: 'Restaurar', style: 'destructive', onPress: () => runRestore(backup) },
        ]
      );
    }, 500);
    return null;
  };

  const cancelPin = () => {
    setPinAction(null);
    setPendingRestore(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView>
            <Text style={styles.title}>⚙️ Ajustes</Text>

            <Text style={styles.sectionLabel}>Tamaño de pictogramas</Text>
            <View style={styles.optionsRow}>
              {SIZES.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.option, settings.pictoSize === s.value && styles.optionActive]}
                  onPress={() => onSave({ ...settings, pictoSize: s.value })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      settings.pictoSize === s.value && styles.optionTextActive,
                    ]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Idioma de voz</Text>
            <View style={styles.optionsColumn}>
              {LANGS.map((l) => (
                <TouchableOpacity
                  key={l.value}
                  style={[styles.option, settings.ttsLang === l.value && styles.optionActive]}
                  onPress={() => onSave({ ...settings, ttsLang: l.value })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      settings.ttsLang === l.value && styles.optionTextActive,
                    ]}
                  >
                    {l.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Copia de seguridad</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity style={[styles.option, styles.backupButton]} onPress={startBackup}>
                <Text style={[styles.optionText, styles.optionTextActive]}>💾 Backup</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.option, styles.backupButton]} onPress={startRestore}>
                <Text style={[styles.optionText, styles.optionTextActive]}>♻️ Restore</Text>
              </TouchableOpacity>
            </View>
            {dbxConnected ? <Text style={styles.statusText}>☁️ Dropbox conectado</Text> : null}
            <View style={styles.optionsRow}>
              <TouchableOpacity style={[styles.option, styles.backupButton]} onPress={startConnect}>
                <Text style={[styles.optionText, styles.optionTextActive]}>
                  {dbxConnected ? '☁️ Reconectar Dropbox' : '☁️ Conectar Dropbox'}
                </Text>
              </TouchableOpacity>
              {dbxConnected ? (
                <TouchableOpacity style={[styles.option, styles.backupButton]} onPress={uploadNow}>
                  <Text style={[styles.optionText, styles.optionTextActive]}>⬆️ Subir ahora</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Cerrar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <PinDialog
          visible={pinAction !== null}
          mode={pinAction?.mode ?? 'verify'}
          title={
            pinAction?.kind === 'restore'
              ? 'Restaurar backup'
              : pinAction?.kind === 'connect'
              ? 'Conectar Dropbox'
              : 'Hacer backup'
          }
          onCancel={cancelPin}
          onSubmit={handlePin}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 8,
    marginTop: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  optionsColumn: {
    gap: 8,
    marginBottom: 8,
  },
  option: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexGrow: 1,
  },
  optionActive: {
    backgroundColor: COLORS.primary,
  },
  optionText: {
    color: '#333',
    fontWeight: 'bold',
  },
  optionTextActive: {
    color: '#fff',
  },
  backupButton: {
    backgroundColor: COLORS.primary,
  },
  statusText: {
    color: '#555',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: COLORS.eliminar,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
