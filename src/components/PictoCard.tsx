import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, Pictogram } from '../types';

const LONG_PRESS_MS = 3000;
const MOVING_COLOR = '#00c853';

interface Props {
  picto: Pictogram;
  size: number;
  selected: boolean;
  moving?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function PictoCard({ picto, size, selected, moving = false, onPress, onLongPress }: Props) {
  const uri = picto.isBase64
    ? `data:image/jpeg;base64,${picto.localUri}`
    : picto.localUri ?? picto.imageUrl;

  const borderColor = picto.forbidden
    ? COLORS.prohibicion
    : moving
    ? MOVING_COLOR
    : selected
    ? COLORS.primary
    : '#ddd';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderColor },
        selected && styles.selected,
        moving && styles.moving,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={LONG_PRESS_MS}
      activeOpacity={0.7}
    >
      <View style={{ width: size, height: size }}>
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
        {picto.forbidden && (
          <View style={styles.forbiddenOverlay}>
            <Text style={[styles.forbiddenX, { fontSize: size * 0.85 }]}>✕</Text>
          </View>
        )}
      </View>
      <Text style={[styles.label, { maxWidth: Math.max(90, size + 12) }]} numberOfLines={1}>
        {picto.text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 3,
    padding: 6,
    marginRight: 8,
    alignItems: 'center',
  },
  selected: {
    transform: [{ scale: 1.05 }],
  },
  moving: {
    transform: [{ scale: 1.1 }],
    backgroundColor: '#e8f5e9',
    elevation: 6,
    shadowColor: MOVING_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  forbiddenOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forbiddenX: {
    color: COLORS.prohibicion,
    fontWeight: '900',
  },
  label: {
    fontSize: 11,
    color: '#333',
    marginTop: 2,
    maxWidth: 90,
    textAlign: 'center',
  },
});
