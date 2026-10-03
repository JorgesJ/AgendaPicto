import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  visible: boolean;
  mode: 'verify' | 'create';
  title: string;
  onCancel: () => void;
  onSubmit: (pin: string) => Promise<string | null>;
}

export default function PinDialog({ visible, mode, title, onCancel, onSubmit }: Props) {
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setPin('');
      setPin2('');
      setError('');
      setBusy(false);
    }
  }, [visible]);

  const clean = (t: string) => t.replace(/[^0-9]/g, '').slice(0, 4);

  const submit = async () => {
    if (busy) return;
    if (pin.length !== 4) {
      setError('El PIN debe tener 4 dígitos');
      return;
    }
    if (mode === 'create' && pin !== pin2) {
      setError('Los PIN no coinciden');
      return;
    }
    setBusy(true);
    const err = await onSubmit(pin);
    setBusy(false);
    if (err) {
      setError(err);
      setPin('');
      setPin2('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.label}>
            {mode === 'create' ? 'Crea un PIN de administrador (4 dígitos)' : 'PIN de administrador'}
          </Text>
          <TextInput
            style={styles.input}
            value={pin}
            onChangeText={(t) => {
              setPin(clean(t));
              setError('');
            }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            autoFocus
          />
          {mode === 'create' && (
            <>
              <Text style={styles.label}>Repite el PIN</Text>
              <TextInput
                style={styles.input}
                value={pin2}
                onChangeText={(t) => {
                  setPin2(clean(t));
                  setError('');
                }}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
              />
            </>
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onCancel}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.confirm]} onPress={submit}>
              <Text style={styles.buttonText}>Aceptar</Text>
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
    maxWidth: 420,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  label: {
    fontSize: 15,
    color: '#555',
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 20,
    letterSpacing: 8,
    textAlign: 'center',
    color: '#333',
  },
  error: {
    color: '#E53935',
    fontSize: 14,
    marginTop: 8,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
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
    backgroundColor: '#1a9e7a',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
