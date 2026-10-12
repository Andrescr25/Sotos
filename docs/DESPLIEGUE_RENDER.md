# Despliegue: Render (servidor) + Supabase (base de datos)

| Pieza | Dónde vive | Qué es |
|---|---|---|
| `sotos-server` | **Render** (plan `0.5c-512mb`, $7/mes) | Servicio Node: API HTTP + WebSocket en tiempo real |
| Base de datos | **Supabase** | Postgres: pedidos, cuentas y sesiones |

El servidor se conecta a Supabase **directamente por Postgres**. No usa la API
REST de Supabase, ni sus claves `anon`/`service_role`, ni Supabase Auth: las
cuentas y los roles los maneja el propio servidor.

Render crea el servicio desde [`render.yaml`](../render.yaml).

## Antes de empezar: planes

| Pieza | Plan gratuito | Consecuencia para un restaurante |
|---|---|---|
| Servicio en Render | Se duerme tras 15 min sin tráfico; despertar tarda ~1 min | El primer pedido tras un rato tranquilo tardaría ~1 minuto en llegar a cocina. Por eso el `render.yaml` usa el plan de $7. |
| Proyecto en Supabase | Se **pausa** si tiene poca actividad durante 7 días (se puede reanudar hasta 90 días después); sin copias de seguridad descargables | Sirve para probar. Si el local cierra una semana, la base se pausa y el sistema deja de responder hasta reanudarla. |

Con un plan de pago de Supabase el proyecto no se pausa y hay opciones de
respaldo. Para operar de verdad, revisa precios y respaldos en
https://supabase.com/pricing.

## Paso 1 — Supabase

1. Crea un proyecto en https://supabase.com/dashboard. Elige la región más
   cercana al restaurante. El `render.yaml` usa la región **Ohio** de Render,
   pensada para un proyecto de Supabase en `us-east-2`; si tu proyecto está en
   otra región, cambia `region:` en `render.yaml` **antes** de crear el servicio
   (después no se puede cambiar).
2. Define una **contraseña de base de datos** fuerte. Evita caracteres como
   `@ # / ? :`; si los usas, hay que codificarlos en la URL (`%40`, `%23`…).
3. Pulsa **Connect** y copia la cadena de **Session pooler** (puerto `5432`):

   ```
   postgres://postgres.<ref-del-proyecto>:<CONTRASEÑA>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```

   > ⚠️ **No uses la "Direct connection"** (`db.<ref>.supabase.co`). Es solo
   > IPv6 y Render solo tiene IPv4: no conectaría. El servidor te avisa en el
   > log si detecta esa cadena.
4. **Recomendado:** desactiva la Data API (**Integrations → Data API → Enable
   Data API: off**). El servidor no la usa y así las tablas no quedan expuestas
   por ninguna vía. Aun con la API activa, el servidor deja las tablas
   cerradas (ver "Seguridad de las tablas").
5. Nunca pegues la clave `service_role` en ningún lado: este proyecto no la
   necesita.

Las tablas se crean solas la primera vez que arranca el servidor.

### Verifica la conexión desde tu computadora (recomendado)

Antes de desplegar, comprueba que la cadena funciona. El comando no imprime la
contraseña; escríbela con `read -s` para que no quede en el historial del
terminal ni a la vista:

```bash
read -s -p "Contraseña de la base de datos: " DBPW; echo
DATABASE_URL="postgresql://postgres.<ref>:${DBPW}@aws-0-<region>.pooler.supabase.com:5432/postgres" \
  npm run server:check-db            # solo revisa
# agrega  -- --init  para crear las tablas ahora mismo
unset DBPW
```

Muestra el servidor, el usuario, el estado del cifrado, qué tablas existen y si
tienen RLS, y explica en español los fallos típicos (contraseña incorrecta,
usuario sin el prefijo `postgres.<ref>`, conexión directa en vez de pooler,
proyecto pausado).

> Si la contraseña tiene `@ # / ? :`, codifícalos en la URL (`%40`, `%23`…) o,
> más simple, cámbiala por una sin esos caracteres.

## Paso 2 — Render

1. **Sube el código a GitHub o GitLab.** Render despliega desde un repositorio
   git. Debe incluir `src/` y `server/` (el servidor reutiliza `src/domain`).
   No definas "Root Directory" en Render.
2. En Render: **New → Blueprint**, conecta el repositorio y elige la rama.
   Render lee `render.yaml` y propone crear solo `sotos-server`.
3. Render pide tres valores (no se guardan en el repositorio):
   - `DATABASE_URL`: la cadena del Session pooler del paso 1.
   - `ADMIN_USERNAME`: usuario del **primer administrador** (ej. `dueno`).
   - `ADMIN_PASSWORD`: su contraseña (mínimo 6 caracteres; usa una larga).

   Confirma con **Apply**.
4. Espera a que termine el primer despliegue. Prueba
   `https://<tu-servicio>.onrender.com/health`: debe responder `{"status":"ok"}`.
5. En Supabase → **Table Editor** deben aparecer `orders`, `order_counters`,
   `users` y `sessions`.

## Paso 3 — La app

En tu computadora, crea `.env.local` (basado en `.env.example`):

```
EXPO_PUBLIC_API_URL=https://<tu-servicio>.onrender.com
```

Reinicia Expo con `npx expo start --clear`, o genera la app para las tablets, y
entra con el administrador inicial.

> `EXPO_PUBLIC_*` se incrusta en la app al compilarla. Si cambias la URL hay
> que volver a generar la app.

## Cómo se da acceso al personal

El personal **no elige su rol**. El flujo es:

1. La persona abre la app y toca **Crear cuenta** (nombre, usuario y contraseña).
2. Queda en **“Acceso pendiente”**: no puede ver pedidos ni nada más.
3. El administrador entra a **Usuarios y accesos**, ve la cuenta nueva (aparece
   arriba y resaltada) y le asigna **Cajero**, **Cocinero** o **Administrador**.
4. La pantalla de la persona cambia sola, sin volver a iniciar sesión, y la lleva
   a su zona.

El administrador también puede quitar el acceso (“Sin acceso”) o deshabilitar la
cuenta: se cierra su sesión al instante. Siempre debe quedar al menos un
administrador activo.

## Qué pasa en el servidor

- Al arrancar crea las tablas si no existen (no hay migraciones manuales).
- **Primer administrador:** si no existe ninguno, se crea con `ADMIN_USERNAME` y
  `ADMIN_PASSWORD`. Si el usuario ya existía como cuenta normal, se promueve.
  Una vez creado, esas variables dejan de usarse y se pueden borrar.
- `NODE_ENV=production` **exige** `DATABASE_URL`: el servidor se niega a arrancar
  sin ella, en vez de funcionar en memoria y perder pedidos. Tampoco arranca si
  no hay ningún administrador y faltan `ADMIN_*`.
- **Seguridad de la cuenta:** las contraseñas se guardan con scrypt (nunca en
  claro), las sesiones usan tokens aleatorios de los que solo se guarda el hash,
  y el inicio de sesión limita los intentos por IP. El rol de cada acción se lee
  de la base de datos en cada petición.
- La numeración (`#001`, `#002`…) reinicia cada día según `BUSINESS_TZ`
  (`America/Costa_Rica`).
- Cuando Render despliega o reinicia, las conexiones se cortan. Las tablets se
  reconectan solas, mantienen su sesión y la pantalla de cocina recarga su lista.

## Seguridad de las tablas

En Supabase, las tablas del esquema `public` creadas por SQL quedan accesibles
desde internet por la API REST del proyecto si no tienen RLS: cualquiera con la
URL del proyecto podría leer o modificar `users` (hashes de contraseña) y
`orders`. Por eso, al arrancar, el servidor en **cada tabla**:

- activa **Row Level Security** sin políticas (todo denegado para `anon` y
  `authenticated`), y
- les **revoca todos los permisos** a `anon`, `authenticated` y `service_role`.

El servidor entra como `postgres` (propietario), que no se ve afectado. Esto
está cubierto por pruebas (`server/src/store/schemaSecurity.test.js`). Si
agregas tablas nuevas, hazlas pasar por `lockDown` en `server/src/store/schema.js`.

En **Supabase → Advisors → Security** no deberían aparecer avisos de "RLS
disabled" para estas tablas.

## Variables de entorno del servidor

| Variable | Obligatoria | Para qué |
|---|:-:|---|
| `DATABASE_URL` | sí (producción) | Cadena del Session pooler de Supabase |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | solo el primer arranque | Primer administrador |
| `ADMIN_NAME` | no | Nombre para mostrar del primer administrador |
| `BUSINESS_TZ` | no | Zona horaria (`America/Costa_Rica`) |
| `DATABASE_POOL_MAX` | no | Conexiones al pooler (por defecto 5) |
| `DATABASE_SSL_CA` | no | Certificado raíz de Supabase (PEM) para **verificar** al servidor |
| `DATABASE_SSL` | no | `true`/`false`. Por defecto activo salvo en localhost |
| `SESSION_TTL_DAYS` | no | Duración de una sesión (30) |

La conexión siempre va **cifrada**. Sin `DATABASE_SSL_CA` no se verifica la
identidad del servidor de base de datos; para endurecerlo, descarga el
certificado raíz desde Supabase (**Database → Settings → SSL Configuration**) y
pégalo en `DATABASE_SSL_CA` (los saltos de línea pueden escribirse como `\n`).

## Desarrollo local

```bash
npm run server:install    # una sola vez
npm run server:dev        # servidor en http://localhost:10000, en memoria
```

En memoria el servidor crea cuentas de ejemplo (`admin/admin123`,
`cajero/cajero123`, `cocinero/cocinero123` y `pendiente/pendiente123`, esta
última sin rol). No toca Supabase.

En `.env.local` pon la IP de tu computadora (no `localhost`, que sería la
propia tablet): `EXPO_PUBLIC_API_URL=http://192.168.1.50:10000`.

Para probar con la app en el **navegador** (`npm run web`) el servidor debe
permitir CORS: `CORS_ORIGIN='*' npm run server:dev`. Las apps nativas no lo
necesitan, y en producción no debe definirse.

Para probar contra tu Supabase desde tu computadora, define `DATABASE_URL`
con la cadena del Session pooler al arrancar el servidor local. Sin
`EXPO_PUBLIC_API_URL` la app corre sola, en memoria, con las mismas cuentas de
ejemplo.

> Android bloquea HTTP sin cifrar en apps de producción. En desarrollo con
> Expo Go funciona; en producción siempre se usa `https://` de Render.

## Límites conocidos

- **Una sola instancia.** El canal en tiempo real vive en la memoria del
  proceso; no escalar a varias instancias sin añadir un bus compartido. El
  limitador de intentos de login también es por proceso.
- **Dos servicios, dos facturas.** Si Supabase pausa el proyecto (plan gratuito)
  o hay una caída, el servidor responde con errores aunque Render esté activo.
- **Sin recuperación de contraseña.** Si alguien la olvida, hoy el administrador
  debe deshabilitar la cuenta y la persona crear otra. Falta “restablecer
  contraseña” desde administración.
- **Respaldos.** Los gestiona Supabase según tu plan; en el gratuito no hay
  copias descargables. Para datos que importen, usa un plan de pago o exporta
  periódicamente.
- **Sin depuración de pedidos antiguos.** La tabla crece; cuando existan
  reportes se definirá la retención.
