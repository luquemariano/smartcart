# SmartCart — Definición de producto

## 1. Resumen

SmartCart es una aplicación web responsive, mobile-first y evolutiva hacia PWA, pensada para acompañar a una persona durante una compra en supermercado. Su primera promesa es:

> **“Sabé cuánto llevás gastado antes de llegar a la caja.”**

El producto no es inicialmente un comparador general de supermercados. Es un asistente personal de compra que registra la compra actual y, con el tiempo y el consentimiento de la persona, obtiene capacidad de comparación a partir de sus propios datos.

## 2. Problema

Durante una compra es difícil conocer el total acumulado, controlar un presupuesto y recordar dónde se pagó menos. Las personas suelen calcular mentalmente, usar notas improvisadas o esperar al checkout. Esto genera sorpresas en caja y hace que la información histórica de precios se pierda.

## 3. Usuarios objetivo

- Personas que compran en supermercados y desean controlar el gasto en tiempo real.
- Hogares que necesitan respetar un presupuesto.
- Personas que repiten compras y quieren recordar precios y supermercados.
- Usuarios móviles que pueden tener conectividad irregular dentro del local.

No se requiere conocimiento técnico ni registro para obtener el valor inmediato.

## 4. Modos de uso

### Invitado

El invitado puede completar una compra sin registrarse: elegir o agregar un supermercado, definir opcionalmente un presupuesto, cargar productos con cantidad y precio, modificar o eliminar ítems, ver subtotales y total, finalizar y consultar el resumen. Los datos viven principalmente en el dispositivo y no forman un historial persistente en la nube.

### Usuario registrado

La cuenta agrega persistencia y continuidad: registro/login con Google OAuth o email, historial de compras, supermercados y productos frecuentes, observaciones históricas de precios, listas de compras y sincronización entre dispositivos.

Si una compra comenzó como invitado, el flujo conceptual es `sesión local → registro/login → consentimiento de migración → sincronización → asociación al usuario`. La migración debe ser explícita y no duplicar datos.

## 5. Casos de uso principales

1. Iniciar una compra como invitado.
2. Seleccionar o crear un supermercado.
3. Establecer un presupuesto opcional.
4. Agregar productos manualmente, con cantidad y precio.
5. Consultar subtotal por ítem, total acumulado y diferencia contra presupuesto.
6. Corregir o eliminar productos.
7. Finalizar y revisar el resumen.
8. Registrarse o iniciar sesión y conservar/migrar la compra.
9. Consultar compras anteriores y observar precios pagados.
10. Crear listas y comparar históricamente de forma básica.

## 6. Flujo de compra

`Inicio → Invitado o cuenta → Supermercado → Presupuesto opcional → Sesión activa → Ítems → Total acumulado → Finalizar → Resumen → Guardar/migrar si corresponde`

La alternativa manual debe existir siempre, aun cuando posteriormente se incorporen cámara, OCR o código de barras.

## 7. Valor

- **Inmediato:** saber cuánto se lleva gastado antes de llegar a la caja.
- **Acumulativo:** recordar precios, supermercados y compras para comparar futuras decisiones.

El objetivo UX futuro es registrar un producto habitual en pocos segundos.

## 8. Alcance MVP 1.0

- Entrada como invitado y registro/login opcional.
- Google OAuth y cuenta con email.
- Selección/creación de supermercado.
- Presupuesto opcional.
- Creación y edición de sesión de compra.
- Productos, cantidad, precio, subtotal y total acumulado.
- Modificación y eliminación de ítems.
- Finalización y resumen.
- Persistencia e histórico para usuarios registrados.
- Comparación histórica básica.
- Listas de compras.
- Experiencia mobile-first, PWA y tolerancia básica a conectividad deficiente.

## 9. Fuera de alcance inicial

Quedan fuera del MVP: scraping masivo, integración con todos los supermercados, Precios Claros, Uber/Cabify, promociones bancarias, IA generativa, reconocimiento completo de góndolas, comunidad de precios, pagos, suscripciones, monetización, publicidad y aplicación nativa Android/iOS.

Tampoco se persistirán fotografías de productos o precios: una futura captura podrá procesarse, extraerse a datos estructurados y descartarse.

## 10. Evolución futura

La arquitectura debe poder incorporar comparación del costo total de una lista, precio por kilo/litro/unidad, análisis de variaciones, costo de traslado, promociones, precios comunitarios, fuentes externas, alertas, recomendaciones, OCR, códigos de barras, offline completo y sincronización robusta, sin asumir que esas capacidades forman parte de F0.

## 11. Principios UX y privacidad

Mobile-first, pocos pasos, botones cómodos para una mano, accesibilidad básica, sin bloqueo por registro, registro solicitado cuando aporta valor, diálogos no molestos y no exigir geolocalización. La ubicación será opcional. La seguridad exige autorización server-side, separación por usuario, no confiar en `user_id` del cliente, sesiones protegidas, secretos fuera del repositorio y mínimo dato necesario.
