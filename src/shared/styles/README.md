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
├── web/global.css      Base del navegador: raíz, foco, selección, scroll
├── GlobalStyles.web.js Variables CSS generadas desde los tokens de color
└── GlobalStyles.js     Entrada nativa; los estilos se aplican con StyleSheet
```

Los componentes importan sus estilos desde esta carpeta. Para repetir un patrón,
combina `commonStyles` con los estilos propios o crea un componente en `shared/ui`.
Los formularios usan `components/forms.js`; las pantallas internas comparten
`features/workspace/components/WorkspaceScreen`, que también filtra la navegación
con los permisos del usuario.

`useResponsiveLayout` calcula el espacio útil y considera el tamaño del texto.
La navegación lateral aparece a partir de 1180 px; en tamaños menores se convierte
en una barra horizontal. Caja coloca el resumen al lado cuando hay al menos
960 px útiles, y Cocina usa tres columnas desde 1000 px útiles. Debajo, ambas
vistas se apilan con un único desplazamiento vertical. Los valores se definen en
`shared/theme/layout.js`; las tarjetas del catálogo calculan sus columnas con el
ancho real de su contenedor.

Mantén `minWidth: 0` y permite que las filas y etiquetas se ajusten cuando el
contenido crezca. Usa el componente `Sheet` para formularios: comparte área
segura, desplazamiento, cierre y pie de acciones. Los controles tienen un área
táctil mínima de 48 px y los botones principales de 56 px.

El CSS global se carga solo en web desde la raíz de Expo Router; las variables
`--sotos-*` vienen de `theme.colors`. Los estilos de pantalla y componentes usan
`StyleSheet` para compartir la misma interfaz entre web, iOS y Android.
