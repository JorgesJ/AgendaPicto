import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, MESES } from '../types';
import { useScale } from '../hooks/useScale';

interface Props {
  day: number;
  month: number;
  year: number;
  onChange: (part: 'day' | 'month' | 'year', delta: number) => void;
}

function Arrow({ dir, onPress, size }: { dir: 'up' | 'down'; onPress: () => void; size: number }) {
  return (
    <TouchableOpacity
      style={[styles.arrow, { width: size, height: size, borderRadius: size / 2 }]}
      onPress={onPress}
    >
      <Text style={[styles.arrowText, { fontSize: size * 0.4 }]}>{dir === 'up' ? '▲' : '▼'}</Text>
    </TouchableOpacity>
  );
}

export default function DateSelector({ day, month, year, onChange }: Props) {
  const { s } = useScale();
  const arrowSize = s(36, 52);
  const valueFontSize = s(18, 26);
  const marginV = s(4, 8);

  return (
    <View style={[styles.card, { paddingVertical: s(10, 16), marginHorizontal: s(12, 20), marginBottom: s(12, 16) }]}>
      <View style={styles.column}>
        <Arrow dir="up" onPress={() => onChange('day', 1)} size={arrowSize} />
        <Text style={[styles.value, { fontSize: valueFontSize, marginVertical: marginV }]}>{day}</Text>
        <Arrow dir="down" onPress={() => onChange('day', -1)} size={arrowSize} />
      </View>
      <View style={styles.column}>
        <Arrow dir="up" onPress={() => onChange('month', 1)} size={arrowSize} />
        <Text style={[styles.value, { fontSize: valueFontSize, marginVertical: marginV }]}>{MESES[month - 1]}</Text>
        <Arrow dir="down" onPress={() => onChange('month', -1)} size={arrowSize} />
      </View>
      <View style={styles.column}>
        <Arrow dir="up" onPress={() => onChange('year', 1)} size={arrowSize} />
        <Text style={[styles.value, { fontSize: valueFontSize, marginVertical: marginV }]}>{year}</Text>
        <Arrow dir="down" onPress={() => onChange('year', -1)} size={arrowSize} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'space-around',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  column: {
    alignItems: 'center',
    flex: 1,
  },
  arrow: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  arrowText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  value: {
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
});
