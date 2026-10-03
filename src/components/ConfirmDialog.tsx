import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Sí, eliminar',
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onCancel}>
              <Text style={styles.cancelText}>No</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.confirm]} onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    width: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#555',
    marginBottom: 18,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  cancel: {
    backgroundColor: '#9E9E9E',
  },
  confirm: {
    backgroundColor: '#E53935',
  },
  cancelText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  confirmText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
