import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, PictoSize, Settings } from '../types';
import PinDialog from '../components/PinDialog';
import {
  BackupFile,
  applyBackup,
  checkPin,
  createBackup,
  findLatestBackupUri,
  hasPin,
  pickBackupUri,
  readBackup,
  setPin,
  shareBackup,
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

type PinAction = { kind: 'backup'; mode: 'verify' | 'create' } | { kind: 'restore'; mode: 'verify' };

export default function SettingsScreen({ visible, settings, onSave, onClose }: Props) {
  const [pinAction, setPinAction] = useState<PinAction | null>(null);
  const [pendingRestore, setPendingRestore] = useState<BackupFile | null>(null);
  const [busy, setBusy] = useState(false);

  const startBackup = async () => {
    if (busy) return;
    const has = await hasPin();
    setPinAction({ kind: 'backup', mode: has ? 'verify' : 'create' });
  };

  const startRestore = async () => {
    if (busy) return;
    try {
      let uri = await findLatestBackupUri();
      if (!uri) uri = await pickBackupUri();
      if (!uri) return;
      const backup = await readBackup(uri);
      setPendingRestore(backup);
      setPinAction({ kind: 'restore', mode: 'verify' });
    } catch {
      Alert.alert('Restore', 'No se pudo leer el backup. El archivo no es válido.');
    }
  };

  const runBackup = async () => {
    setBusy(true);
    try {
      const uri = await createBackup();
      await shareBackup(uri);
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
    if (pinAction.kind === 'backup') {
      if (pinAction.mode === 'create') {
        await setPin(pin);
      } else if (!(await checkPin(pin))) {
        return 'PIN incorrecto';
      }
      setPinAction(null);
      setTimeout(runBackup, 500);
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

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Cerrar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <PinDialog
          visible={pinAction !== null}
          mode={pinAction?.mode ?? 'verify'}
          title={pinAction?.kind === 'restore' ? 'Restaurar backup' : 'Hacer backup'}
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
