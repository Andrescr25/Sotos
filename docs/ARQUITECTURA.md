# Arquitectura — Sistema de pedidos (caja ↔ cocina)

Documento vivo. Describe cómo está organizado el proyecto, qué entidades
existen, cómo fluye un pedido y dónde se enchufan las funciones futuras.

## 1. Alcance de la primera etapa

**Incluye:** menú (categorías, productos, extras, bebidas), pedidos con
observaciones, cálculo de totales, envío a cocina, estados, quién tomó el
pedido y cuándo, cuentas con acceso asignado por el administrador, pantallas de
caja, cocina, administración de usuarios y **gestión del menú** (platillos,
bebidas, extras, categorías y observaciones frecuentes), **cobro del pedido
antes de enviarlo a cocina** (efectivo con cálculo de vuelto, tarjeta y SINPE
Móvil), **cierre de caja** (cuadre del efectivo e historial de cierres),
**inventario** (insumos en porciones, recetas por platillo y descuento automático
con cada venta) e impresión opcional de comprobantes de pedidos enviados desde
Chrome Android.

**No incluye todavía:** facturación, reportes, contabilidad, mesas, división de
cuentas, pagos divididos, propinas y descuentos, delivery.

## 2. Stack

| Pieza | Elección |
|---|---|
| Lenguaje | JavaScript (JSDoc para documentar formas de datos) |
| App | React Native con Expo (SDK 57), pensada para tablets. Se publica como **app web instalable** (sitio estático en Render); también corre en Expo Go |
| Navegación | Expo Router (rutas en `src/app/`, protegidas con `Stack.Protected`) |
| Iconos | `@react-native-vector-icons/ionicons` (envuelto en `shared/ui/Icon`) |
| Backend | Servicio Node (HTTP + WebSocket) en **Render** + Postgres en **Supabase** (ver `docs/DESPLIEGUE_RENDER.md`) |
| Pruebas | Jest: proyecto `app` (jest-expo + Testing Library) y proyecto `server` (`npm test`) |
| Moneda | Colones enteros (sin decimales), formato `₡12.500` |

Convención de idioma: **código en inglés, textos de interfaz y documentación en español.**

## 3. Estructura de carpetas

```
src/
├── app/            Rutas (Expo Router). Delgadas: solo montan una pantalla de features/.
│   ├── _layout.js      Sesión + qué rutas existen según el acceso de la cuenta
│   ├── index.js        Redirige según la cuenta (login / pendiente / su zona)
│   ├── login.js  registro.js  pendiente.js
│   └── caja/  cocina/  admin/
│
├── features/       UI por área: pantallas, componentes y hooks propios.
│   ├── auth/       AuthProvider, login, registro, acceso pendiente
│   ├── cashier/    toma de pedidos, cobro, entrega y cierre de caja
│   ├── kitchen/    tablero de cocina
│   ├── orders/     piezas compartidas: lista en vivo, detalle de líneas, estado
│   ├── menu/       useMenu: el menú en vivo (lo usan Caja y Administración)
│   ├── workspace/  marco compartido y navegación según los permisos
│   ├── inventory/  useInventory: el inventario en vivo (lo usa Administración)
│   └── admin/      inicio, usuarios y accesos, gestión del menú e inventario
│
├── services/       Casos de uso: combinan dominio + repositorios.
│   └── orderService, authService, userService, menuService, cashClosingService, inventoryService
│
├── domain/         Reglas de negocio. JavaScript puro: sin React, sin red, sin I/O.
│   ├── orders/     pedido, líneas, estados, precios, integridad, errores
│   ├── payments/   formas de pago, cobro, vuelto y montos sugeridos
│   ├── cashClosing/ resumen de ventas y cierre de caja (cuadre del efectivo)
│   ├── inventory/  insumos, stock en porciones, recetas y consumo de un pedido
│   ├── menu/       categorías, productos, extras; operaciones del administrador y consultas
│   └── users/      roles, permisos, acceso por zona, reglas de cuentas
│
├── data/           Acceso a datos detrás de contratos.
│   ├── contracts.js        Order/Auth/User/Menu/CashClosing/InventoryRepository
│   ├── memory/             En memoria (desarrollo sin servidor y pruebas)
│   ├── remote/             Servidor: cliente HTTP, tiempo real, repositorios
│   ├── session/            Token de sesión (llavero del sistema / localStorage)
│   ├── seed/               Datos de ejemplo
│   └── index.js            Único lugar donde se elige la implementación activa
│
├── config/         runtime (modo memoria/servidor), routes (zona → ruta)
│
└── shared/         Utilidades transversales, sin lógica de negocio.
    ├── theme/      Tokens de diseño (colores, espaciado, tipografía...)
    ├── styles/     commonStyles, components/, layout/, screens/, web/ (ver README)
    ├── ui/         Componentes base: Text, Button, TextField, Sheet, Stepper...
    ├── errors/     AppError y mensajes para el usuario
    ├── hooks/      useNow, useResponsiveLayout
    └── utils/      money, time, createId, createEventEmitter, deepEqual

public/             Archivos de la app web: index.html, manifest.json e íconos (PWA).
scripts/            generate-icons.sh: regenera los íconos desde assets/icon.svg.

server/             Backend (paquete Node independiente, se despliega en Render; usa Postgres de Supabase).
└── src/
    ├── index.js            Arranque: entorno, almacenes, administrador inicial
    ├── config.js           Variables de entorno
    ├── createApp.js        Servidor HTTP + WebSocket
    ├── auth/               Registro, login, sesiones, asignación de acceso
    ├── security/           Hash de contraseñas (scrypt) y tokens
    ├── http/               Rutas de auth, usuarios y pedidos; permisos; límite de intentos
    ├── realtime/           Canal WebSocket (sesión, latido, difusión por rol)
    └── store/              Almacenes de pedidos, usuarios, menú, cierres de caja e inventario: Postgres y memoria
```

El servidor **reutiliza `src/domain`** (se empaqueta con esbuild, alias `@/`):
las reglas que validan en la tablet son exactamente las que valida el servidor.

### Regla de dependencias (de arriba hacia abajo, nunca al revés)

```
app → features → services → domain
                     └────→ data (por contrato) → domain
shared: lo puede usar cualquiera; no depende de domain/data/features.
```

- `domain/` no importa nada de React, Expo ni `data/`.
- Las pantallas **no** tocan repositorios: llaman a `services/`.
- Un archivo = una responsabilidad. Si una carpeta crece, se subdivide por tema.
- Se importa con el alias `@/` (`@/domain/orders`, `@/shared/ui`).

## 4. Entidades y relaciones

```
Category 1 ───< Product >───< Extra            (Product.extraIds)
                   ▲
                   │ productId (+ copia de nombre y precio)
User ───< Order 1 ───< OrderItem 1 ───< OrderItemExtra
  (createdBy)  │
               ├───< StatusChange               (statusHistory)
               └──── Payment                    (cobro; obligatorio para enviar a cocina)

CashClosing ──── cubre los pedidos cobrados desde el cierre anterior (cada uno, en un solo cierre)

InventoryItem >───< Product / Extra          (receta: cuántas porciones usa cada unidad vendida)
```

| Entidad | Campos clave |
|---|---|
| **Category** | `id`, `name`, `icon`, `sortOrder`, `active` |
| **Product** | `id`, `categoryId`, `name`, `kind` (`dish`/`drink`), `price`, `extraIds[]`, `sortOrder`, `active` |
| **Extra** | `id`, `name`, `price`, `sortOrder`, `active` (reutilizable entre productos) |
| **Menu** | `categories[]`, `products[]`, `extras[]`, `quickNotes[]` — un único documento |
| **User** | `id`, `username`, `name`, `role` (`cashier`/`cook`/`admin` o **`null`**), `active`, `passwordSet`, `createdAt` |
| **Invitation** | `tokenHash`, `userId`, `createdById`, `expiresAt`, `usedAt` (solo servidor) |
| **Order** | `id`, `number`, `type`, `tableId`, `status`, `items[]`, **`customerName`**, **`payment`**, `note`, `createdBy`, `createdAt`, `updatedAt`, `statusHistory[]`, `totals` |
| **Payment** | `method` (`cash`/`card`/`sinpe`), `amount` (el total del pedido), `tendered` (lo que entregó el cliente), `change` (vuelto), `paidAt`, `receivedBy` |
| **InventoryItem** | `id`, `name`, `unit` (paquete, kg…), `portionsPerUnit`, `stock` (porciones, puede ser negativo), `minPortions` |
| **Inventory** | `items[]` y `recipes` (`products` y `extras`: id del menú → líneas `{ itemId, portions }`) — un único documento |
| **CashClosing** | `id`, `number` (consecutivo), `closedAt`, `closedBy`, `periodStart`, `sales` (totales por forma de pago y cancelados), `cash` (`openingFloat`, `cashSales`, `expected`, `counted`, `difference`), `note` |
| **OrderItem** | `id`, `productId`, `name`*, `kind`*, `unitPrice`*, `quantity`, `extras[]`, `notes[]` |
| **OrderItemExtra** | `extraId`, `name`*, `unitPrice`*, `quantity` |
| **StatusChange** | `status`, `at`, `by` (quién y cuándo) |

\* **Copia (snapshot):** el pedido guarda nombre y precio del momento. Cambiar el
menú después no altera pedidos ya tomados (clave para facturación e historial).

### Decisiones de modelado

- **Extras con cantidad propia.** `2 × Hamburguesa` con `1 × Queso extra` significa
  que solo una de las dos lleva queso. Un extra nunca supera la cantidad de la línea.
- **Líneas idénticas se fusionan** (mismo producto + extras + observaciones).
  Si algo difiere, son líneas distintas — así cocina ve exactamente qué preparar.
- **Total de línea** = `precio × cantidad + Σ(extra.precio × extra.cantidad)`.
- **Dinero en enteros.** Sin decimales, sin errores de redondeo.
- **Fechas en ISO 8601** (texto), serializables para red y almacenamiento.
- **Observaciones:** por línea (`notes[]`, con atajos `quickNotes` del menú) y por pedido (`note`).
- **Funciones puras e inmutables.** Cada operación devuelve un pedido nuevo; el
  tiempo (`now`) se inyecta, lo que hace las reglas fáciles de probar.
- **Toda cuenta lleva el nombre del cliente.** `customerName` es obligatorio
  para enviar un pedido a cocina (mín. 2 caracteres y alguna letra; "Mesa 5" o
  "Ana M." valen, "." o "12" no). Lo exigen el dominio (`sendOrderToKitchen`),
  el servidor (`checkOrderWrite`) y la interfaz (el botón de enviar queda
  deshabilitado). No se puede cambiar después de enviado. Cocina y "Listos"
  lo muestran, y será el nombre de la factura cuando exista la facturación.
- **Se cobra antes de cocina.** El pedido no sale de Caja hasta confirmar el pago
  (`payment`, obligatorio para pasar de borrador a "nuevo"). El pago se calcula
  con el total del pedido **en el momento de enviar** (`sendOrderToKitchen`), así
  que no puede quedar desactualizado respecto a las líneas, y es inmutable
  después. Lo exigen el dominio (`changeOrderStatus`), el servidor
  (`checkOrderWrite` y `checkOrderActor`: el pago debe estar firmado por quien
  inició sesión) y la interfaz (el modal de cobro). Los pedidos guardados antes
  de existir el cobro no lo tienen y se conservan tal cual.
- **Efectivo, tarjeta y SINPE Móvil.** En efectivo se registra lo que entregó el
  cliente y se calcula el vuelto (`tendered - amount`); en tarjeta y SINPE se
  cobra el total exacto. El **vuelto no es venta**: las ventas suman `amount`.
- **Inventario en porciones enteras.** Un insumo es lo que se compra ("paquete de
  papas") y rinde `portionsPerUnit` porciones (8). El stock se guarda en
  **porciones**, igual que el dinero va en colones enteros: 1/8 de paquete es
  exactamente 1 porción, sin decimales ni errores de redondeo. La receta de un
  platillo, bebida o **extra** dice cuántas porciones usa una unidad vendida
  (los extras descuentan con su propia cantidad, como en el precio). Lo que no
  tiene receta no descuenta nada.
- **El descuento va con la venta.** Al guardar un pedido **nuevo**, el servidor
  descuenta el inventario dentro de la **misma transacción**
  (`saveOrder(order, check, onCreated)`): o quedan guardados el pedido y el
  descuento, o ninguno. Los cambios de estado posteriores no vuelven a
  descontar, y reenviar un pedido (reintento) tampoco.
- **Nunca se bloquea una venta por falta de stock.** El stock puede quedar
  negativo y se lee como "Faltan 1/4 de paquete": el registro siempre va detrás
  de la realidad y el restaurante no puede dejar de vender.
- **El menú es un documento.** Se guarda completo (JSONB) y cada cambio del
  administrador es una función pura de `domain/menu` aplicada de forma atómica:
  dos administradores editando a la vez se aplican uno tras otro.
- **Ocultar vs. eliminar.** `active: false` oculta algo de Caja sin perderlo.
  Eliminar es definitivo; una categoría con productos no se puede eliminar, y
  al eliminar un extra se quita de los productos que lo ofrecían.
- **Los pedidos no dependen del menú vivo:** guardan copia de nombre y precio,
  así que editar o eliminar productos nunca altera pedidos ya tomados.

## 5. Acceso y roles

**El personal no elige ni conoce su rol, y no existe el registro abierto**:
solo entra quien el **administrador** invita.

```
Invitar empleado: nombre, usuario, rol
        │
   se genera un ENLACE de un solo uso (el admin lo copia y lo envía)
        │
   el empleado lo abre y crea su contraseña
        ▼
   entra directo con el rol ya asignado
        Cajero → /caja     Cocinero → /cocina     Administrador → /admin

   (si el admin lo dejó "Sin acceso todavía" ve "Acceso pendiente"
    hasta que el admin le asigna el rol)
```

### Invitaciones

- Al invitar se crea la cuenta **sin contraseña** (`passwordSet: false`), con el
  rol elegido (o ninguno). Mientras no la cree, no puede iniciar sesión.
- El enlace es `…/invitacion/<token>`: token aleatorio de 256 bits, **de un solo
  uso**, vigencia 7 días (`INVITE_TTL_DAYS`). En la base solo se guarda su hash:
  el enlace se ve **una vez**; si se pierde, se genera uno nuevo y el anterior
  deja de servir.
- **El mismo mecanismo restablece contraseñas:** el admin genera un enlace para
  quien ya tiene cuenta; al usarlo, la contraseña anterior y todas sus sesiones
  se cierran (también en vivo, en sus otros dispositivos).
- Abrir el enlace y crear la contraseña son dos llamadas públicas (con límite
  de intentos); el token viaja en el **cuerpo** de la petición, no en la ruta de
  la API, para que no quede en los registros de acceso.
- El empleado queda con la sesión abierta y su rol; el admin ve en la lista
  cómo la invitación pasa de "pendiente" a "creó su contraseña".

- El rol llega a la persona **al instante** por el canal en tiempo real: su
  pantalla cambia sola, sin cerrar sesión.
- El admin puede quitar el acceso (`role = null`) o deshabilitar la cuenta
  (`active = false`): se cierran sus sesiones al momento.
- **Siempre queda al menos un administrador activo** (regla de dominio, atómica
  en el servidor). El primer administrador sale de las variables `ADMIN_*`.
- Un administrador tiene acceso total (`can()` siempre `true`).

### Permisos

| Permiso | Cajero | Cocinero | Admin |
|---|:-:|:-:|:-:|
| Ver pedidos | ✅ | ✅ | ✅ |
| Ver el menú | ✅ | — | ✅ |
| Administrar el menú (agregar, editar, ordenar, eliminar) | — | — | ✅ |
| Crear / enviar pedido | ✅ | — | ✅ |
| Ver cocina | — | ✅ | ✅ |
| Empezar preparación / marcar listo | — | ✅ | ✅ |
| Marcar entregado | ✅ | — | ✅ |
| Cancelar | ✅ | — | ✅ |
| Cierre de caja (ver el cuadre, cerrar y consultar cierres) | ✅ | — | ✅ |
| Administrar el inventario (insumos, stock y recetas) | — | — | ✅ |
| Gestionar usuarios y accesos | — | — | ✅ |

Fuentes de verdad: `domain/users/permissions.js` (roles → permisos),
`domain/users/access.js` (permisos → zonas) y `domain/orders/orderStatus.js`
(transiciones). Para cambiar una regla se edita ahí, en un solo lugar.

### Seguridad

- Contraseñas con **scrypt** y sal aleatoria; nunca se guardan ni se registran en claro.
- Sesión por **token aleatorio**; en la base solo se guarda su hash. En el
  dispositivo vive en el llavero del sistema (`expo-secure-store`).
- El rol se lee de la base de datos **en cada petición**: lo que diga el cliente
  no cuenta. Cada cambio de un pedido debe estar firmado por el usuario de la
  sesión y su rol debe tener el permiso (`checkOrderActor`).
- Inicio de sesión y registro limitados por intentos (por IP).
- Los mensajes de error no revelan si un usuario existe.
- **Tablas cerradas en Supabase:** al arrancar, cada tabla activa RLS sin
  políticas y revoca permisos a `anon`/`authenticated`/`service_role`, para que
  la API REST del proyecto no las exponga. El servidor entra como `postgres`.
- La conexión a la base de datos va cifrada (TLS); la identidad del servidor se
  verifica si se define `DATABASE_SSL_CA`.
- El control de rutas en la app (`Stack.Protected`) es solo comodidad de
  interfaz; la seguridad real está en el servidor.

## 6. Ciclo de vida del pedido

```
 DRAFT ──enviar──▶ NEW ──empezar──▶ IN_PROGRESS ──listo──▶ READY ──entregar──▶ DELIVERED
   │                │                    │                   │
   └────────────────┴────────cancelar────┴───────────────────┴──▶ CANCELLED
```

| Estado | Etiqueta | Quién lo provoca | Visible en cocina |
|---|---|---|---|
| `draft` | Borrador | Cajero crea | No |
| `new` | Nuevo | Cajero **envía** (se asigna el número `#024`) | Sí |
| `in_progress` | En preparación | Cocinero | Sí |
| `ready` | Listo | Cocinero | Sí |
| `delivered` | Entregado | Cajero | No |
| `cancelled` | Cancelado | Cajero o Admin | No |

Solo un borrador se puede editar. Una vez enviado, las líneas son inmutables.
**Enviar = cobrar y enviar:** `DRAFT → NEW` solo ocurre con el pago confirmado
(ver "Se cobra antes de cocina"); un pago inválido ni siquiera gasta el número del pedido.

## 7. Comunicación caja ↔ cocina

Flujo: el cajero envía → `orderService.sendToKitchen` asigna número, valida y
guarda → el repositorio emite `order:saved` → la pantalla de cocina, suscrita
con `orderService.subscribe`, muestra el pedido al instante. Los cambios de
estado hacen el camino inverso hacia caja.

```
Tablet caja ──sendToKitchen──▶ OrderRepository ──order:saved──▶ Tablet cocina
Tablet caja ◀──order:saved──── OrderRepository ◀──markReady──── Tablet cocina
```

Cada transición lee el estado **actual** del repositorio, no el de la pantalla:
si dos cocineros pulsan "Empezar" a la vez, el segundo recibe
`invalid_transition`.

### Servidor (Render)

Todas las rutas exigen `Authorization: Bearer <token>`, salvo las marcadas.

| Ruta | Función | Permiso |
|---|---|---|
| `GET /health` | Estado del servicio (público) | — |
| `POST /auth/login` | Inicia sesión (público, limitado) | — |
| `POST /auth/logout` | Cierra la sesión | sesión |
| `GET /auth/me` | Cuenta actual, con el rol vigente | sesión |
| `GET /users` | Lista de cuentas | administrar usuarios |
| `POST /users` | Crea la cuenta de un empleado (sin contraseña) y devuelve su enlace | administrar usuarios |
| `POST /users/:id/invitation` | Enlace nuevo (invitación perdida o contraseña olvidada) | administrar usuarios |
| `POST /invitations/lookup` | Qué cuenta es la del enlace (público, limitado) | — |
| `POST /invitations/accept` | Crea la contraseña y abre sesión (público, limitado) | — |
| `PATCH /users/:id` | Asigna rol / habilita o deshabilita | administrar usuarios |
| `GET /menu` | El menú completo | ver el menú |
| `POST /menu/{categories,products,extras}` | Crear (devuelve `id` y el menú) | administrar el menú |
| `PATCH` / `DELETE /menu/{…}/:id` | Editar / eliminar | administrar el menú |
| `POST /menu/{…}/:id/move` | Subir o bajar (`direction: up/down`) | administrar el menú |
| `POST` / `DELETE /menu/quick-notes` | Agregar / quitar una observación frecuente | administrar el menú |
| `POST /menu/sample` | Cargar el menú de ejemplo (solo con el menú vacío) | administrar el menú |
| `GET /orders?statuses=new,ready` | Lista pedidos | ver pedidos |
| `GET /orders/:id` | Un pedido | ver pedidos |
| `PUT /orders/:id` | Guarda o avanza un pedido | según la transición |
| `POST /orders/next-number` | Siguiente número del día (atómico) | enviar pedido |
| `GET /inventory` | Insumos, stock y recetas | administrar inventario |
| `POST /inventory/items` · `PATCH` / `DELETE /inventory/items/:id` | Crear, editar y eliminar un insumo (eliminar lo quita de las recetas) | administrar inventario |
| `POST /inventory/items/:id/adjust` | Ajustar stock: `{ mode: 'add' o 'set', portions }` (compra, merma o conteo) | administrar inventario |
| `PUT /inventory/recipes/:kind/:id` | Receta de un producto o extra (`kind` = `products` o `extras`): `{ lines }`; sin líneas la quita | administrar inventario |
| `GET /cash-closings/pending` | Lo cobrado desde el último cierre, por forma de pago, y el fondo sugerido | cerrar caja |
| `POST /cash-closings` | Cierra la caja: `{ id, openingFloat, countedCash, note }`. El servidor calcula todo lo demás; repetir el mismo `id` no duplica | cerrar caja |
| `GET /cash-closings?limit=` | Cierres anteriores, del más reciente al más antiguo | cerrar caja |
| `WS /realtime` | Eventos en vivo; primer mensaje `{type:'auth', token}` | sesión |

**Eventos en tiempo real:** `inventory:changed` (a quien administra el inventario:
cambió el stock o las recetas, también por una venta), `order:saved` (a quien puede ver pedidos),
`user:updated` (a la persona cuyo rol o estado cambió), `users:changed` (a los
administradores cuando hay altas o cambios) y `menu:changed` (a Caja y
Administración cuando el administrador edita el menú: recargan solos).

**Garantías del servidor**

- **Atómico:** guardar bloquea la fila del pedido en Postgres (`FOR UPDATE`) y
  evalúa las reglas dentro de la misma transacción.
- **Sin pisadas:** una tablet con una copia vieja recibe `409 conflict` y su
  cambio no se aplica (p. ej. caja cancela un pedido que cocina ya inició).
- **Sin datos incoherentes:** se verifican totales, historial y que las líneas
  de un pedido enviado no cambien.
- **Números únicos:** el contador diario es una sola sentencia `UPSERT`.
- **Un pedido, un cierre:** `cash_closing_orders` tiene como clave primaria el id
  del pedido, y cada cierre se hace dentro de una transacción con un bloqueo
  consultivo (`pg_advisory_xact_lock`): dos tablets cerrando a la vez no cubren
  el mismo pedido dos veces. El cierre se calcula en el servidor con sus propios
  pedidos; de la tablet solo se aceptan lo contado, el fondo inicial y una nota.

**Cliente (`data/remote`)**

- Una conexión WebSocket compartida; reconexión con espera creciente y *jitter*.
- Latido propio: si el servidor no responde en 45 s, se considera caída
  (una tablet que pierde WiFi no recibe aviso de cierre).
- Emite `{ type: 'connection', connected }`: al reconectar, la pantalla
  **recarga la lista** porque pudo perder eventos; y se vuelve a leer la cuenta,
  por si el rol cambió mientras no había conexión.
- Si el servidor rechaza la sesión (token vencido o cuenta deshabilitada), la
  app vuelve al login sola.
- `sendToKitchen` es idempotente: reenviar el mismo borrador tras una falla de
  red devuelve el pedido ya guardado, sin duplicarlo.

> Sin `EXPO_PUBLIC_API_URL` la app usa repositorios en memoria con cuentas de
> ejemplo (un solo dispositivo, útil para desarrollar).

## 8. Pantallas

| Zona | Qué hace |
|---|---|
| **Login** | Usuario y contraseña. Sin selector de rol y sin "Crear cuenta": las cuentas las crea el administrador. |
| **Acceso pendiente** | Cuenta sin rol; se actualiza sola cuando el admin asigna acceso. |
| **Caja** | Categorías → productos → (extras y observaciones) → resumen → **cobro** → cocina. Botón "Listos (n)" para entregar y "Cierre de caja". Desde 960 px de espacio útil el resumen va a la derecha; en tamaños menores se apila debajo, con un acceso rápido «Ver pedido». |
| **Inventario** (admin) | Pestañas *Insumos* y *Recetas*. En Insumos: lo que queda ("2 y 3/8 paquetes · 19 porciones"), aviso de agotado o por reponer, ajustar stock (entró mercadería, merma o conteo, viendo cómo quedará) y editar. En Recetas: cada platillo, bebida y extra con lo que gasta ("Papas: 1/8 de paquete") y un editor con un selector de porciones por insumo. Se actualiza solo con cada venta. |
| **Cierre de caja** | Lo cobrado desde el último cierre por forma de pago (efectivo, tarjeta, SINPE Móvil) y el cuadre del efectivo: fondo inicial + cobrado en efectivo = esperado; se cuenta el cajón y se muestra si cuadra, sobra o falta. Pide confirmación antes de cerrar y guarda el cierre. Debajo, el historial. Cajero y administrador. |
| **Cocina** | Tablero Nuevos / En preparación / Listos con tarjetas grandes: número, hora, tiempo transcurrido (verde/ámbar/rojo), líneas con extras y observaciones, botón del siguiente paso. |
| **Administración** | Inicio con atajos y aviso de cuentas pendientes; "Usuarios y accesos" para invitar empleados, asignar rol, habilitar y restablecer contraseñas. |
| **Invitación** (empleado) | `/invitacion/<token>`: saluda por nombre, muestra su acceso y pide crear la contraseña. Maneja enlace inválido, vencido o ya usado. |
| **Menú** (administrador) | Pestañas *Platillos y bebidas*, *Extras*, *Categorías* y *Observaciones*: crear, editar, ocultar, ordenar con flechas y eliminar con confirmación. Si el menú está vacío ofrece crear la primera categoría o cargar un menú de ejemplo. Caja ve los cambios al instante. |

Los umbrales de color de la cocina están en `features/kitchen/config.js`.

### Inventario

El administrador crea los **insumos** ("Papas", unidad *paquete*, rinde **8**
porciones, 3 paquetes = 24 porciones) y en la pestaña *Recetas* define cuánto usa
cada producto o extra: "Papas fritas: 1 porción (1/8 de paquete)". Desde entonces,
cada pedido que sale de Caja rebaja 1/8 de paquete por plato, sin que nadie haga
nada. Cuando compra, hay merma o cuenta la bodega, **ajusta el stock** (suma, resta
o fija). El stock bajo el mínimo o en cero aparece como "Por reponer" / "Agotado" y
cuenta en el inicio de Administración.

- Cambiar las porciones por unidad de un insumo **redefine** qué es una porción: el
  stock y las recetas siguen contando porciones; la pantalla lo advierte y conviene
  hacer un conteo después.
- Una receta solo puede apuntar a un producto o extra que exista en el menú; quitar
  una receta se permite siempre (limpia las de productos ya eliminados).
- **Fuera de alcance por ahora:** devolver stock al cancelar un pedido (hoy no hay
  botón de cancelar en Caja; al agregarlo hay que decidir si lo ya cocinado
  se devuelve), historial de movimientos, costos y compras, y marcar productos
  como agotados en Caja.

### Cobro del pedido

"Enviar pedido a cocina" abre el modal de cobro (`PaymentSheet`). Se elige efectivo,
tarjeta o SINPE Móvil. En efectivo se escribe "con cuánto paga el cliente" (o se
elige *Exacto* o un monto sugerido: `suggestTenderedAmounts`) y se ve el **vuelto**
al instante, o cuánto falta; el botón de confirmar solo se habilita con un pago
válido. Al confirmar, el pedido se guarda con su pago y sale a cocina en el mismo
paso. Si falla, el error se muestra dentro del modal, que sigue abierto con lo
escrito; "Volver al pedido" cancela sin enviar nada. El comprobante en pantalla
repite la forma de pago, lo recibido y el vuelto, y el ticket impreso también.

### Cierre de caja

Una sola caja: el cierre cubre los pedidos con pago que ningún cierre anterior ha
cubierto, de todos los cajeros.

```
esperado  = fondo inicial + cobrado en efectivo         (el vuelto no cuenta)
diferencia = contado - esperado                          (+ sobra · − falta · 0 cuadra)
```

- El **fondo inicial** se sugiere con el efectivo contado en el cierre anterior y
  se puede editar (por ejemplo si se retiró dinero para depositarlo).
- Los pedidos **cobrados y luego cancelados** no suman a las ventas: se informan
  aparte, porque ese dinero debió devolverse.
- Los pedidos de antes del módulo de pagos no tienen cobro y no entran.
- Cada cierre guarda quién lo hizo, cuándo, los totales por forma de pago y el
  cuadre. El cierre se identifica con un `id` que genera la pantalla: si la
  respuesta se pierde y se reintenta, el servidor devuelve el cierre ya guardado.
- Sin pedidos cobrados por cerrar, el servidor responde `409 cash_no_sales`.
- **Fuera de alcance por ahora:** retiros y gastos de caja, devoluciones,
  propinas, descuentos, impresión del cierre y reportes por período.

### Impresión del pedido

Después de que el servidor confirma el envío, Caja muestra `ReceiptSheet` con
la opción de imprimir. `receiptService` genera el documento con los precios y
datos guardados del pedido; `shared/printing/browserPrinter.web.js` abre una
pestaña imprimible y el diálogo de Android. No escribe pedidos: el pago ya quedó registrado al enviarlo.
Los errores de impresión se manejan aparte de los errores al enviar a cocina.
El formato térmico usa `shared/theme/printing.js` y `shared/styles/print/receipt.js`.
La facturación electrónica de Hacienda queda para una etapa posterior.

Equipo, configuración y límites: [impresión Android](IMPRESION_ANDROID.md).

## 9. Estilos

Todo lo visual sale de `shared/theme`. Las pantallas no escriben colores,
márgenes ni tamaños de fuente sueltos.

| Quiero cambiar... | Archivo |
|---|---|
| Colores de marca o de estados | `shared/theme/colors.js` |
| Espaciados y radios | `shared/theme/spacing.js` |
| Tamaño de textos (toda la app) | `shared/theme/typography.js` |
| Tamaño mínimo de botones táctiles / iconos | `shared/theme/sizes.js` |
| Apariencia de controles y tarjetas | `shared/styles/components/*` |
| Navegación y marco interior | `features/workspace/components/WorkspaceScreen.js` + `shared/styles/layout/workspace.js` |
| Composición de cada pantalla | `shared/styles/screens/*` |
| Umbrales responsive y anchos | `shared/theme/layout.js` + `shared/hooks/useResponsiveLayout.js` |
| Cabecera de página y cómo se desplaza | `features/workspace/components/PageHeader.js` + `WorkspaceScreen.js` |
| Fila de lista, dato/valor, cifra destacada, pestañas, columnas, pie de modal | `shared/ui/{ListRow,DataRow,Callout,Tabs,ChipRow,Columns,SheetActions}.js` |
| CSS global del navegador | `shared/styles/web/global.css` |
| Patrones repetidos (tarjeta, panel, grupo, chips...) | `shared/styles/commonStyles.js` |
| Librería de iconos | `shared/ui/Icon.js` |
| Cuándo una tarjeta de cocina se pone ámbar/roja | `features/kitchen/config.js` |
| Textos de error para el usuario | `shared/errors/messages.js` |

La organización y las reglas de reutilización se detallan en
[`src/shared/styles/README.md`](../src/shared/styles/README.md). El CSS global
solo se carga en web; los estilos de React Native y los tokens se comparten
entre web, iOS y Android. Las vistas consideran el ancho útil, **la altura** y el
tamaño del texto para elegir columnas o una composición apilada.

**Responsive:** `useResponsiveLayout` distingue ancho (`mobile`, `sidebar`, `split`,
`board`) y altura (`short`); `compact` = `mobile` o `short`. Con poco espacio
vertical la cabecera de la página se desplaza con el contenido en vez de quedar
fija, y los modales, avisos y chips cambian a versiones más densas. Las pantallas
no hacen esto por su cuenta: lo resuelven los componentes compartidos (ver la
tabla de `src/shared/styles/README.md`), de modo que un ajuste de diseño se hace
en un solo lugar.

## 10. Cómo se agregan las funciones futuras

| Función | Dónde encaja |
|---|---|
| **Mesas** | Nuevo `domain/tables`. `Order.tableId` y `ORDER_TYPE.DINE_IN` ya existen. |
| **Pagos (más allá del cobro simple)** | `domain/payments` ya registra el cobro único del pedido (`Order.payment`). Pendiente: propinas, descuentos, pago dividido o en varias formas, devoluciones. Si el pago se separa del pedido, sigue siendo una dimensión **distinta** del estado de cocina. |
| **División de cuentas** | Agrupar líneas por cuenta (`checkId` en `OrderItem`) y calcular totales por cuenta en `pricing.js`. |
| **Facturación electrónica** | Nuevo `domain/billing`. Los pedidos ya guardan precios, nombres y el **nombre del cliente** (`customerName`) como copia; impuestos (IVA) se calculan en `pricing.js`. |
| **Inventario** | Nuevo `domain/inventory` (recetas/consumo). Reacciona a eventos de `orderService` (p. ej. al pasar a `in_progress`); no modifica el flujo de pedidos. |
| **Para llevar / Delivery** | `ORDER_TYPE` ya los define. Agregar datos de cliente (`customer`) y, para delivery, nuevos estados en la tabla de transiciones. |
| **Barra vs cocina** | Agregar `station` a `Product`; cada pantalla filtra por estación. |
| **Agregar productos a un pedido ya enviado** | Hoy solo se edita un borrador. Opción: "rondas" (cada envío es una ronda con su hora). |
| **Roles nuevos** | `domain/users/roles.js` + `permissions.js` (+ `access.js` si abre una zona). |
| **Reportes** | `features/admin` + casos de uso en `services/`; los repositorios se amplían con consultas. |
| **Fotos o descripciones de productos** | Campos nuevos en `Product` + `domain/menu/menuRules.js`; el documento del menú no necesita migración. |
| **Registro cerrado** | Si el restaurante prefiere solo invitaciones, bastaría una variable que desactive `POST /auth/register` y oculte "Crear cuenta". |

## 11. Decisiones pendientes

**Decididas:** servidor propio en **Render** (plan `0.5c-512mb`) con la base de
datos en **Supabase** (Postgres, conexión por Session pooler); acceso por
cuenta con rol asignado por el administrador.

1. **Cambiar la propia contraseña** desde la app (hoy se hace con un enlace del
   administrador) y editar nombre/usuario de una cuenta.
2. **Modo sin conexión:** hoy, sin red, enviar un pedido falla con `network`
   (el borrador se conserva y se puede reintentar). Falta una cola de envíos
   pendientes en la tablet de caja.
3. **Aviso sonoro/vibración** en cocina cuando llega un pedido nuevo (hoy solo
   se resalta la tarjeta).
4. **Reglas de cancelación:** ¿cocina debe confirmar cancelaciones de pedidos
   ya en preparación? Hoy cajero y admin cancelan directamente. Tampoco hay
   botón de cancelar en la pantalla de caja todavía.
5. **Menú:** en producción empieza vacío (el administrador lo arma o carga el
   de ejemplo). Falta importar desde un archivo y fotos/descripciones.
6. **Escalado:** el canal en tiempo real vive en un solo proceso. Suficiente
   para un restaurante; con varias instancias haría falta un bus compartido.
7. **Plan de Supabase:** el gratuito pausa el proyecto tras 7 días de poca
   actividad y no ofrece copias descargables. Decidir el plan antes de operar.

## 12. Comandos

```bash
npm start               # app (Expo)
npm run web             # app en el navegador (el servidor acepta localhost por CORS)
npx expo export -p web  # genera dist/ (lo que publica sotos-app)
bash scripts/generate-icons.sh   # íconos desde assets/icon.svg (macOS)
npm test                # pruebas de app y servidor
npm run test:watch
npm run server:install  # instalar dependencias del servidor (una vez)
npm run server:dev      # servidor local en memoria, puerto 10000
npm run server:check-db # verifica la conexión a Supabase (necesita DATABASE_URL)
npx expo install <paquete>   # dependencias de la app con versión compatible
```

`npm test` ejecuta Jest con `--experimental-vm-modules`: las pruebas del
almacén usan PGlite (Postgres real en WebAssembly) y lo necesitan.
