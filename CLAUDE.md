@AGENTS.md

# Convenciones de este proyecto (Sotos — pedidos de restaurante)

Arquitectura completa en `docs/ARQUITECTURA.md`; despliegue en `docs/DESPLIEGUE_RENDER.md`. Resumen obligatorio:

- **JavaScript** (no TypeScript). Ignorar las menciones a `tsc` y `.tsx` de AGENTS.md; las rutas son `.js`.
- **Estructura por capas:** `app` (rutas delgadas) → `features` (UI) → `services` (casos de uso) → `domain` (reglas puras) / `data` (repositorios por contrato). `shared` es transversal. Ver regla de dependencias en el doc.
- `domain/` es JavaScript puro: sin React, sin Expo, sin I/O. **El servidor (`server/`) también lo importa**: no agregar nada ahí que solo funcione en React Native.
- Las pantallas llaman a `services/`, nunca a repositorios directamente.
- **Estilos centralizados:** colores, espaciados, tipografía y tamaños salen de `@/shared/theme`. Prohibido hardcodear valores visuales en pantallas/componentes. Patrones repetidos van a `shared/styles` o `shared/ui`.
- Iconos solo a través de `@/shared/ui` (`Icon`); no importar la librería de iconos en otros lugares.
- Imports con alias `@/` (apunta a `src/`).
- Código en inglés; textos de interfaz y documentación en español.
- Dinero siempre en colones enteros; formatear con `formatColones`.
- Cada regla nueva de dominio lleva su prueba (`*.test.js` junto al archivo). Ejecutar `npm test` (app + servidor) antes de dar algo por terminado.
- Dependencias de la app con `npx expo install`, no `npm install`. El servidor tiene su propio `package.json` (`npm install --prefix server`).
- Datos de pedidos: al leer de Postgres (JSONB) el orden de las claves cambia; comparar datos con `deepEqual`, nunca con `JSON.stringify`.
- `EXPO_PUBLIC_*` queda visible dentro de la app: jamás poner secretos reales ahí.
