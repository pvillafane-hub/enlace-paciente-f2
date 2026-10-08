# Módulo de doctor: correcciones del 8 de octubre de 2026

Alcance: copia independiente `enlace-salud-mejoras`, rama `mejoras/assessment`.

## Cambios

- Reportes usa selección explícita y una proyección adicional de los datos enviados al navegador. Excluye hashes de contraseñas, correo, alergias, nacimiento y claves de almacenamiento del listado de actividad.
- Pacientes activos se filtran por estado y rol. El total de estudios utiliza count, independiente de los últimos 20 documentos.
- Sin documentos se muestra como ausencia de información, sin inventar 999 días de inactividad. Se retira el indicador fijo de disponibilidad del sistema.
- Alertas pendientes e historial se consultan y paginan por separado. Resolver conserva la operación autenticada y auditada, verifica paciente activo y exige confirmación en la pantalla.
- Abrir un expediente desde la campana no resuelve alertas. Los datos iniciales de la campana filtran autorizaciones vigentes y paciente activo.
- QR muestra el campo name del contrato, evita callbacks simultáneos, comprueba respuestas, reinicia al escanear otro paciente y muestra resultados de solicitud.
- Solicitudes separa estados mediante filtro y páginas de 50 registros. El historial no afirma que todas estén autorizadas.
- Expediente distingue fecha de estudio de actividad de carga. Medicamentos se describe como documentos, no como una prescripción estructurada.

## Verificación

- 47 pruebas: 41 Vitest y 6 Node, aprobadas.
- Build de producción y revisión de tipos aprobados.
- ESLint sobre reportes, alertas, solicitudes, layout, campana y nuevas utilidades/pruebas sin errores. El expediente conserva advertencias previas de any.
- Pruebas de regresión comprueban exclusión de datos sensibles en la proyección, ausencia de fechas ficticias, consulta separada de alertas y rechazo de un paciente que intenta cargar el panel de doctor.

## Pendiente, no implementado ni verificado

- Prueba de extremo a extremo con cuentas sintéticas Doctor/Paciente: consentimiento, revocación, carga y lectura privada de documentos, alertas y Reportes.
- Cámara y permisos del escáner QR en dispositivos reales.
- Generación automática de alertas: requiere definir disparadores y operación programada; estas correcciones no generan alertas nuevas.
- Reglas comerciales de licencias y excepciones asistenciales. No se introduce bloqueo nuevo de expedientes por pago.
- Invitación/reclamación de pacientes nuevos y entrega de correo.
- Paginación de lista completa de pacientes y expedientes.
- Medicación estructurada, asignación de responsable y motivos de resolución de alertas.

No se migran cuentas ni documentos de la aplicación original. No hay cambios de esquema de base de datos en esta entrega.
