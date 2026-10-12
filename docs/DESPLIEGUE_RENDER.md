# Despliegue en Render

El backend (`server/`) es un servicio Node con HTTP y WebSocket más una base
Postgres. Render crea ambos desde el archivo [`render.yaml`](../render.yaml).

## Antes de empezar: planes

| Pieza | Plan gratuito | Consecuencia para un restaurante |
|---|---|---|
| Servicio web | Se duerme tras 15 min sin tráfico; despertar tarda ~1 min | El primer pedido tras un rato tranquilo tardaría ~1 minuto en llegar a cocina |
| Postgres | **Expira a los 30 días**; 14 días de gracia y luego se borra con todos los datos | Perderías todos los pedidos |

El gratuito sirve para **probar** (se puede cambiar `plan: free` en
`render.yaml`). Para operar de verdad se necesitan los planes de pago que ya
trae el archivo. Precios actuales: https://render.com/pricing

## Pasos

1. **Subir el código a GitHub o GitLab.** Render despliega desde un repositorio
   git. El repositorio debe incluir `src/` y `server/` (el servidor reutiliza
   `src/domain`). No definas "Root Directory" en Render.
2. En el panel de Render: **New → Blueprint**, conecta el repositorio y elige la
   rama. Render lee `render.yaml` y propone crear `sotos-server` y `sotos-db`.
   Confirma con **Apply**.
3. Espera a que termine el primer despliegue. Prueba
   `https://<tu-servicio>.onrender.com/health`: debe responder `{"status":"ok"}`.
4. En el servicio → **Environment**, copia el valor de `API_KEY` (lo generó
   Render).
5. En tu computadora, crea `.env.local` (basado en `.env.example`):

   ```
   EXPO_PUBLIC_API_URL=https://<tu-servicio>.onrender.com
   EXPO_PUBLIC_API_KEY=<la API_KEY de Render>
   ```

6. Reinicia Expo con `npx expo start --clear`. La app ahora usa el servidor:
   un pedido enviado desde una tablet aparece en la otra.

> Las variables `EXPO_PUBLIC_*` se incrustan en la app al compilarla. Si
> cambias la URL o la clave hay que volver a generar la app.

## Qué pasa en el servidor

- Al arrancar crea las tablas si no existen (no hay migraciones manuales).
- `NODE_ENV=production` **exige** `DATABASE_URL` y `API_KEY`: el servidor se
  niega a arrancar sin ellas, en vez de funcionar en memoria y perder pedidos.
- La numeración (`#001`, `#002`…) reinicia cada día según `BUSINESS_TZ`
  (`America/Costa_Rica`).
- Cuando Render despliega o reinicia, las conexiones se cortan. Las tablets se
  reconectan solas y la pantalla de cocina recarga su lista.

## Desarrollo local

```bash
npm run server:install    # una sola vez
npm run server:dev        # servidor en http://localhost:10000, en memoria
```

En `.env.local` pon la IP de tu computadora (no `localhost`, que sería la
propia tablet): `EXPO_PUBLIC_API_URL=http://192.168.1.50:10000`.

Sin `API_KEY` el servidor local acepta cualquier cliente. Para probar con base
de datos real localmente define `DATABASE_URL` apuntando a un Postgres.

> Android bloquea HTTP sin cifrar en apps de producción. En desarrollo con
> Expo Go funciona; en producción siempre se usa `https://` de Render.

## Límites conocidos

- **Una sola instancia.** El canal en tiempo real vive en la memoria del
  proceso; no escalar a varias instancias sin añadir un bus compartido.
- **Sin autenticación por usuario.** Solo una clave compartida que viaja dentro
  de la app: sirve para que el servicio no quede abierto a cualquiera, no como
  seguridad fuerte. Pendiente: inicio de sesión por usuario/PIN.
- **Sin respaldo propio.** Revisa en el panel de Render qué respaldos incluye
  tu plan de Postgres.
- **Sin depuración de pedidos antiguos.** La tabla crece; cuando existan
  reportes se definirá la retención.
