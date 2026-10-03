import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, Pictogram } from '../types';

interface Props {
  picto: Pictogram;
  size: number;
  selected: boolean;
  onPress: () => void;
}

export default function PictoCard({ picto, size, selected, onPress }: Props) {
  const uri = picto.isBase64
    ? `data:image/jpeg;base64,${picto.localUri}`
    : picto.localUri ?? picto.imageUrl;

  const borderColor = picto.forbidden
    ? COLORS.prohibicion
    : selected
    ? COLORS.primary
    : '#ddd';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderColor },
        selected && styles.selected,
      ]}
      onPress={onPress}
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
      <Text style={styles.label} numberOfLines={1}>
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
