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

- **Los usuarios no eligen ni conocen su rol**: el administrador los invita y les asigna el acceso. Nunca agregar un selector de rol ("Entrar como…") en la app.
- **No hay registro abierto** (decisión del usuario): ni pantalla "Crear cuenta" ni `POST /auth/register`. Las cuentas se crean solo con invitación (`createAccount`). No reintroducirlo sin que lo pida.
- `User.role` puede ser `null` (cuenta sin acceso → pantalla "pendiente"). Usar `hasAccess`, `canAccessArea` y `can` de `@/domain/users`; no comparar roles a mano.
- La seguridad real vive en el servidor (rol leído de la base en cada petición). Las rutas protegidas de Expo Router son solo comodidad de interfaz.
- Una pantalla que dependa de `user` debe tolerar `user === null` un instante al cerrar sesión (ver `CashierScreen`).
- Las pruebas de interfaz usan `@testing-library/react-native` v14, cuya API es **asíncrona** (`await render`, `await fireEvent.press`).

## App web (sitio estático en Render)

- El personal usa la **app web instalable** (`sotos-app`, sitio estático); `render.yaml` la construye con `npx expo export --platform web`. Mantener `web.output: single` y la regla de reescritura `/* → /index.html`.
- `src/data/index.js` y `src/config/runtime.js` eligen memoria/servidor con `process.env.EXPO_PUBLIC_API_URL` **leído de forma estática y con `require` dentro de cada rama**: así el build con servidor descarta las cuentas de ejemplo (con contraseñas de prueba). No volver a importarlas de forma estática.
- Tras cambiar `EXPO_PUBLIC_API_URL` en local, arrancar con `npx expo start --clear` (Metro cachea la variable).
- El ícono sale de `assets/icon.svg`; regenerar PNG con `bash scripts/generate-icons.sh`. Colores del manifest = tokens de `shared/theme` (hay una prueba).
- La URL de `sotos-app` debe estar en `CORS_ORIGIN` del servidor (`render.yaml`).

## Menú (administrador)

- El menú es un **documento único** en el servidor (`menu_documents`); cada cambio es una función pura de `src/domain/menu/menuAdmin.js` aplicada de forma atómica por el almacén. Servidor y modo en memoria comparten `MENU_COLLECTION_HANDLERS`: una operación nueva se agrega en el dominio, nunca solo en una capa.
- Precios siempre en colones **enteros**; en formularios usar `parseColones`. Eliminar = definitivo; ocultar = `active: false`. Los pedidos guardan copia de nombre y precio.
- Permisos: `MENU_VIEW` (caja y admin) y `MENU_MANAGE` (solo admin). Caja y administración se refrescan con el evento `menu:changed` (`useMenu`).
- Las tablas nuevas pasan por `lockDown` en `schema.js` (también `menu_documents`), y todo método HTTP que use la app debe estar en `Access-Control-Allow-Methods` de `createApp.js`.
- El menú de ejemplo (`data/seed/menu.js`) solo debe llegar a la app en modo memoria: no importarlo de forma estática desde código que se compile con servidor.

## Invitaciones y restablecer contraseña

- El admin crea la cuenta (`passwordSet: false`) y recibe un enlace `…/invitacion/<token>` de **un solo uso**; el empleado crea su contraseña y entra con el rol asignado. El mismo mecanismo (`POST /users/:id/invitation`) restablece contraseñas y cierra las sesiones anteriores.
- Solo se guarda el **hash** del token. El token viaja en el cuerpo de `POST /invitations/lookup|accept`, nunca en la ruta de la API. Una cuenta sin contraseña nunca puede iniciar sesión (login devuelve `invalid_credentials`).
- El enlace se arma en `features/admin/inviteLink.js`: en web usa el dominio de la página; en nativo `Linking.createURL`. No usar `Linking.createURL` directamente en web.
- Al cambiar una contraseña se cierran las conexiones en vivo de la cuenta (`hub.disconnectUser`); el cliente solo expira su sesión si el token rechazado es el vigente (`createRealtimeClient`).
- `users.password_hash` es NULL-able: cualquier consulta debe tratarlo como "cuenta invitada".

## Cobro antes de cocina y cierre de caja

- **Un pedido no sale a cocina sin pago.** `Order.payment` (forma, monto, recibido, vuelto, `paidAt`, `receivedBy`) es obligatorio para pasar de borrador a "nuevo". Se exige en tres capas, igual que el nombre: `changeOrderStatus` (dominio), `checkOrderWrite` + `checkOrderActor` (servidor y memoria; el pago debe estar firmado por la sesión) y el modal de cobro de Caja.
- El pago se arma dentro de `sendOrderToKitchen(order, { payment: { method, tendered } })` con el total **de ese instante**; nunca se guarda en el borrador. Es inmutable tras el envío. Los pedidos viejos sin `payment` siguen siendo válidos: comparar con `payment ?? null`, no exigirlo en actualizaciones.
- Toda prueba que arme un pedido para enviar debe pasar `payment` (p. ej. `{ method: PAYMENT_METHOD.CARD }`, que no pide monto).
- Formas de pago: `PAYMENT_METHOD` (`cash`/`card`/`sinpe`, en `@/domain/payments`). Solo el efectivo lleva monto recibido y vuelto. **El vuelto no es venta**: las ventas suman `payment.amount`.
- **Cierre de caja** (`@/domain/cashClosing`, permiso `CASH_CLOSE` para cajero y admin): cubre los pedidos con pago que ningún cierre ha cubierto. **El servidor lo calcula todo** (`createCashClosing`); la tablet solo manda `id`, fondo inicial, efectivo contado y nota. Servidor y modo en memoria comparten esa función pura: una regla nueva va en el dominio, nunca solo en una capa.
- Las tablas `cash_closings` y `cash_closing_orders` pasan por `lockDown`. La clave primaria de `cash_closing_orders` (id del pedido) y el bloqueo consultivo del cierre garantizan que un pedido entre en un solo cierre. No agregar clave foránea hacia `orders`.
- Un pedido cobrado y luego cancelado **no suma a las ventas** del cierre; se informa aparte. Repetir un cierre con el mismo `id` devuelve el ya guardado (idempotente, como `sendToKitchen`).
- Despliegue: publicar primero el servidor (crea las tablas solo, al arrancar) y después la app; las tablets con la versión anterior no podrán enviar pedidos (falta el pago) hasta que recarguen.

## Inventario

- El inventario es un **documento único** en el servidor (`inventory_documents`), como el menú: cada cambio es una función pura de `src/domain/inventory/inventoryAdmin.js` aplicada de forma atómica por el almacén. Servidor y modo en memoria comparten esas funciones: una regla nueva va en el dominio, nunca solo en una capa.
- **Todo se cuenta en porciones enteras** (`InventoryItem.stock`, recetas, ajustes). Una unidad rinde `portionsPerUnit` porciones; nunca guardar fracciones ni decimales. Para mostrar usar `formatPortions` / `describeStock`; para leer lo que escribe una persona, `parseWholeNumber` (no `parseColones`, que leería "1.5" como 15).
- **El descuento va dentro de la transacción del pedido nuevo**: `orderStore.saveOrder(order, check, onCreated)` ejecuta `onCreated(tx)` solo al insertar (no en cambios de estado) y `inventoryStore.consumeForOrder(order, tx)` descuenta ahí. No descontar desde la tablet ni en un paso aparte. En modo en memoria lo hace `onOrderCreated` del repositorio de pedidos.
- **Nunca bloquear una venta por falta de stock**: el stock puede quedar negativo. Sin receta no se descuenta. Los extras tienen su propia receta y descuentan con su propia cantidad.
- Permiso `INVENTORY_MANAGE`: solo el administrador (no se asigna a ningún rol; `can` le da todo). Se refresca con el evento `inventory:changed` (`useInventory`), que también se emite al vender.
- La tabla `inventory_documents` pasa por `lockDown`. Las recetas apuntan a ids del menú sin clave foránea; el servidor valida que el producto o extra exista al guardar una receta con líneas.
- El inventario empieza **vacío** en producción y en memoria (no hay datos de ejemplo).

## Nombre del cliente en cada pedido

- `Order.customerName` es **obligatorio** para enviar a cocina (`isValidCustomerName`: ≥ 2 caracteres y alguna letra). Se exige en tres capas: `changeOrderStatus` (dominio), `checkOrderWrite` (servidor y memoria) y el botón de Caja. Es inmutable tras el envío.
- Toda prueba que arme un pedido para enviar debe llamar a `setCustomerName`. Será el nombre de la factura cuando exista la facturación (`domain/billing`).
