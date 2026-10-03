import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
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

type View_ = 'menu' | 'name' | 'arasaac' | 'mispictos';

export default function AddPictoModal({ visible, period, misPictos, onClose, onAdd }: Props) {
  const [view, setView] = useState<View_>('menu');
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ArasaacResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const reset = () => {
    setView('menu');
    setPendingUri(null);
    setPendingUrl(null);
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

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      const b64 = await uriToBase64(result.assets[0].uri);
      setPendingUri(b64);
      setView('name');
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!result.canceled && result.assets[0]) {
      const b64 = await uriToBase64(result.assets[0].uri);
      setPendingUri(b64);
      setView('name');
    }
  };

  const searchArasaac = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearchError('');
    setResults([]);
    try {
      const res = await axios.get<ArasaacResult[]>(
        `https://api.arasaac.org/v1/pictograms/es/search/${encodeURIComponent(query.trim())}`
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
      text: item.keywords[0]?.keyword ?? 'pictograma',
      imageUrl: `https://static.arasaac.org/pictograms/${item._id}/${item._id}_500.png`,
      forbidden: false,
      addedAt: Date.now(),
    };
    onAdd(picto);
    close();
  };

  const confirmName = () => {
    if (!name.trim()) return;
    const picto: Pictogram = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: name.trim(),
      imageUrl: pendingUrl ?? undefined,
      localUri: pendingUri ?? undefined,
      isBase64: pendingUri !== null && pendingUrl === null,
      forbidden: false,
      addedAt: Date.now(),
    };
    onAdd(picto);
    close();
  };

  const selectMisPicto = (p: Pictogram) => {
    onAdd({
      ...p,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      forbidden: false,
      addedAt: Date.now(),
    });
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {view === 'menu' && (
            <>
              <Text style={styles.title}>
                Añadir a {period ? PERIOD_LABELS[period] : ''}
              </Text>
              <View style={styles.grid}>
                <TouchableOpacity style={styles.option} onPress={pickFromGallery}>
                  <Text style={styles.optionEmoji}>🖼️</Text>
                  <Text style={styles.optionText}>Galería</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.option} onPress={pickFromCamera}>
                  <Text style={styles.optionEmoji}>📷</Text>
                  <Text style={styles.optionText}>Cámara</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.option} onPress={() => setView('arasaac')}>
                  <Text style={styles.optionEmoji}>🔍</Text>
                  <Text style={styles.optionText}>ARASAAC</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.option} onPress={() => setView('mispictos')}>
                  <Text style={styles.optionEmoji}>⭐</Text>
                  <Text style={styles.optionText}>Mis pictos</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {view === 'name' && (
            <>
              <Text style={styles.title}>Nombre del pictograma</Text>
              {(pendingUri || pendingUrl) && (
                <Image
                  source={{ uri: pendingUri && !pendingUrl ? `data:image/jpeg;base64,${pendingUri}` : pendingUrl! }}
                  style={styles.preview}
                  resizeMode="contain"
                />
              )}
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Escribe un nombre"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.primaryButton, !name.trim() && styles.disabled]}
                onPress={confirmName}
                disabled={!name.trim()}
              >
                <Text style={styles.primaryButtonText}>Añadir</Text>
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
                  onSubmitEditing={searchArasaac}
                  returnKeyType="search"
                  autoFocus
                />
                <TouchableOpacity style={styles.searchButton} onPress={searchArasaac}>
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
            </>
          )}

          {view === 'mispictos' && (
            <>
              <Text style={styles.title}>Mis pictos</Text>
              {misPictos.length === 0 ? (
                <Text style={styles.empty}>Todavía no has guardado ningún pictograma</Text>
              ) : (
                <FlatList
                  data={misPictos}
                  keyExtractor={(item) => item.id}
                  numColumns={3}
                  style={styles.resultsList}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.resultItem} onPress={() => selectMisPicto(item)}>
                      <Image
                        source={{
                          uri: item.isBase64
                            ? `data:image/jpeg;base64,${item.localUri}`
                            : item.localUri ?? item.imageUrl,
                        }}
                        style={styles.resultImage}
                        resizeMode="contain"
                      />
                      <Text style={styles.resultText} numberOfLines={1}>
                        {item.text}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={view === 'menu' ? close : reset}>
            <Text style={styles.cancelText}>{view === 'menu' ? 'Cancelar' : 'Volver'}</Text>
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
    maxHeight: '85%',
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
    width: '48%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 12,
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
