import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, Pictogram } from '../types';

const LONG_PRESS_MS = 3000;
const MOVING_COLOR = '#00c853';

interface Props {
  picto: Pictogram;
  size: number;
  selected: boolean;
  moving?: boolean;
  target?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function PictoCard({ picto, size, selected, moving = false, target = false, onPress, onLongPress }: Props) {
  const wiggle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!moving) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wiggle, { toValue: 1, duration: 120, useNativeDriver: false }),
        Animated.timing(wiggle, { toValue: -1, duration: 120, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      wiggle.setValue(0);
    };
  }, [moving, wiggle]);

  const rotate = wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-2.5deg', '2.5deg'] });

  const uri = picto.isBase64
    ? `data:image/jpeg;base64,${picto.localUri}`
    : picto.localUri ?? picto.imageUrl;

  const borderColor = picto.forbidden
    ? COLORS.prohibicion
    : moving || target
    ? MOVING_COLOR
    : selected
    ? COLORS.primary
    : '#ddd';

  return (
    <Animated.View style={{ marginRight: 8, transform: [{ rotate }] }}>
    <TouchableOpacity
      style={[
        styles.card,
        { borderColor },
        target && !picto.forbidden && styles.target,
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 3,
    padding: 6,
    alignItems: 'center',
  },
  target: {
    borderStyle: 'dashed',
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
