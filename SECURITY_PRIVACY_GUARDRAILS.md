# SECURITY_PRIVACY_GUARDRAILS.md

## Propósito
Este archivo define las reglas obligatorias para cualquier cambio funcional, técnico, estructural o visual realizado sobre la app **JJVV**.  
Debe ser leído y respetado antes de implementar nuevas funcionalidades, refactors, cambios de arquitectura, cambios de base de datos o ajustes de UI que puedan afectar seguridad, privacidad o tratamiento de datos.

---

## Regla crítica de contexto
Esta base aplica **exclusivamente** a la app de gestión y organización de **Juntas de Vecinos (JJVV)**.

### Prohibido mezclar contexto con:
- apps de arriendo de canchas
- apps de tenis
- reservas deportivas
- cualquier otro proyecto ajeno a JJVV

Toda propuesta, cambio o validación debe asumir que:
- esta es una app comunitaria
- maneja usuarios, roles y pertenencia a organizaciones/JJVV
- puede manejar datos personales, documentos, tickets, avisos, pagos, encuestas y notificaciones
- ya existe una línea base reforzada de seguridad y privacidad que no debe degradarse

---

## Principios no negociables

### 1. Seguridad primero
Ningún cambio funcional puede debilitar:
- autenticación
- autorización
- aislamiento entre comunidades/JJVV
- control por roles
- RLS
- acceso privado a storage
- manejo de secretos
- validaciones backend para operaciones sensibles

### 2. Privacidad por defecto
Todo cambio debe respetar:
- minimización de datos
- exposición mínima necesaria
- separación entre datos públicos, comunitarios, privados y administrativos
- coherencia con la política de privacidad
- coherencia con disclosures y Data Safety de Google Play

### 3. Mínimo privilegio
Cada usuario, rol, pantalla, query, función o proceso debe acceder solo a lo estrictamente necesario.

### 4. Coherencia legal y operativa
Si un cambio altera datos tratados, permisos, almacenamiento, acceso, visibilidad o lógica administrativa, debe señalarse explícitamente para actualizar:
- política de privacidad
- Data Safety
- disclosures dentro de la app
- términos y condiciones, si aplica

### 5. Cambios seguros y graduales
Preferir:
- cambios pequeños
- cambios reversibles
- migraciones explícitas
- validaciones concretas
- compatibilidad con lo existente

Evitar:
- reescrituras innecesarias
- shortcuts de seguridad
- abrir permisos “solo para que funcione”
- mover lógica sensible al cliente

---

## Restricciones obligatorias

## A. Autenticación y autorización

### Debe mantenerse
- distinción clara entre usuario autenticado y usuario autorizado
- validación real de rol y pertenencia
- restricciones por organización/JJVV
- backend y base de datos como fuente de verdad para permisos

### Prohibido
- confiar solo en ocultar botones en frontend
- permitir acciones críticas por validaciones exclusivamente visuales
- asumir que “si el usuario llegó a la pantalla, puede ejecutar la acción”
- usar datos enviados por el cliente como única prueba de autorización

---

## B. Base de datos y RLS

### Toda tabla sensible debe:
- tener RLS activado
- tener policies explícitas y restrictivas
- respetar aislamiento por organización/JJVV
- respetar permisos por rol
- evitar acceso cruzado entre comunidades

### Si se agregan tablas nuevas:
debe entregarse también:
- definición de tabla
- constraints
- índices
- RLS
- policies
- impacto en privacidad
- impacto en almacenamiento
- impacto en flujos existentes

### Prohibido
- crear tablas sensibles sin RLS
- usar policies amplias por conveniencia
- introducir funciones o views que bypassen RLS sin control estricto
- hacer SELECT/UPDATE/DELETE abiertos a `authenticated` sin restricción real
- dejar tablas auxiliares sensibles sin protección

---

## C. Storage y archivos

### Todo archivo debe evaluarse según:
- quién lo sube
- quién lo puede ver
- a qué organización/JJVV pertenece
- si contiene datos personales o sensibles
- si debe ser privado o comunitario
- si requiere signed URLs o acceso restringido

### Debe mantenerse
- buckets privados cuando corresponda
- control de acceso por rol y organización
- rutas/nombres de archivo seguras
- protección contra acceso indebido a archivos ajenos

### Prohibido
- exponer archivos privados con URLs públicas
- asumir que la UI limita acceso a archivos
- permitir lectura/escritura cruzada entre comunidades
- dejar documentos sensibles disponibles por error

---

## D. Secretos y configuración

### Debe mantenerse
- service role fuera del cliente
- secretos solo en backend/entorno seguro
- variables sensibles fuera del frontend
- separación clara entre variables públicas y privadas

### Prohibido
- exponer service role
- hardcodear secretos
- subir archivos de credenciales al repo
- usar llaves administrativas en cliente mobile/web

---

## E. Datos personales y privacidad

### Todo cambio debe evaluar
- qué datos recopila
- si esos datos son necesarios
- quién los ve
- dónde se almacenan
- cuánto tiempo se conservan
- si se comparten con terceros
- si deben declararse en política/Data Safety

### Clasificación mínima a considerar
- identificación
- contacto
- membresía/comunidad
- tickets/incidencias
- documentos/adjuntos
- pagos/cuotas/finanzas
- auditoría/logs
- notificaciones push
- metadata operativa

### Prohibido
- agregar datos personales sin justificación funcional
- exponer más datos de los necesarios a vecinos o admins
- registrar PII innecesaria en logs
- ampliar visibilidad comunitaria sin declararlo
- pedir permisos del dispositivo sin relación real con la función

---

## F. Roles y visibilidad

### Todo módulo debe definir con precisión:
- qué ve un vecino
- qué ve directiva/admin
- qué ve superadmin, si existe
- qué queda privado
- qué queda restringido por comunidad
- qué queda restringido por estado de membresía

### Prohibido
- dar acceso administrativo por accidente
- mostrar datos de una JJVV a otra
- mostrar datos de tickets, pagos, documentos o auditoría a roles no autorizados
- asumir que el backend se arregla solo

---

## G. Funciones sensibles / backend / Edge Functions / RPC

### Toda operación sensible debe validarse en backend si toca:
- cambios de rol
- membresías
- aprobaciones
- pagos/cuotas
- documentos
- auditoría
- anuncios masivos
- notificaciones push
- datos sensibles de usuarios

### Debe validarse siempre:
- `auth.uid()`
- rol real
- organización/JJVV
- pertenencia
- parámetros del cliente
- impacto en privacidad

### Prohibido
- confiar ciegamente en parámetros del cliente
- exponer operaciones privilegiadas a usuarios comunes
- crear bypasses “temporales” para admin
- usar funciones privilegiadas sin trazabilidad

---

## H. Auditoría y trazabilidad

### Debe mantenerse, cuando aplique:
- registro de acciones administrativas relevantes
- trazabilidad de operaciones sensibles
- control de cambios importantes

### Pero debe evitarse:
- almacenar más PII de la necesaria
- snapshots excesivos de contenido sensible
- auditoría sin control de acceso

### Si se modifica auditoría:
debe indicarse también el impacto en privacidad y retención.

---

## I. Rendimiento y estabilidad

### Todo cambio relevante debe revisar:
- consultas nuevas
- joins pesados
- índices faltantes
- realtime innecesario
- duplicación de lecturas
- pantallas que traen datos excesivos
- almacenamiento local excesivo

### Prohibido
- resolver rendimiento abriendo permisos
- duplicar datos sensibles por conveniencia
- traer datasets completos si no se necesitan
- usar realtime indiscriminadamente

---

## J. Política de privacidad / Data Safety / disclosures

### Si un cambio introduce o modifica:
- datos personales tratados
- permisos del dispositivo
- visibilidad de datos
- archivos o documentos
- push notifications
- pagos o información financiera
- analytics, tracking o terceros
- retención o eliminación de datos

entonces es obligatorio indicar:
1. si la política de privacidad debe actualizarse
2. si Data Safety debe actualizarse
3. si se requiere nuevo disclosure dentro de la app
4. si cambian términos y condiciones

### Prohibido
- agregar un permiso y no declararlo
- ampliar tratamiento de datos sin revisar política
- usar cámara, archivos, notificaciones o ubicación sin texto claro al usuario

---

## Proceso obligatorio antes de implementar cambios

Antes de hacer cualquier cambio, se debe responder:

1. ¿Qué módulos se verán afectados?
2. ¿Qué tablas, policies, funciones o buckets toca?
3. ¿Qué roles están involucrados?
4. ¿Se agregan o exponen nuevos datos personales?
5. ¿Cambia algo en privacidad, almacenamiento o permisos?
6. ¿Impacta política de privacidad o Data Safety?
7. ¿Qué validaciones manuales habrá que probar al final?

Si alguna respuesta implica riesgo de seguridad o privacidad, debe explicitarse antes de implementar.

---

## Formato obligatorio de respuesta para cualquier cambio

Toda propuesta o implementación debe responder en este orden:

1. **Alcance del cambio**
2. **Componentes afectados**
   - pantallas
   - tablas
   - functions / RPC / Edge Functions
   - storage
   - roles
3. **Riesgos de seguridad/privacidad**
4. **Cambios propuestos**
5. **Cambios aplicados**
6. **Migraciones SQL necesarias**
7. **Impacto en política de privacidad / Data Safety / disclosures**
8. **Validaciones manuales recomendadas**
9. **Riesgos pendientes**

Si no hay impacto en privacidad o seguridad, debe decirse explícitamente.

---

## Formato obligatorio de validación final

Antes de cerrar cualquier tarea, se debe validar explícitamente:

- que no se abrió acceso cruzado entre comunidades
- que no se debilitó RLS
- que no quedó autorización sensible solo en frontend
- que no se expusieron archivos privados
- que no se agregaron datos personales sin declararlo
- que no se introdujeron permisos del dispositivo sin disclosure
- que no se rompió la coherencia con la política de privacidad actual
- que no se expusieron secretos ni credenciales

Si detectas impacto, detállalo y propón el ajuste exacto.
---

## Casos que obligan revisión incremental de seguridad/privacidad

Si el cambio toca cualquiera de estos puntos, debe hacerse una revisión incremental:

- tablas nuevas
- cambios de RLS
- nuevas policies
- nuevos buckets o rutas de storage
- nuevos roles o permisos
- cambios en visibilidad entre vecinos
- pagos/cuotas/finanzas
- tickets/incidencias/documentos
- notificaciones push
- cámara, galería, archivos o permisos del dispositivo
- eliminación de cuenta o retención de datos
- funciones administrativas
- integraciones con terceros

---

## Casos que obligan actualización documental

Se debe actualizar documentación funcional o legal si cambia cualquiera de estos:

- datos tratados
- base legal/operativa del tratamiento
- permisos del dispositivo
- terceros involucrados
- eliminación de cuenta
- retención de datos
- visibilidad comunitaria
- módulos financieros
- subida de archivos/documentos
- sistema de notificaciones push

Documentos a revisar:
- Política de Privacidad
- Data Safety de Google Play
- disclosures in-app
- Términos y Condiciones, si aplica

---
