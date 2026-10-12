# Arquitectura — Sistema de pedidos (caja ↔ cocina)

Documento vivo. Describe cómo está organizado el proyecto, qué entidades
existen, cómo fluye un pedido y dónde se enchufan las funciones futuras.

## 1. Alcance de la primera etapa

**Incluye:** menú (categorías, productos, extras, bebidas), pedidos con
observaciones, cálculo de totales, envío a cocina, estados, quién tomó el
pedido y cuándo, roles y permisos (estructura).

**No incluye todavía:** facturación, inventario, reportes, cierres de caja,
contabilidad, mesas, pagos, división de cuentas, delivery.

## 2. Stack

| Pieza | Elección |
|---|---|
| Lenguaje | JavaScript (JSDoc para documentar formas de datos) |
| App | React Native con Expo (SDK 57), pensada para tablets |
| Navegación | Expo Router (rutas en `src/app/`) |
| Iconos | `@react-native-vector-icons/ionicons` (envuelto en `shared/ui/Icon`) |
| Backend | Node (HTTP + WebSocket) + Postgres, desplegado en **Render** (ver `docs/DESPLIEGUE_RENDER.md`) |
| Pruebas | Jest: proyecto `app` (jest-expo) y proyecto `server` (`npm test`) |
| Moneda | Colones enteros (sin decimales), formato `₡12.500` |

Convención de idioma: **código en inglés, textos de interfaz y documentación en español.**

## 3. Estructura de carpetas

```
src/
├── app/            Rutas (Expo Router). Delgadas: solo montan una pantalla de features/.
│   ├── _layout.js
│   ├── index.js        Selector de rol provisional (se reemplaza por login)
│   ├── caja/  cocina/  admin/
│
├── features/       UI por área/rol: pantallas, componentes y hooks propios.
│   ├── cashier/   kitchen/   admin/
│
├── services/       Casos de uso: combinan dominio + repositorios.
│   └── orderService.js     sendToKitchen, startPreparation, markReady, ...
│
├── domain/         Reglas de negocio. JavaScript puro: sin React, sin red, sin I/O.
│   ├── orders/     pedido, líneas, estados, precios, errores
│   ├── menu/       categorías, productos, extras, consultas del menú
│   └── users/      roles y permisos
│
├── data/           Acceso a datos detrás de contratos.
│   ├── contracts.js        OrderRepository, MenuRepository
│   ├── memory/             En memoria (desarrollo sin servidor y pruebas)
│   ├── remote/             Habla con el servidor (HTTP + WebSocket, reconexión)
│   ├── seed/               Datos de ejemplo
│   └── index.js            Único lugar donde se elige la implementación activa
│
└── shared/         Utilidades transversales, sin lógica de negocio.
    ├── theme/      Tokens de diseño (colores, espaciado, tipografía...)
    ├── styles/     Estilos reutilizables
    ├── ui/         Componentes base: Text, Button, Icon, Screen...
    └── utils/      money, time, createId, createEventEmitter, deepEqual

server/             Backend (paquete Node independiente, se despliega en Render).
├── src/
│   ├── index.js            Arranque: lee entorno, elige almacén, escucha
│   ├── config.js           Variables de entorno
│   ├── createApp.js        Servidor HTTP + WebSocket
│   ├── http/               Rutas y utilidades HTTP
│   ├── realtime/           Canal WebSocket (autenticación, latido, difusión)
│   └── store/              Almacén de pedidos: Postgres y memoria
└── package.json
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
| **User** | `id`, `name`, `role` (`cashier`/`cook`/`admin`) |
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

## 5. Ciclo de vida del pedido

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

### Permisos por rol

| Permiso | Cajero | Cocinero | Admin |
|---|:-:|:-:|:-:|
| Crear / enviar pedido | ✅ | — | ✅ |
| Ver cocina | — | ✅ | ✅ |
| Empezar preparación / marcar listo | — | ✅ | ✅ |
| Marcar entregado | ✅ | — | ✅ |
| Cancelar | ✅ | — | ✅ |

Fuente de verdad: `domain/orders/orderStatus.js` (transiciones) y
`domain/users/permissions.js` (roles → permisos). Para cambiar una regla se
edita ahí, en un solo lugar.

## 6. Comunicación caja ↔ cocina

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

| Ruta | Función |
|---|---|
| `GET /health` | Estado del servicio (sin clave) |
| `GET /orders?statuses=new,ready` | Lista pedidos |
| `GET /orders/:id` | Un pedido |
| `PUT /orders/:id` | Guarda o avanza un pedido (valida con `checkOrderWrite`) |
| `POST /orders/next-number` | Siguiente número del día (atómico) |
| `WS /realtime` | Eventos `order:saved` hacia las tablets |

Todas (salvo `/health`) exigen la cabecera `x-api-key`; el WebSocket la envía
en su primer mensaje.

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
- Emite `{ type: 'connection', connected }`: al reconectar, la pantalla debe
  **recargar la lista** porque pudo perder eventos.
- `sendToKitchen` es idempotente: reenviar el mismo borrador tras una falla de
  red devuelve el pedido ya guardado, sin duplicarlo.

> Sin `EXPO_PUBLIC_API_URL` la app usa el repositorio en memoria, que solo
> comunica pantallas del mismo dispositivo (útil para desarrollar).

## 7. Estilos

Todo lo visual sale de `shared/theme`. Las pantallas no escriben colores,
márgenes ni tamaños de fuente sueltos.

| Quiero cambiar... | Archivo |
|---|---|
| Colores de marca o de estados | `shared/theme/colors.js` |
| Espaciados y radios | `shared/theme/spacing.js` |
| Tamaño de textos (toda la app) | `shared/theme/typography.js` |
| Tamaño mínimo de botones táctiles / iconos | `shared/theme/sizes.js` |
| Apariencia de botones, textos, pantallas | `shared/ui/*` |
| Patrones repetidos (tarjeta, fila...) | `shared/styles/commonStyles.js` |
| Librería de iconos | `shared/ui/Icon.js` |

## 8. Cómo se agregan las funciones futuras

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
| **Roles nuevos** | `domain/users/roles.js` + `permissions.js`. |
| **Gestión de menú/usuarios/reportes** | `features/admin` + casos de uso en `services/`; los repositorios se amplían con escritura. |

## 9. Decisiones pendientes

**Decidido:** backend propio en **Render** (servicio Node + Postgres). Ver
`docs/DESPLIEGUE_RENDER.md`.

1. **Autenticación por usuario.** Hoy hay una sola clave compartida que viaja
   dentro de la app (no es un secreto fuerte) y el servidor aún no verifica el
   rol de quien hace cada cambio. Opciones: PIN por usuario vs. correo y
   contraseña. Es lo siguiente en seguridad.
2. **Modo sin conexión:** hoy, sin red, enviar un pedido falla con `network`.
   Falta una cola de envíos pendientes en la tablet de caja.
3. **Reglas de cancelación:** ¿cocina debe confirmar cancelaciones de pedidos
   ya en preparación? Hoy cajero y admin cancelan directamente.
4. **Menú desde el servidor:** hoy es un seed en memoria; pasará al backend con
   la administración de productos.
5. **Escalado:** el canal en tiempo real vive en un solo proceso. Suficiente
   para un restaurante; con varias instancias haría falta un bus compartido.

## 10. Comandos

```bash
npm start               # app (Expo)
npm test                # pruebas de app y servidor
npm run test:watch
npm run server:install  # instalar dependencias del servidor (una vez)
npm run server:dev      # servidor local en memoria, puerto 10000
npx expo install <paquete>   # dependencias de la app con versión compatible
```

`npm test` ejecuta Jest con `--experimental-vm-modules`: las pruebas del
almacén usan PGlite (Postgres real en WebAssembly) y lo necesitan.
