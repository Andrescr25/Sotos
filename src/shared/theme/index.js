import { colors } from './colors';
import { shadows } from './shadows';
import { sizes } from './sizes';
import { radius, spacing } from './spacing';
import { fontSizes, fontWeights } from './typography';
import { auth } from './auth';
import { layout } from './layout';
import { printing } from './printing';

/**
 * Único punto de entrada de los tokens de diseño:
 *   import { theme } from '@/shared/theme';
 */
export const theme = {
  colors,
  spacing,
  radius,
  fontSizes,
  fontWeights,
  sizes,
  shadows,
  auth,
  layout,
  printing,
};
