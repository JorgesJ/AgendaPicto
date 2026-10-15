import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, MESES } from '../types';
import { useScale } from '../hooks/useScale';

interface Props {
  day: number;
  month: number;
  year: number;
  onChange: (part: 'day' | 'month' | 'year', delta: number) => void;
  height?: number;
}

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function Arrow({ dir, onPress, size, margin = 2 }: { dir: 'up' | 'down'; onPress: () => void; size: number; margin?: number }) {
  return (
    <TouchableOpacity
      style={[styles.arrow, { width: size, height: size, borderRadius: size / 2, marginVertical: margin }]}
      onPress={onPress}
    >
      <Text style={[styles.arrowText, { fontSize: size * 0.4 }]}>{dir === 'up' ? '▲' : '▼'}</Text>
    </TouchableOpacity>
  );
}

export default function DateSelector({ day, month, year, onChange, height }: Props) {
  const { s } = useScale();
  const h = height ?? 150;
  const am = 2;
  const arrowSize = Math.max(22, Math.min(44, Math.floor((h - 16) / 3.4)));
  const boxH = Math.max(28, Math.min(100, h - 8 - 2 * (arrowSize + 2 * am)));
  const numFont = Math.round(boxH * 0.5);
  const labelFont = Math.round(boxH * 0.34);
  const deFont = Math.round(Math.max(12, boxH * 0.3));
  const nameFont = Math.max(12, Math.min(26, Math.round((h - 8) * 0.2)));
  const cellMaxH = Math.max(14, h - 8 - Math.round(nameFont * 1.3) - 12);
  const weekday = new Date(year, month - 1, day).getDay();
  const todayIdx = (weekday + 6) % 7;

  return (
    <View style={[styles.card, { height: h, marginHorizontal: s(12, 20) }]}>
      <View style={[styles.calendar, { flex: 2.2 }]}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.dayName, { fontSize: nameFont }]}>
          {DIAS_SEMANA[weekday]}
        </Text>
        <View style={styles.weekRow}>
          {LETRAS.map((letter, i) => (
            <View key={letter + i} style={[styles.cell, { maxHeight: cellMaxH }, i === todayIdx && styles.cellOn]}>
              <Text style={[styles.cellText, i === todayIdx && styles.cellTextOn]}>{letter}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.column, { flex: 1 }]}>
        <Arrow dir="up" onPress={() => onChange('day', 1)} size={arrowSize} margin={am} />
        <View style={[styles.circle, { width: boxH, height: boxH, borderRadius: boxH / 2 }]}>
          <Text style={[styles.dayNumber, { fontSize: numFont }]}>{day}</Text>
        </View>
        <Arrow dir="down" onPress={() => onChange('day', -1)} size={arrowSize} margin={am} />
      </View>

      <Text style={[styles.de, { flex: 0.45, fontSize: deFont }]}>DE</Text>

      <View style={[styles.column, { flex: 1.8 }]}>
        <Arrow dir="up" onPress={() => onChange('month', 1)} size={arrowSize} margin={am} />
        <View style={[styles.box, { height: boxH }]}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.boxText, { fontSize: labelFont }]}>
            {MESES[month - 1].toUpperCase()}
          </Text>
        </View>
        <Arrow dir="down" onPress={() => onChange('month', -1)} size={arrowSize} margin={am} />
      </View>

      <Text style={[styles.de, { flex: 0.45, fontSize: deFont }]}>DE</Text>

      <View style={[styles.column, { flex: 1.3 }]}>
        <Arrow dir="up" onPress={() => onChange('year', 1)} size={arrowSize} margin={am} />
        <View style={[styles.box, { height: boxH }]}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.boxText, { fontSize: numFont }]}>
            {year}
          </Text>
        </View>
        <Arrow dir="down" onPress={() => onChange('year', -1)} size={arrowSize} margin={am} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  calendar: {
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: '#555',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 6,
    backgroundColor: '#fff',
  },
  dayName: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#333',
    marginBottom: 4,
  },
  weekRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: 1,
    borderWidth: 1,
    borderColor: '#888',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellOn: {
    backgroundColor: '#cddc39',
    borderColor: '#7a8a00',
  },
  cellText: {
    fontSize: 12,
    color: '#333',
  },
  cellTextOn: {
    fontWeight: 'bold',
    color: '#111',
  },
  column: {
    alignItems: 'center',
  },
  arrow: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  circle: {
    borderWidth: 1.5,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontWeight: 'bold',
    color: '#1a56c4',
  },
  box: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#333',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  boxText: {
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  de: {
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
  },
});
