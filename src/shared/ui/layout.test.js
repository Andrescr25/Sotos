/**
 * Componentes compartidos de diseño: lo que hacen con espacio de sobra y lo que
 * cambian cuando la pantalla es compacta (teléfono o poca altura). Se fija el
 * tamaño de la ventana con `computeLayout` para no depender del dispositivo.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { PageHeader } from '@/features/workspace/components/PageHeader';
import { computeLayout, useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { Callout, ChipRow, Column, Columns, DataRow, IconButton, ListRow, SheetActions, Tabs, Text } from '@/shared/ui';

jest.mock('@/shared/hooks/useResponsiveLayout', () => ({
  ...jest.requireActual('@/shared/hooks/useResponsiveLayout'),
  useResponsiveLayout: jest.fn(),
}));

const TABLET = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
const SHORT_WIDE = { width: 1280, height: 554 };

const setWindow = ({ width, height }) =>
  useResponsiveLayout.mockReturnValue(computeLayout({ width, height, fontScale: 1 }));

const flat = (element) => StyleSheet.flatten(element.props.style) ?? {};
const hasScroller = () => JSON.stringify(screen.toJSON()).includes('RCTScrollView');

beforeEach(() => setWindow(TABLET));

describe('acciones del pie de un modal', () => {
  const actions = () => ({
    primary: { label: 'Guardar', onPress: jest.fn() },
    secondary: { label: 'Cancelar', onPress: jest.fn() },
  });

  it('con espacio van una debajo de la otra', async () => {
    await render(<SheetActions {...actions()} />);
    const container = screen.getByRole('button', { name: 'Guardar' }).parent;

    expect(flat(container).flexDirection).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy();
  });

  it.each([['teléfono', PHONE], ['poca altura', SHORT_WIDE]])('en %s van lado a lado, con la principal a la derecha', async (_name, size) => {
    setWindow(size);
    await render(<SheetActions {...actions()} />);
    const container = screen.getByRole('button', { name: 'Guardar' }).parent;

    expect(flat(container)).toMatchObject({ flexDirection: 'row-reverse', flexWrap: 'wrap' });
  });

  it('las dos acciones funcionan en cualquier tamaño', async () => {
    for (const size of [TABLET, PHONE]) {
      setWindow(size);
      const { primary, secondary } = actions();
      const view = await render(<SheetActions primary={primary} secondary={secondary} />);
      await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
      expect(primary.onPress).toHaveBeenCalledTimes(1);
      expect(secondary.onPress).toHaveBeenCalledTimes(1);
      await view.unmount();
    }
  });

  it('sin acción secundaria solo muestra la principal', async () => {
    setWindow(PHONE);
    await render(<SheetActions primary={{ label: 'Listo', onPress: jest.fn() }} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('una acción deshabilitada no se activa', async () => {
    const onPress = jest.fn();
    await render(<SheetActions primary={{ label: 'Guardar', onPress, disabled: true }} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('cabecera de página', () => {
  const header = (props) => render(<PageHeader title="Menú" subtitle="Lo que servimos" onBack={jest.fn()} {...props} />);

  it('con espacio muestra "Volver" con texto y la explicación', async () => {
    await header();
    expect(screen.getByText('Volver')).toBeTruthy();
    expect(screen.getByText('Lo que servimos')).toBeTruthy();
  });

  it('en teléfono "Volver" es un botón de icono junto al título, y sigue teniendo nombre accesible', async () => {
    setWindow(PHONE);
    await header();
    expect(screen.queryByText('Volver')).toBeNull();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeTruthy();
    expect(screen.getByText('Lo que servimos')).toBeTruthy(); // 844 de alto: todavía hay espacio para la explicación
  });

  it('con muy poca altura se omite la explicación', async () => {
    setWindow(SHORT_WIDE);
    await header();
    expect(screen.queryByText('Lo que servimos')).toBeNull();
    expect(screen.getByText('Menú')).toBeTruthy(); // el título nunca se omite
  });

  it('sin "onBack" no hay botón de volver, y las acciones se muestran', async () => {
    await header({ onBack: undefined, actions: <Text>Acción</Text> });
    expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
    expect(screen.getByText('Acción')).toBeTruthy();
  });

  it('"Volver" avisa a la pantalla', async () => {
    const onBack = jest.fn();
    await header({ onBack });
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('aviso destacado', () => {
  it('con espacio centra la cifra bajo su explicación', async () => {
    await render(<Callout tone="success" caption="Vuelto para el cliente" value="₡1.500" />);
    const container = screen.getByText('₡1.500').parent;

    expect(flat(container).flexDirection).toBeUndefined();
    expect(screen.getByText('Vuelto para el cliente')).toBeTruthy();
  });

  it('compacto pone la explicación a la izquierda y la cifra a la derecha, en una fila', async () => {
    setWindow(PHONE);
    await render(<Callout tone="danger" title="Pedido de Ana" caption="Falta" value="₡900" />);

    expect(flat(screen.getByText('₡900').parent)).toMatchObject({ flexDirection: 'row', justifyContent: 'space-between' });
    expect(screen.getByText('Pedido de Ana')).toBeTruthy();
    expect(screen.getByText('Falta')).toBeTruthy();
  });
});

describe('tira de chips', () => {
  const chips = () => <ChipRow><Text>uno</Text><Text>dos</Text></ChipRow>;

  it('con espacio se acomodan en varias líneas', async () => {
    await render(chips());
    expect(hasScroller()).toBe(false);
  });

  it('en teléfono forman una tira que se desliza de lado', async () => {
    setWindow(PHONE);
    await render(chips());
    expect(hasScroller()).toBe(true);
  });

  it('"always" siempre desliza (categorías de Caja)', async () => {
    await render(<ChipRow scroll="always"><Text>uno</Text></ChipRow>);
    expect(hasScroller()).toBe(true);
  });
});

describe('pestañas', () => {
  it('marcan la activa y avisan la que se toca', async () => {
    const onChange = jest.fn();
    await render(<Tabs tabs={[{ key: 'a', label: 'Insumos' }, { key: 'b', label: 'Recetas' }]} value="a" onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Insumos' }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByRole('button', { name: 'Recetas' }).props.accessibilityState.selected).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Recetas' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('columnas', () => {
  const layout = (props) => (
    <Columns testID="columns" {...props}>
      <Column testID="flexible"><Text>a</Text></Column>
      <Column testID="fija" width={360}><Text>b</Text></Column>
    </Columns>
  );

  it('con espacio van lado a lado: una reparte el sobrante y la otra mide lo que se le pide', async () => {
    await render(layout({ wide: true }));

    expect(flat(screen.getByTestId('columns')).flexDirection).toBe('row');
    expect(flat(screen.getByTestId('flexible')).flex).toBe(1);
    expect(flat(screen.getByTestId('fija'))).toMatchObject({ width: 360, flexGrow: 0, flexShrink: 0 });
    expect(flat(screen.getByTestId('fija')).flex).toBeUndefined(); // `flex-basis` pisaría al ancho
  });

  it('sin espacio se apilan, y ninguna se encoge a cero por heredar `flex`', async () => {
    await render(layout({ wide: false }));

    expect(flat(screen.getByTestId('columns')).flexDirection).toBeUndefined();
    expect(flat(screen.getByTestId('flexible')).flex).toBeUndefined();
    expect(flat(screen.getByTestId('fija')).width).toBeUndefined();
  });

  it('"fill" hace que las columnas llenen la altura (cada una se desplaza por dentro)', async () => {
    await render(layout({ wide: true, fill: true }));
    expect(flat(screen.getByTestId('columns'))).toMatchObject({ flex: 1, alignItems: 'stretch' });
  });
});

describe('fila de lista', () => {
  it('muestra título, datos, cifra, bloque lateral y controles', async () => {
    await render(
      <ListRow title="Papas" subtitle="8 porciones por paquete" detail="Sin receta" value="₡1.500" aside={<Text>3 paquetes</Text>}>
        <Text>controles</Text>
      </ListRow>,
    );

    ['Papas', '8 porciones por paquete', 'Sin receta', '₡1.500', '3 paquetes', 'controles'].forEach((text) =>
      expect(screen.getByText(text)).toBeTruthy(),
    );
  });

  it('sin cifra, bloque ni controles no deja huecos', async () => {
    await render(<ListRow title="Papas" />);
    expect(screen.getByText('Papas')).toBeTruthy();
    expect(screen.toJSON().children).toHaveLength(1); // solo la identidad
  });
});

describe('dato y valor / botón de icono', () => {
  it('DataRow muestra la etiqueta y el valor', async () => {
    await render(<DataRow label="Recibido" value="₡10.000" />);
    expect(screen.getByText('Recibido')).toBeTruthy();
    expect(screen.getByText('₡10.000')).toBeTruthy();
  });

  it('IconButton tiene nombre accesible y respeta "disabled"', async () => {
    const onPress = jest.fn();
    await render(<IconButton icon="trash" label="Quitar Papas" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Quitar Papas' }));
    expect(onPress).toHaveBeenCalledTimes(1);

    const blocked = jest.fn();
    await render(<IconButton icon="trash" label="Quitar Sal" disabled onPress={blocked} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Quitar Sal' }));
    expect(blocked).not.toHaveBeenCalled();
  });
});
