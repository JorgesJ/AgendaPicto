import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AgendaScreen from './src/screens/AgendaScreen';
import { getExpiryMessage, onRestored } from './src/backup';

export default function App() {
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    getExpiryMessage().then((msg) => {
      if (msg) Alert.alert('Aviso', msg);
    });
  }, []);

  useEffect(() => onRestored(() => setReloadKey((k) => k + 1)), []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AgendaScreen key={reloadKey} />
    </SafeAreaProvider>
  );
}
