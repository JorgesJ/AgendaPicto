import { useWindowDimensions } from 'react-native';
import { useLayoutSize } from '../layoutSize';

export function useScale() {
  const win = useWindowDimensions();
  const measured = useLayoutSize();
  const width = measured ? measured.width : win.width;
  const height = measured ? measured.height : win.height;
  const shorter = Math.min(width, height);
  const longer = Math.max(width, height);
  const isTablet = shorter >= 600;
  const isLandscape = width > height;
  const factor = isTablet ? Math.max(0.75, Math.min(shorter / 600, height / 900, 1.6)) : 1;

  const s = (phone: number, tablet?: number): number => {
    const base = tablet !== undefined && isTablet ? tablet : phone;
    if (!isTablet) return base;
    return Math.round(base * factor);
  };

  return { width, height, shorter, longer, isTablet, isLandscape, factor, s };
}
