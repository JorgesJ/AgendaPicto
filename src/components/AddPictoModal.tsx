import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { COLORS, Period, Pictogram } from '../types';

interface Props {
  visible: boolean;
  period: Period | null;
  misPictos: Pictogram[];
  onClose: () => void;
  onAdd: (picto: Pictogram) => void;
}

const PERIOD_LABELS: Record<Period, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  noche: 'Noche',
};

interface ArasaacResult {
  _id: number;
  keywords: { keyword: string }[];
}

function useKeyboardHeight(active: boolean) {
  const [kbH, setKbH] = useState(0);
  useEffect(() => {
    if (!active) {
      setKbH(0);
      return;
    }
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setKbH(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setKbH(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [active]);
  return kbH;
}

type View_ = 'name' | 'menu' | 'arasaac';

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function AddPictoModal({ visible, period, misPictos, onClose, onAdd }: Props) {
  const [view, setView] = useState<View_>('name');
  const kbH = useKeyboardHeight(visible);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ArasaacResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const reset = () => {
    setView('name');
    setName('');
    setQuery('');
    setResults([]);
    setLoading(false);
    setSearchError('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const uriToBase64 = async (uri: string): Promise<string> => {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  };

  const addFromBase64 = (b64: string) => {
    onAdd({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: name.trim(),
      localUri: b64,
      isBase64: true,
      forbidden: false,
      addedAt: Date.now(),
    });
    close();
  };

  const submitName = () => {
    const n = name.trim();
    if (!n) return;
    const found = misPictos.find((p) => normalize(p.text) === normalize(n));
    if (found) {
      onAdd({
        ...found,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        forbidden: false,
        addedAt: Date.now(),
      });
      close();
    } else {
      setView('menu');
    }
  };

  const openArasaac = () => {
    setQuery(name.trim());
    setView('arasaac');
    searchArasaac(name.trim());
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      const b64 = await uriToBase64(result.assets[0].uri);
      addFromBase64(b64);
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled && result.assets[0]) {
      const b64 = await uriToBase64(result.assets[0].uri);
      addFromBase64(b64);
    }
  };

  const searchArasaac = async (q?: string) => {
    const term = (typeof q === 'string' ? q : query).trim();
    if (!term) return;
    setLoading(true);
    setSearchError('');
    setResults([]);
    try {
      const res = await axios.get<ArasaacResult[]>(
        `https://api.arasaac.org/v1/pictograms/es/search/${encodeURIComponent(term)}`
      );
      setResults(res.data);
      if (res.data.length === 0) setSearchError('Sin resultados');
    } catch {
      setSearchError('Error de conexión. Comprueba tu internet.');
    } finally {
      setLoading(false);
    }
  };

  const selectArasaac = (item: ArasaacResult) => {
    const picto: Pictogram = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: name.trim() || (item.keywords[0]?.keyword ?? 'pictograma'),
      imageUrl: `https://static.arasaac.org/pictograms/${item._id}/${item._id}_500.png`,
      forbidden: false,
      addedAt: Date.now(),
    };
    onAdd(picto);
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={[styles.overlay, { paddingBottom: kbH }]}>
        <View style={styles.sheet}>
          {view === 'name' && (
            <>
              <Text style={styles.title}>Añadir Actividad</Text>
              <Text style={styles.label}>Nombre del pictograma:</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                onSubmitEditing={submitName}
                returnKeyType="done"
                autoFocus
              />
              <View style={styles.buttonsRow}>
                <TouchableOpacity style={[styles.dialogButton, styles.cancelBg]} onPress={close}>
                  <Text style={styles.dialogButtonText}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogButton, styles.addBg, !name.trim() && styles.disabled]}
                  onPress={submitName}
                  disabled={!name.trim()}
                >
                  <Text style={styles.dialogButtonText}>AÑADIR</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {view === 'menu' && (
            <>
              <Text style={styles.title}>{name.trim()}</Text>
              <Text style={styles.label}>No está guardado. Elige de dónde sacarlo:</Text>
              <View style={styles.grid}>
                <TouchableOpacity style={styles.option} onPress={pickFromGallery}>
                  <Text style={styles.optionEmoji}>🖼️</Text>
                  <Text style={styles.optionText}>Galería</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.option} onPress={pickFromCamera}>
                  <Text style={styles.optionEmoji}>📷</Text>
                  <Text style={styles.optionText}>Cámara</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.option} onPress={openArasaac}>
                  <Text style={styles.optionEmoji}>🔍</Text>
                  <Text style={styles.optionText}>ARASAAC</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setView('name')}>
                <Text style={styles.cancelText}>Volver</Text>
              </TouchableOpacity>
            </>
          )}

          {view === 'arasaac' && (
            <>
              <Text style={styles.title}>Buscar en ARASAAC</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Ej: comer, colegio..."
                  onSubmitEditing={() => searchArasaac()}
                  returnKeyType="search"
                />
                <TouchableOpacity style={styles.searchButton} onPress={() => searchArasaac()}>
                  <Text style={styles.primaryButtonText}>🔍</Text>
                </TouchableOpacity>
              </View>
              {loading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />}
              {!!searchError && <Text style={styles.error}>{searchError}</Text>}
              <FlatList
                data={results}
                keyExtractor={(item) => String(item._id)}
                numColumns={3}
                style={styles.resultsList}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.resultItem} onPress={() => selectArasaac(item)}>
                    <Image
                      source={{
                        uri: `https://static.arasaac.org/pictograms/${item._id}/${item._id}_300.png`,
                      }}
                      style={styles.resultImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.resultText} numberOfLines={1}>
                      {item.keywords[0]?.keyword ?? ''}
                    </Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity style={styles.cancelButton} onPress={() => setView('menu')}>
                <Text style={styles.cancelText}>Volver</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  dialogButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBg: {
    backgroundColor: '#90A4AE',
  },
  addBg: {
    backgroundColor: '#3498DB',
  },
  dialogButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  option: {
    width: '31%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 20,
  },
  optionEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  optionText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  preview: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 14,
    color: '#333',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.4,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  resultsList: {
    marginTop: 12,
    maxHeight: 320,
  },
  resultItem: {
    flex: 1 / 3,
    alignItems: 'center',
    padding: 6,
  },
  resultImage: {
    width: 72,
    height: 72,
  },
  resultText: {
    fontSize: 12,
    color: '#333',
    marginTop: 2,
  },
  error: {
    color: '#E53935',
    textAlign: 'center',
    marginTop: 12,
  },
  empty: {
    color: '#777',
    textAlign: 'center',
    marginVertical: 20,
  },
  cancelButton: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    color: '#777',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
