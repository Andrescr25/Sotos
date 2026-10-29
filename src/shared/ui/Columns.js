import { createContext, useContext } from 'react';
import { View } from 'react-native';
import { styles } from '@/shared/styles/components/columns';

const WideContext = createContext({ wide: false, fill: false });

/**
 * Diseño de columnas que se adapta solo: con espacio (`wide`) van lado a lado;
 * si no, una debajo de otra. Cada pantalla decide cuándo es `wide` con
 * `useResponsiveLayout` (split / board), así el umbral vive en un solo lugar.
 *
 * - `fill`: las columnas ocupan toda la altura y cada una se desplaza por dentro
 *   (Caja). Sin `fill`, la página completa se desplaza (Cierre de caja).
 *
 * @param {Object} props
 * @param {boolean} props.wide
 * @param {boolean} [props.fill]
 * @param {import('react').ReactNode} props.children  uno o varios <Column>
 */
export function Columns({ wide, fill = false, children, style, ...viewProps }) {
  return (
    <WideContext.Provider value={{ wide, fill }}>
      <View style={[wide ? [styles.wide, fill && styles.wideFill] : styles.stacked, style]} {...viewProps}>{children}</View>
    </WideContext.Provider>
  );
}

/**
 * Una columna. Con `width` mide siempre eso (el panel del pedido); sin él se
 * reparte el espacio sobrante. Apilada, ocupa el ancho completo.
 *
 * @param {Object} props
 * @param {number} [props.width]
 */
export function Column({ width, children, style, ...viewProps }) {
  const { wide, fill } = useContext(WideContext);
  return (
    <View style={[wide ? [width ? styles.columnFixed : styles.column, fill && styles.columnFill, width ? { width } : null] : styles.stackedColumn, style]} {...viewProps}>
      {children}
    </View>
  );
}
