import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, PictoSize, Settings } from '../types';

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

export default function SettingsScreen({ visible, settings, onSave, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
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

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
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
