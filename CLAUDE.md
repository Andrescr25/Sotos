@AGENTS.md

# Convenciones de este proyecto (Sotos — pedidos de restaurante)

Arquitectura completa en `docs/ARQUITECTURA.md`; despliegue en `docs/DESPLIEGUE_RENDER.md` (servidor en Render, base de datos en Supabase). Resumen obligatorio:

- **JavaScript** (no TypeScript). Ignorar las menciones a `tsc` y `.tsx` de AGENTS.md; las rutas son `.js`.
- **Estructura por capas:** `app` (rutas delgadas) → `features` (UI) → `services` (casos de uso) → `domain` (reglas puras) / `data` (repositorios por contrato). `shared` es transversal. Ver regla de dependencias en el doc.
- `domain/` es JavaScript puro: sin React, sin Expo, sin I/O. **El servidor (`server/`) también lo importa**: no agregar nada ahí que solo funcione en React Native.
- Las pantallas llaman a `services/`, nunca a repositorios directamente.
- **Estilos centralizados:** colores, espaciados, tipografía y tamaños salen de `@/shared/theme`. Prohibido hardcodear valores visuales en pantallas/componentes. Patrones repetidos van a `shared/styles` o `shared/ui`.
- Iconos solo a través de `@/shared/ui` (`Icon`); no importar la librería de iconos en otros lugares.
- Imports con alias `@/` (apunta a `src/`).
- Código en inglés; textos de interfaz y documentación en español. Los mensajes de error para el usuario se redactan en `shared/errors/messages.js`.
- Dinero siempre en colones enteros; formatear con `formatColones`.
- Cada regla nueva de dominio lleva su prueba (`*.test.js` junto al archivo). Ejecutar `npm test` (app + servidor) antes de dar algo por terminado.
- Dependencias de la app con `npx expo install`, no `npm install`. El servidor tiene su propio `package.json` (`npm install --prefix server`).
- Datos de pedidos: al leer de Postgres (JSONB) el orden de las claves cambia; comparar datos con `deepEqual`, nunca con `JSON.stringify`.
- `EXPO_PUBLIC_*` queda visible dentro de la app: jamás poner secretos reales ahí.
- **Base de datos en Supabase, conectada solo por Postgres** (nunca por su API REST ni con claves `anon`/`service_role`). Toda tabla nueva en `server/src/store/schema.js` debe pasar por `lockDown` (RLS + revocar permisos), porque en Supabase el esquema `public` se expone por API.
- En Render la conexión debe ser la del **Session pooler** de Supabase (IPv4), no la directa (IPv6).

## Acceso y roles (requisito del usuario)

- **Los usuarios no eligen ni conocen su rol**: inician sesión y el administrador les asigna el acceso. Nunca agregar un selector de rol ("Entrar como…") en la app.
- `User.role` puede ser `null` (cuenta sin acceso → pantalla "pendiente"). Usar `hasAccess`, `canAccessArea` y `can` de `@/domain/users`; no comparar roles a mano.
- La seguridad real vive en el servidor (rol leído de la base en cada petición). Las rutas protegidas de Expo Router son solo comodidad de interfaz.
- Una pantalla que dependa de `user` debe tolerar `user === null` un instante al cerrar sesión (ver `CashierScreen`).
- Las pruebas de interfaz usan `@testing-library/react-native` v14, cuya API es **asíncrona** (`await render`, `await fireEvent.press`).
