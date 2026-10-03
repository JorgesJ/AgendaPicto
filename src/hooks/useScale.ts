import { useWindowDimensions } from 'react-native';

export function useScale() {
  const { width, height } = useWindowDimensions();
  const shorter = Math.min(width, height);
  const longer = Math.max(width, height);
  const isTablet = shorter >= 600;
  const isLandscape = width > height;

  const s = (phone: number, tablet?: number): number => {
    const base = tablet !== undefined && isTablet ? tablet : phone;
    if (!isTablet) return base;
    const factor = Math.min(shorter / 600, 1.6);
    return Math.round(base * factor);
  };

  return { width, height, shorter, longer, isTablet, isLandscape, s };
}
