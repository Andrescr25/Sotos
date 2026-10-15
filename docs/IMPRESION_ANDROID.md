# Impresión de tickets desde una tablet Android

El sistema ofrece imprimir el comprobante **después de confirmar que el pedido
se guardó y se envió a cocina**. Se imprime desde Chrome o la app web instalable,
mediante el servicio de impresión de Android.

La factura electrónica de Hacienda se implementará en otra etapa, según lo
acordado. El ticket actual muestra «Comprobante del pedido» y no presenta un
consecutivo fiscal, impuestos calculados, un pago confirmado ni una aceptación
que el sistema todavía no genera.

## Flujo de Caja

1. Armar el pedido y escribir el nombre del cliente.
2. Enviar a cocina. Si falla el envío, se conserva el borrador y no se ofrece
   imprimir un comprobante de ese pedido.
3. Se abre el resumen del pedido confirmado: elegir papel de **80 mm** o **58 mm**.
4. Pulsar **Imprimir comprobante**. Se abre una pestaña con solo el ticket y el
   cuadro de impresión del navegador.
5. Seleccionar la impresora y el papel correspondiente, y confirmar en Android.
6. Cerrar la pestaña del ticket para volver a Caja; usar **Seguir tomando pedidos**.

Cancelar o fallar al imprimir no cancela el pedido. Reimprimir tampoco crea uno
nuevo. El botón **Comprobante #…** permite volver a abrir el último pedido enviado
mientras se conserva la pantalla de Caja. Los pedidos que ya están en **Listos**
también tienen su botón de impresión, incluso tras recargar la página. Todavía no
hay un historial de comprobantes entregados para reimprimir pedidos anteriores.

El ticket conserva los nombres y precios guardados con el pedido, cantidades,
extras con su cantidad propia, observaciones, nombre del cliente, persona que lo
atendió, fecha/hora en Costa Rica y total en colones. No depende del menú vigente.

## Equipo recomendado y comparación

Consulta realizada el **14 de octubre de 2026**. Precios publicados;
confirmar IVA, envío, garantía y un eventual costo del servicio de impresión.

| Modelo | Precio anunciado en Costa Rica | Evaluación para este sistema |
|---|---:|---|
| **3nStar RPT004, USB + Ethernet, 80 mm** | **₡36.000 en ICB / ₡37.900 en Compu Store** | Primera candidata por precio, Ethernet y documentación del fabricante sobre Android y emulación ESC/POS. |
| Xprinter XP-80T, USB + LAN, 80 mm | ₡28.000 | Alternativa económica. Confirmar la variante, emulación y prueba con el controlador antes de elegirla. |
| Epson TM-T20IV-SP C31CL47022, USB + Ethernet + serial | ₡95.100 | Alternativa de mayor presupuesto con documentación y herramientas del fabricante. No es necesario ese presupuesto para empezar a validar el flujo. |

Fuentes de precio: [3nStar RPT004 en ICB](https://icbtechscr.com/productos/impresora-de-recibos-3nstar-rpt004-termica-aut-80mm-usb-ethernet),
[3nStar RPT004 en Compu Store](https://compustorecr.com/product/impresora-3nstar-rpt004-termica-automatica-usb-y-ethernet-para-punto-venta/),
[Xprinter XP-80T](https://www.intelec.co.cr/impresora-termica-xprinter-termica-para-recibos-80mm/),
[Epson TM-T20IV](https://www.intelec.co.cr/impresora-termica-epson-tm-t20iv-usb-ethernet-serial/).
Características técnicas: [ficha oficial 3nStar RPT004](https://3nstar.com/producto/impresora-termica-directa-de-recibos-de-80mm-rpt004/?lang=es),
[ficha oficial de la Epson con el SKU local](https://mediaserver.goepson.com/ImConvServlet/imconv/87486a1da65bdbbf61277b857f5e1f0394e36d88/original?assetDescr=Especificaciones_TM-T20IV-SP.pdf).

El catálogo de Intelec también mostró ₡33.500, pero su ficha individual mostró
₡42.600 y posteriormente redirigió a una página 404. Por esa discrepancia, se
usan las ofertas de ICB y Compu Store como referencias para comparar.

La recomendación RPT004 se basa en precio y especificaciones, no en pruebas
comparativas de durabilidad. Antes de comprar, confirmar con el vendedor la
variante Ethernet, garantía y una prueba con la tablet, el servicio de impresión
y los rollos que se utilizarán.

## Conexión propuesta

```text
Tablet Android / Chrome
        │ Wi-Fi
      Router ─── cable Ethernet ─── Impresora térmica 80 mm
        │
      Internet para enviar pedidos al servidor
```

La impresora no necesita tener Wi-Fi propio: su puerto Ethernet la conecta a la
misma red que usa la tablet. Evitar una red de invitados que aísle los equipos.
La impresión usa el servicio instalado en Android; el navegador no envía comandos
directamente al puerto de la impresora ni requiere configurar ese acceso en Render.

Para impresoras térmicas ESC/POS, **RawBT** es una opción a evaluar como servicio de
impresión de Android. Su ficha oficial describe impresión estándar desde el
navegador y conexiones Bluetooth, USB y Ethernet/Wi-Fi mediante AppSocket,
normalmente puerto **9100**. Es una aplicación con compras integradas; revisar la
licencia disponible y hacer la prueba antes de pagar. La compatibilidad del
modelo exacto y el corte del papel se confirman en la configuración/prueba real.
[RawBT en Google Play](https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter).

Mopria sirve para impresoras certificadas por Mopria; tener Ethernet por sí solo
no convierte una térmica ESC/POS en una impresora Mopria.
[Impresión desde Android y catálogo certificado](https://mopria.org/print-from-android).

## Configuración inicial

1. Conectar impresora y router por Ethernet y obtener la IP según el manual del
   equipo. Reservar esa IP en el router para evitar que cambie.
2. Instalar desde Google Play el servicio compatible. En RawBT, configurar la
   conexión de red con la IP local y el puerto admitido por la impresora.
3. Hacer una impresión de prueba desde el servicio antes de probar el sistema.
4. Activar el servicio en **Ajustes → Dispositivos conectados → Preferencias de
   conexión → Impresión**. La ruta exacta varía entre marcas de tablet.
5. Desde Caja, enviar un pedido de prueba e imprimir su comprobante seleccionando
   el servicio/impresora y el tamaño de papel correcto en Android.
6. Revisar tildes, símbolo ₡, extras, cantidad, total, márgenes y corte; repetir
   con un pedido largo. Desactivar encabezados y pies del navegador si aparecen.

Referencias de Google: [imprimir desde Chrome en Android](https://support.google.com/chrome/answer/1069693?hl=en&co=GENIE.Platform%3DAndroid),
[activar y agregar servicios de impresión](https://support.google.com/pixelphone/answer/3473588?hl=en-AU).

## Si no se abre o no sale papel

- **Ventana bloqueada:** permitir ventanas emergentes de este sitio y reintentar.
- **La pestaña del ticket ya está abierta:** usar su botón de impresión, o el
  menú de Chrome **⋮ → Compartir → Imprimir**. Permanece disponible al cancelar.
- **No aparece la impresora:** revisar servicio de Android, IP, conexión y
  prueba del controlador. No reenviar el pedido a cocina.
- **Tamaño incorrecto:** elegir 58/80 mm en el ticket y en el controlador. El CSS
  ajusta el contenido, pero Android y el controlador deciden el papel físico y
  la longitud del trabajo.
- **Se canceló la impresión:** volver a imprimir el mismo comprobante. El sistema
  no muestra «impreso» porque abrir el diálogo no confirma una impresión física.

Esta integración está implementada para el **navegador**. Las apps nativas de
Expo conservan la vista del comprobante e indican abrir Chrome para imprimir.
No se han hecho pruebas con hardware físico. La validación final requiere la
impresora elegida y la tablet que se usará en el local.
