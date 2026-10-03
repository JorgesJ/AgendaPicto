import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { AgendaDay, Period, Pictogram, Settings } from '../types';
import { getExpiryMessage, onRestored } from '../backup';

const EMPTY_DAY: AgendaDay = { manana: [], tarde: [], noche: [] };
const DEFAULT_SETTINGS: Settings = { pictoSize: 'normal', ttsLang: 'es-ES', ttsRate: 1.0 };
const KEY_MIS_PICTOS = '@mis_pictos';
const KEY_SETTINGS = '@agenda_settings';

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function useAgenda() {
  const now = new Date();
  const [day, setDay] = useState(now.getDate());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [agenda, setAgenda] = useState<AgendaDay>(EMPTY_DAY);
  const [selected, setSelected] = useState<{ period: Period; id: string } | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [misPictos, setMisPictos] = useState<Pictogram[]>([]);

  const dateKey = `@agenda_${day}-${month}-${year}`;

  useEffect(() => {
    (async () => {
      const s = await AsyncStorage.getItem(KEY_SETTINGS);
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) });
      const mp = await AsyncStorage.getItem(KEY_MIS_PICTOS);
      if (mp) setMisPictos(JSON.parse(mp));
      const expiryMsg = await getExpiryMessage();
      if (expiryMsg) Alert.alert('Aviso', expiryMsg);
    })();
  }, []);

  useEffect(() => {
    return onRestored(() => {
      (async () => {
        const s = await AsyncStorage.getItem(KEY_SETTINGS);
        setSettings(s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS);
        const mp = await AsyncStorage.getItem(KEY_MIS_PICTOS);
        setMisPictos(mp ? JSON.parse(mp) : []);
        const raw = await AsyncStorage.getItem(dateKey);
        setAgenda(raw ? JSON.parse(raw) : EMPTY_DAY);
        setSelected(null);
      })();
    });
  }, [dateKey]);

  useEffect(() => {
    setSelected(null);
    (async () => {
      const raw = await AsyncStorage.getItem(dateKey);
      setAgenda(raw ? JSON.parse(raw) : EMPTY_DAY);
    })();
  }, [dateKey]);

  const persist = useCallback(
    async (next: AgendaDay) => {
      setAgenda(next);
      await AsyncStorage.setItem(dateKey, JSON.stringify(next));
    },
    [dateKey]
  );

  const changeDate = useCallback(
    (part: 'day' | 'month' | 'year', delta: number) => {
      if (part === 'day') {
        const max = daysInMonth(month, year);
        setDay((d) => ((d - 1 + delta + max) % max) + 1);
      } else if (part === 'month') {
        const newMonth = ((month - 1 + delta + 12) % 12) + 1;
        setMonth(newMonth);
        const max = daysInMonth(newMonth, year);
        if (day > max) setDay(max);
      } else {
        const newYear = year + delta;
        setYear(newYear);
        const max = daysInMonth(month, newYear);
        if (day > max) setDay(max);
      }
    },
    [day, month, year]
  );

  const goToday = useCallback(() => {
    const t = new Date();
    setDay(t.getDate());
    setMonth(t.getMonth() + 1);
    setYear(t.getFullYear());
  }, []);

  const speak = useCallback(
    (picto: Pictogram) => {
      const text = picto.forbidden ? `prohibido ${picto.text}` : picto.text;
      Speech.stop();
      Speech.speak(text, { language: settings.ttsLang, rate: settings.ttsRate });
    },
    [settings]
  );

  const selectPicto = useCallback(
    (period: Period, picto: Pictogram) => {
      if (selected && selected.period === period && selected.id === picto.id) {
        setSelected(null);
      } else {
        setSelected({ period, id: picto.id });
        speak(picto);
      }
    },
    [selected, speak]
  );

  const addPicto = useCallback(
    async (period: Period, picto: Pictogram) => {
      const next = { ...agenda, [period]: [...agenda[period], picto] };
      await persist(next);
      const exists = misPictos.some(
        (p) => p.text === picto.text && p.imageUrl === picto.imageUrl && p.localUri === picto.localUri
      );
      if (!exists) {
        const updated = [...misPictos, { ...picto, forbidden: false }];
        setMisPictos(updated);
        await AsyncStorage.setItem(KEY_MIS_PICTOS, JSON.stringify(updated));
      }
    },
    [agenda, misPictos, persist]
  );

  const removeSelected = useCallback(async () => {
    if (!selected) return;
    const next = {
      ...agenda,
      [selected.period]: agenda[selected.period].filter((p) => p.id !== selected.id),
    };
    setSelected(null);
    await persist(next);
  }, [agenda, selected, persist]);

  const toggleForbidden = useCallback(async () => {
    if (!selected) return;
    const next = {
      ...agenda,
      [selected.period]: agenda[selected.period].map((p) =>
        p.id === selected.id ? { ...p, forbidden: !p.forbidden } : p
      ),
    };
    await persist(next);
    const picto = next[selected.period].find((p) => p.id === selected.id);
    if (picto) speak(picto);
  }, [agenda, selected, persist, speak]);

  const clearDay = useCallback(async () => {
    setSelected(null);
    await persist(EMPTY_DAY);
  }, [persist]);

  const saveSettings = useCallback(async (next: Settings) => {
    setSettings(next);
    await AsyncStorage.setItem(KEY_SETTINGS, JSON.stringify(next));
  }, []);

  const selectedPicto: Pictogram | null = selected
    ? agenda[selected.period].find((p) => p.id === selected.id) ?? null
    : null;

  return {
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
  };
}
