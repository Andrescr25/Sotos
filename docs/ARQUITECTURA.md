# Arquitectura — Sistema de pedidos (caja ↔ cocina)

Documento vivo. Describe cómo está organizado el proyecto, qué entidades
existen, cómo fluye un pedido y dónde se enchufan las funciones futuras.

## 1. Alcance de la primera etapa

**Incluye:** menú (categorías, productos, extras, bebidas), pedidos con
observaciones, cálculo de totales, envío a cocina, estados, quién tomó el
pedido y cuándo, cuentas con acceso asignado por el administrador, pantallas de
caja, cocina y administración de usuarios.

**No incluye todavía:** facturación, inventario, reportes, cierres de caja,
contabilidad, mesas, pagos, división de cuentas, delivery, gestión de productos.

## 2. Stack

| Pieza | Elección |
|---|---|
| Lenguaje | JavaScript (JSDoc para documentar formas de datos) |
| App | React Native con Expo (SDK 57), pensada para tablets |
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
│   ├── cashier/    toma de pedidos y entrega
│   ├── kitchen/    tablero de cocina
│   ├── orders/     piezas compartidas: lista en vivo, detalle de líneas, estado
│   └── admin/      inicio de administración y usuarios y accesos
│
├── services/       Casos de uso: combinan dominio + repositorios.
│   └── orderService, authService, userService, menuService
│
├── domain/         Reglas de negocio. JavaScript puro: sin React, sin red, sin I/O.
│   ├── orders/     pedido, líneas, estados, precios, integridad, errores
│   ├── menu/       categorías, productos, extras, consultas del menú
│   └── users/      roles, permisos, acceso por zona, reglas de cuentas
│
├── data/           Acceso a datos detrás de contratos.
│   ├── contracts.js        Order/Auth/User/MenuRepository
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
    ├── styles/     Estilos reutilizables
    ├── ui/         Componentes base: Text, Button, TextField, Sheet, Stepper...
    ├── errors/     AppError y mensajes para el usuario
    ├── hooks/      useNow
    └── utils/      money, time, createId, createEventEmitter, deepEqual

server/             Backend (paquete Node independiente, se despliega en Render; usa Postgres de Supabase).
└── src/
    ├── index.js            Arranque: entorno, almacenes, administrador inicial
    ├── config.js           Variables de entorno
    ├── createApp.js        Servidor HTTP + WebSocket
    ├── auth/               Registro, login, sesiones, asignación de acceso
    ├── security/           Hash de contraseñas (scrypt) y tokens
    ├── http/               Rutas de auth, usuarios y pedidos; permisos; límite de intentos
    ├── realtime/           Canal WebSocket (sesión, latido, difusión por rol)
    └── store/              Almacenes de pedidos y de usuarios: Postgres y memoria
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
               └───< StatusChange               (statusHistory)
```

| Entidad | Campos clave |
|---|---|
| **Category** | `id`, `name`, `icon`, `sortOrder`, `active` |
| **Product** | `id`, `categoryId`, `name`, `kind` (`dish`/`drink`), `price`, `extraIds[]`, `sortOrder`, `active` |
| **Extra** | `id`, `name`, `price`, `active` (reutilizable entre productos) |
| **User** | `id`, `username`, `name`, `role` (`cashier`/`cook`/`admin` o **`null`**), `active`, `createdAt` |
| **Order** | `id`, `number`, `type`, `tableId`, `status`, `items[]`, `note`, `createdBy`, `createdAt`, `updatedAt`, `statusHistory[]`, `totals` |
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

## 5. Acceso y roles

**El personal no elige ni conoce su rol.** Se registra (o inicia sesión) y es el
**administrador** quien le asigna el acceso.

```
Crear cuenta ──▶ role = null ──▶ "Acceso pendiente"
                       │
        el admin asigna rol (Usuarios y accesos)
                       ▼
        Cajero → /caja     Cocinero → /cocina     Administrador → /admin
```

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
| Crear / enviar pedido | ✅ | — | ✅ |
| Ver cocina | — | ✅ | ✅ |
| Empezar preparación / marcar listo | — | ✅ | ✅ |
| Marcar entregado | ✅ | — | ✅ |
| Cancelar | ✅ | — | ✅ |
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
| `POST /auth/register` | Crea cuenta **sin rol** y abre sesión (público, limitado) | — |
| `POST /auth/login` | Inicia sesión (público, limitado) | — |
| `POST /auth/logout` | Cierra la sesión | sesión |
| `GET /auth/me` | Cuenta actual, con el rol vigente | sesión |
| `GET /users` | Lista de cuentas | administrar usuarios |
| `PATCH /users/:id` | Asigna rol / habilita o deshabilita | administrar usuarios |
| `GET /orders?statuses=new,ready` | Lista pedidos | ver pedidos |
| `GET /orders/:id` | Un pedido | ver pedidos |
| `PUT /orders/:id` | Guarda o avanza un pedido | según la transición |
| `POST /orders/next-number` | Siguiente número del día (atómico) | enviar pedido |
| `WS /realtime` | Eventos en vivo; primer mensaje `{type:'auth', token}` | sesión |

**Eventos en tiempo real:** `order:saved` (a quien puede ver pedidos),
`user:updated` (a la persona cuyo rol o estado cambió), `users:changed` (a los
administradores cuando hay altas o cambios).

**Garantías del servidor**

- **Atómico:** guardar bloquea la fila del pedido en Postgres (`FOR UPDATE`) y
  evalúa las reglas dentro de la misma transacción.
- **Sin pisadas:** una tablet con una copia vieja recibe `409 conflict` y su
  cambio no se aplica (p. ej. caja cancela un pedido que cocina ya inició).
- **Sin datos incoherentes:** se verifican totales, historial y que las líneas
  de un pedido enviado no cambien.
- **Números únicos:** el contador diario es una sola sentencia `UPSERT`.

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
| **Login / Registro** | Usuario y contraseña. Sin selector de rol. |
| **Acceso pendiente** | Cuenta sin rol; se actualiza sola cuando el admin asigna acceso. |
| **Caja** | Categorías → productos → (extras y observaciones) → resumen → enviar. Botón "Listos (n)" para entregar. En pantallas anchas (≥ 900 px) el resumen va a la derecha; en estrechas se apila debajo. |
| **Cocina** | Tablero Nuevos / En preparación / Listos con tarjetas grandes: número, hora, tiempo transcurrido (verde/ámbar/rojo), líneas con extras y observaciones, botón del siguiente paso. |
| **Administración** | Inicio con atajos y aviso de cuentas pendientes; "Usuarios y accesos" para asignar rol y habilitar. |

Los umbrales de color de la cocina están en `features/kitchen/config.js`.

## 9. Estilos

Todo lo visual sale de `shared/theme`. Las pantallas no escriben colores,
márgenes ni tamaños de fuente sueltos.

| Quiero cambiar... | Archivo |
|---|---|
| Colores de marca o de estados | `shared/theme/colors.js` |
| Espaciados y radios | `shared/theme/spacing.js` |
| Tamaño de textos (toda la app) | `shared/theme/typography.js` |
| Tamaño mínimo de botones táctiles / iconos | `shared/theme/sizes.js` |
| Apariencia de botones, textos, campos, ventanas | `shared/ui/*` |
| Patrones repetidos (tarjeta, fila...) | `shared/styles/commonStyles.js` |
| Librería de iconos | `shared/ui/Icon.js` |
| Cuándo una tarjeta de cocina se pone ámbar/roja | `features/kitchen/config.js` |
| Textos de error para el usuario | `shared/errors/messages.js` |

## 10. Cómo se agregan las funciones futuras

| Función | Dónde encaja |
|---|---|
| **Mesas** | Nuevo `domain/tables`. `Order.tableId` y `ORDER_TYPE.DINE_IN` ya existen. |
| **Pagos** | Nuevo `domain/payments` (`Payment` referencia `orderId`). El estado de pago es una dimensión **separada** del estado de cocina, para no mezclar ambos flujos. |
| **División de cuentas** | Agrupar líneas por cuenta (`checkId` en `OrderItem`) y calcular totales por cuenta en `pricing.js`. |
| **Facturación electrónica** | Nuevo `domain/billing`. Los pedidos ya guardan precios y nombres como copia; impuestos (IVA) se calculan en `pricing.js`. |
| **Inventario** | Nuevo `domain/inventory` (recetas/consumo). Reacciona a eventos de `orderService` (p. ej. al pasar a `in_progress`); no modifica el flujo de pedidos. |
| **Para llevar / Delivery** | `ORDER_TYPE` ya los define. Agregar datos de cliente (`customer`) y, para delivery, nuevos estados en la tabla de transiciones. |
| **Barra vs cocina** | Agregar `station` a `Product`; cada pantalla filtra por estación. |
| **Agregar productos a un pedido ya enviado** | Hoy solo se edita un borrador. Opción: "rondas" (cada envío es una ronda con su hora). |
| **Roles nuevos** | `domain/users/roles.js` + `permissions.js` (+ `access.js` si abre una zona). |
| **Gestión de menú / reportes** | `features/admin` + casos de uso en `services/`; los repositorios se amplían con escritura. |
| **Restablecer contraseña** | Acción del administrador en `services/userService` + ruta `PATCH /users/:id`. |

## 11. Decisiones pendientes

**Decididas:** servidor propio en **Render** (plan `0.5c-512mb`) con la base de
datos en **Supabase** (Postgres, conexión por Session pooler); acceso por
cuenta con rol asignado por el administrador.

1. **Restablecer contraseña / editar datos de una cuenta** desde administración.
   Hoy quien la olvida debe crear otra cuenta.
2. **Modo sin conexión:** hoy, sin red, enviar un pedido falla con `network`
   (el borrador se conserva y se puede reintentar). Falta una cola de envíos
   pendientes en la tablet de caja.
3. **Aviso sonoro/vibración** en cocina cuando llega un pedido nuevo (hoy solo
   se resalta la tarjeta).
4. **Reglas de cancelación:** ¿cocina debe confirmar cancelaciones de pedidos
   ya en preparación? Hoy cajero y admin cancelan directamente. Tampoco hay
   botón de cancelar en la pantalla de caja todavía.
5. **Menú desde el servidor:** hoy es un seed en memoria; pasará al backend con
   la administración de productos.
6. **Escalado:** el canal en tiempo real vive en un solo proceso. Suficiente
   para un restaurante; con varias instancias haría falta un bus compartido.
7. **Plan de Supabase:** el gratuito pausa el proyecto tras 7 días de poca
   actividad y no ofrece copias descargables. Decidir el plan antes de operar.

## 12. Comandos

```bash
npm start               # app (Expo)
npm run web             # app en el navegador (necesita CORS_ORIGIN en el servidor)
npm test                # pruebas de app y servidor
npm run test:watch
npm run server:install  # instalar dependencias del servidor (una vez)
npm run server:dev      # servidor local en memoria, puerto 10000
npm run server:check-db # verifica la conexión a Supabase (necesita DATABASE_URL)
npx expo install <paquete>   # dependencias de la app con versión compatible
```

`npm test` ejecuta Jest con `--experimental-vm-modules`: las pruebas del
almacén usan PGlite (Postgres real en WebAssembly) y lo necesitan.
