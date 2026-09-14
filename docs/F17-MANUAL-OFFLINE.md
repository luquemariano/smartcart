# F17 — Checklist manual offline

Esta prueba debe ejecutarse con la aplicación real en Chrome/Edge y DevTools abiertas. No se considera realizada hasta marcar cada casilla con evidencia.

- [ ] Abrir la aplicación online y comprobar `/api/health` responde `{"status":"ok"}`.
- [ ] Iniciar sesión con una cuenta de prueba.
- [ ] Iniciar una compra y agregar un Product online.
- [ ] En DevTools → Network seleccionar `Offline`.
- [ ] Confirmar el indicador `Sin conexión`.
- [ ] Agregar un Product existente.
- [ ] Modificar cantidad y guardar.
- [ ] Modificar precio unitario y guardar.
- [ ] Crear un Product nuevo manual; confirmar que queda disponible en la compra.
- [ ] Si el dispositivo soporta cámara, probar barcode desconocido; si no, validar el pipeline equivalente con alta manual y registrar la cámara física como pendiente.
- [ ] Finalizar la compra offline.
- [ ] Confirmar total local, `Cambios pendientes` y finish pendiente.
- [ ] Volver a `Online`.
- [ ] Confirmar `Sincronizando…` y después `Todo sincronizado`.
- [ ] Recargar la página.
- [ ] Confirmar sesión `completed`, Product server, ítems server, PriceObservations y cero operaciones pendientes.
- [ ] Verificar que repetir la recarga no duplica Product, ítems ni PriceObservations.

Resultado actual: pendiente de ejecución manual del usuario. No se afirma que esta prueba haya sido realizada desde automatización.
