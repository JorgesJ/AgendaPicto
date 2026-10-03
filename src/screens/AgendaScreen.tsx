import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useAgenda } from '../hooks/useAgenda';
import { useScale } from '../hooks/useScale';
import { COLORS, MESES, Period, PICTO_SIZES, Pictogram } from '../types';
import DateSelector from '../components/DateSelector';
import PeriodRow from '../components/PeriodRow';
import AddPictoModal from '../components/AddPictoModal';
import ConfirmDialog from '../components/ConfirmDialog';
import SettingsScreen from './SettingsScreen';

const PERIODS: { period: Period; label: string; emoji: string; color: string }[] = [
  { period: 'manana', label: 'Mañana', emoji: '☀️', color: COLORS.manana },
  { period: 'tarde', label: 'Tarde', emoji: '🌅', color: COLORS.tarde },
  { period: 'noche', label: 'Noche', emoji: '🌙', color: COLORS.noche },
];

export default function AgendaScreen() {
  const {
    day,
    month,
    year,
    agenda,
    selected,
    selectedPicto,
    settings,
    misPictos,
    changeDate,
    goToday,
    selectPicto,
    addPicto,
    removeSelected,
    toggleForbidden,
    clearDay,
    saveSettings,
  } = useAgenda();

  const { s, factor } = useScale();

  const [addPeriod, setAddPeriod] = useState<Period | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const pictoSize = Math.round(PICTO_SIZES[settings.pictoSize] * factor);
  const hasSelection = selected !== null && selectedPicto !== null;

  const pictoToImgSrc = async (p: Pictogram): Promise<string> => {
    if (p.imageUrl) return p.imageUrl;
    if (p.isBase64 && p.localUri) return `data:image/jpeg;base64,${p.localUri}`;
    if (p.localUri) {
      try {
        const b64 = await FileSystem.readAsStringAsync(p.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return `data:image/jpeg;base64,${b64}`;
      } catch {
        return '';
      }
    }
    return '';
  };

  const buildHtml = async (): Promise<string> => {
    const section = async (label: string, emoji: string, pictos: Pictogram[]) => {
      const cells = await Promise.all(
        pictos.map(async (p) => {
          const src = await pictoToImgSrc(p);
          return `
            <div style="display:inline-block;text-align:center;margin:8px;width:120px;vertical-align:top">
              <div style="position:relative;width:110px;height:110px;margin:0 auto;border:3px solid ${
                p.forbidden ? '#E53935' : '#ddd'
              };border-radius:10px;padding:4px">
                ${src ? `<img src="${src}" style="width:100%;height:100%;object-fit:contain"/>` : ''}
                ${
                  p.forbidden
                    ? '<span style="color:#E53935;font-size:80px;font-weight:900;position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center">✕</span>'
                    : ''
                }
              </div>
              <div style="font-size:14px;margin-top:4px">${p.text}</div>
            </div>`;
        })
      );
      return `<h2>${emoji} ${label}</h2><div>${cells.join('') || '<p style="color:#999">—</p>'}</div>`;
    };

    const manana = await section('Mañana', '☀️', agenda.manana);
    const tarde = await section('Tarde', '🌅', agenda.tarde);
    const noche = await section('Noche', '🌙', agenda.noche);

    return `
      <html><body style="font-family:Arial">
        <h1>Mi Agenda — ${day} de ${MESES[month - 1]} de ${year}</h1>
        ${manana}${tarde}${noche}
      </body></html>`;
  };

  const generatePdf = async (): Promise<string> => {
    const html = await buildHtml();
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  };

  const exportPdf = async () => {
    try {
      const uri = await generatePdf();
      const fileName = `agenda_${day}-${month}-${year}.pdf`;
      if (Platform.OS === 'android') {
        const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!perm.granted) return;
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
          perm.directoryUri,
          fileName,
          'application/pdf'
        );
        await FileSystem.writeAsStringAsync(destUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        Alert.alert('PDF guardado', `Se ha guardado ${fileName}`);
      } else {
        await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
      }
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF');
    }
  };

  const sharePdf = async () => {
    try {
      const uri = await generatePdf();
      await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
    } catch {
      Alert.alert('Error', 'No se pudo compartir el PDF');
    }
  };

  const headerPadH = s(16, 24);
  const headerPadV = s(12, 18);
  const headerFontSize = s(22, 30);
  const actionFontSize = s(14, 18);
  const actionPadV = s(10, 14);
  const helpFontSize = s(12, 16);
  const bottomEmojiFontSize = s(22, 32);
  const bottomTextFontSize = s(12, 16);
  const bottomPadH = s(20, 36);
  const bottomPadV = s(8, 14);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { paddingHorizontal: headerPadH, paddingVertical: headerPadV }]}>
        <Text style={[styles.headerTitle, { fontSize: headerFontSize }]}>📅 Mi Agenda</Text>
      </View>

      <View style={styles.headerBackground}>
        <DateSelector day={day} month={month} year={year} onChange={changeDate} />
      </View>

      <View style={[styles.actionsContainer, { paddingHorizontal: s(12, 20) }]}>
        <View style={[styles.actionsRow, { marginBottom: s(8, 12) }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.exportar, paddingVertical: actionPadV }]}
            onPress={exportPdf}
          >
            <Text style={[styles.actionText, { fontSize: actionFontSize }]}>📄 Exportar PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.borrar, paddingVertical: actionPadV }]}
            onPress={() => setShowClear(true)}
          >
            <Text style={[styles.actionText, { fontSize: actionFontSize }]}>🗑️ Borrar Agenda</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.actionsRow, { marginBottom: s(8, 12) }]}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: hasSelection ? COLORS.prohibir : '#bdbdbd', paddingVertical: actionPadV },
            ]}
            onPress={toggleForbidden}
            disabled={!hasSelection}
          >
            <Text style={[styles.actionText, { fontSize: actionFontSize }]}>✕ Prohibir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: hasSelection ? COLORS.eliminar : '#bdbdbd', paddingVertical: actionPadV },
            ]}
            onPress={() => setShowDelete(true)}
            disabled={!hasSelection}
          >
            <Text style={[styles.actionText, { fontSize: actionFontSize }]}>🗑 Eliminar</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.helpText, { fontSize: helpFontSize, marginBottom: s(6, 10) }]}>
          {hasSelection
            ? `Seleccionado: '${selectedPicto!.text}'`
            : 'Toca un pictograma para seleccionarlo'}
        </Text>
      </View>

      <ScrollView style={styles.periods}>
        {PERIODS.map(({ period, label, emoji, color }) => (
          <PeriodRow
            key={period}
            period={period}
            label={label}
            emoji={emoji}
            color={color}
            pictos={agenda[period]}
            pictoSize={pictoSize}
            selectedId={selected?.period === period ? selected.id : null}
            onSelect={(p) => selectPicto(period, p)}
            onAdd={() => setAddPeriod(period)}
          />
        ))}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingVertical: bottomPadV }]}>
        <TouchableOpacity style={[styles.bottomButton, { paddingHorizontal: bottomPadH }]} onPress={goToday}>
          <Text style={[styles.bottomEmoji, { fontSize: bottomEmojiFontSize }]}>📅</Text>
          <Text style={[styles.bottomText, { fontSize: bottomTextFontSize }]}>Hoy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomButton, { paddingHorizontal: bottomPadH }]} onPress={sharePdf}>
          <Text style={[styles.bottomEmoji, { fontSize: bottomEmojiFontSize }]}>📤</Text>
          <Text style={[styles.bottomText, { fontSize: bottomTextFontSize }]}>Compartir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomButton, { paddingHorizontal: bottomPadH }]} onPress={() => setShowSettings(true)}>
          <Text style={[styles.bottomEmoji, { fontSize: bottomEmojiFontSize }]}>⚙️</Text>
          <Text style={[styles.bottomText, { fontSize: bottomTextFontSize }]}>Ajustes</Text>
        </TouchableOpacity>
      </View>

      <AddPictoModal
        visible={addPeriod !== null}
        period={addPeriod}
        misPictos={misPictos}
        onClose={() => setAddPeriod(null)}
        onAdd={(picto) => {
          if (addPeriod) addPicto(addPeriod, picto);
        }}
      />

      <ConfirmDialog
        visible={showDelete}
        title="Eliminar pictograma"
        message={`¿Eliminar ${selectedPicto?.text ?? ''}?`}
        onCancel={() => setShowDelete(false)}
        onConfirm={() => {
          setShowDelete(false);
          removeSelected();
        }}
      />

      <ConfirmDialog
        visible={showClear}
        title="Borrar Agenda"
        message={`¿Borrar todos los pictogramas del ${day} de ${MESES[month - 1]}?`}
        confirmText="Sí, borrar"
        onCancel={() => setShowClear(false)}
        onConfirm={() => {
          setShowClear(false);
          clearDay();
        }}
      />

      <SettingsScreen
        visible={showSettings}
        settings={settings}
        onSave={saveSettings}
        onClose={() => setShowSettings(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  headerBackground: {
    backgroundColor: COLORS.primary,
  },
  actionsContainer: {
    backgroundColor: COLORS.fondo,
    paddingTop: 10,
    paddingBottom: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  helpText: {
    color: '#777',
    textAlign: 'center',
  },
  periods: {
    flex: 1,
    backgroundColor: COLORS.fondo,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  bottomButton: {
    alignItems: 'center',
  },
  bottomEmoji: {},
  bottomText: {
    color: '#555',
    fontWeight: 'bold',
  },
});
