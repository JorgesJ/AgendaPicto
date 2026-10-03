import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, Period, Pictogram } from '../types';
import { useScale } from '../hooks/useScale';
import PictoCard from './PictoCard';

interface Props {
  period: Period;
  label: string;
  emoji: string;
  color: string;
  pictos: Pictogram[];
  pictoSize: number;
  selectedId: string | null;
  onSelect: (picto: Pictogram) => void;
  onAdd: () => void;
}

export default function PeriodRow({
  label,
  emoji,
  color,
  pictos,
  pictoSize,
  selectedId,
  onSelect,
  onAdd,
}: Props) {
  const { s } = useScale();
  const scrollRef = useRef<ScrollView>(null);
  const prevCount = useRef(pictos.length);

  useEffect(() => {
    if (pictos.length > prevCount.current) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    prevCount.current = pictos.length;
  }, [pictos.length]);

  const iconWidth = s(64, 90);
  const emojiFontSize = s(28, 40);
  const labelFontSize = s(12, 16);
  const addButtonSize = s(44, 60);
  const minHeight = s(100, 140);
  const padding = s(8, 14);
  const marginH = s(8, 14);
  const marginV = s(4, 8);

  return (
    <View style={[
      styles.row,
      {
        backgroundColor: color,
        minHeight,
        padding,
        marginHorizontal: marginH,
        marginVertical: marginV,
      }
    ]}>
      <View style={[styles.fixedIcon, { width: iconWidth }]}>
        <Text style={[styles.emoji, { fontSize: emojiFontSize }]}>{emoji}</Text>
        <Text style={[styles.label, { fontSize: labelFontSize }]}>{label}</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
      >
        {pictos.map((p) => (
          <PictoCard
            key={p.id}
            picto={p}
            size={pictoSize}
            selected={p.id === selectedId}
            onPress={() => onSelect(p)}
          />
        ))}
      </ScrollView>
      <TouchableOpacity
        style={[styles.addButton, { width: addButtonSize, height: addButtonSize, borderRadius: addButtonSize / 2 }]}
        onPress={onAdd}
      >
        <Text style={[styles.addText, { fontSize: s(26, 36) }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  fixedIcon: {
    alignItems: 'center',
    marginRight: 4,
  },
  emoji: {},
  label: {
    fontWeight: 'bold',
    color: '#555',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  addText: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: -2,
  },
});
