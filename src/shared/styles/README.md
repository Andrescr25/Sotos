# Estilos de Soto’s

La identidad visual usa los tokens de `shared/theme`: rojo y crema de la marca,
colores semánticos, espaciado, tipografía, radios, tamaños táctiles y umbrales de
layout. Cambia estos tokens para ajustar toda la aplicación.

```text
shared/styles/
├── commonStyles.js     Patrones reutilizables: tarjetas, filas, grupos, chips
├── components/         Estilos de controles, tarjetas y formularios
├── layout/             Marco y navegación del espacio de trabajo
├── screens/            Composición específica de cada pantalla interna
├── print/              CSS del documento térmico separado de Caja
├── web/global.css      Base del navegador: raíz, foco, selección, scroll
├── GlobalStyles.web.js Variables CSS generadas desde los tokens de color
└── GlobalStyles.js     Entrada nativa; los estilos se aplican con StyleSheet
```

Los componentes importan sus estilos desde esta carpeta. Para repetir un patrón,
combina `commonStyles` con los estilos propios o crea un componente en `shared/ui`.
Las pantallas internas comparten `features/workspace/components/WorkspaceScreen`,
que también filtra la navegación con los permisos del usuario.

## Componentes compartidos de diseño (`shared/ui`)

Antes de escribir un estilo nuevo, busca aquí: cada pieza ya se adapta sola al
tamaño de la pantalla. Un cambio de diseño se hace **una vez**, en el componente.

| Necesito… | Uso |
|---|---|
| Una fila de lista con icono, datos, cifra y controles (menú, inventario, cierres) | `ListRow` |
| Dato a la izquierda y valor a la derecha (resúmenes, cuadres, totales) | `DataRow` |
| Cifra destacada con su explicación (total, vuelto, "falta", si cuadra) | `Callout` |
| Botón cuadrado solo con icono (editar, quitar, cerrar, salir) | `IconButton` |
| Pestañas de una pantalla | `Tabs` |
| Filtros o categorías en chips | `ChipRow` |
| Explicación + botón sobre una lista | `Toolbar` |
| Dos paneles lado a lado que se apilan si no caben | `Columns` + `Column` |
| Estado vacío (con o sin tarjeta) | `EmptyState` |
| Un modal con pie de acciones | `Sheet` con `primaryAction` y `secondaryAction` |
| Aviso en línea (error, éxito, información) | `Banner` |

## Cómo se adapta el diseño

`useResponsiveLayout` calcula el espacio útil considerando el tamaño del texto
(`computeLayout` es la misma lógica como función pura, con pruebas) y devuelve:

| Bandera | Cuándo | Qué cambia |
|---|---|---|
| `mobile` | ancho < 600 px | teléfono: márgenes menores, título más chico |
| `short` | alto < 640 px | teléfono horizontal, ventana pequeña, teclado abierto |
| `compact` | `mobile` **o** `short` | falta altura: se cede espacio al contenido |
| `sidebar` | ancho ≥ 1180 px | navegación lateral (si no, barra horizontal) |
| `split` | ≥ 960 px útiles | dos columnas (Caja, Cierre de caja) |
| `board` | ≥ 1000 px útiles | tres columnas (Cocina) |

Con `compact`: la cabecera de página viaja **dentro** del desplazamiento (si la
pantalla usa `scroll`) en vez de quedarse fija y quitar la mitad de la pantalla,
"Volver" pasa a ser un icono junto al título, las pestañas y filtros forman una
tira que se desliza de lado, los pies de los modales van lado a lado, y los
avisos destacados (`Callout`) se acomodan en una fila. Con `short` además se
omiten la explicación bajo el título y el pie decorativo de la barra lateral.
Los valores están en `shared/theme/layout.js`.

## Reglas para una pantalla nueva

- Usa `WorkspaceScreen`. Si la página es una lista o un formulario, pasa `scroll`:
  **no pongas tu propio `ScrollView`** (el marco desplaza también la cabecera en
  pantallas compactas). Si tiene paneles con desplazamiento propio (Caja, Cocina
  en pantallas anchas), pasa `scroll={false}` y usa `Columns` con `fill`.
- Los avisos (`Banner`) y bloques que pongas como hijos ya quedan separados por el
  marco: no les des `margin`.
- Mantén `minWidth: 0` y permite que las filas y etiquetas se ajusten cuando el
  contenido crezca.
- Para formularios usa `Sheet`: comparte área segura, desplazamiento, cierre y pie
  de acciones. Los controles tienen un área táctil mínima de 48 px y los botones
  principales de 56 px.
- Los estilos de grupos, chips, filas y tarjetas salen de `commonStyles`
  (`group`, `chips`, `rowBetween`, `card`, `panel`, `section`); no los reexportes
  ni los copies a otro archivo de estilos.

El CSS global se carga solo en web desde la raíz de Expo Router; las variables
`--sotos-*` vienen de `theme.colors`. Los estilos de pantalla y componentes usan
`StyleSheet` para compartir la misma interfaz entre web, iOS y Android.

Los tickets usan `theme.printing` y `print/receipt.js`. El navegador imprime un
documento separado, por lo que el CSS del ticket no cambia las otras pantallas.
