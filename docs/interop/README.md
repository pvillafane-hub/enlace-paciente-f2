# Enlace Salud — laboratorio de interoperabilidad (fase 3)

Estado: implementación para pruebas sintéticas; **no activada en producción**.
Este módulo recibe resultados finales de laboratorio y los guarda en una bandeja
separada. No crea documentos clínicos, no otorga permisos y no modifica pacientes.
No constituye una certificación FHIR/HL7 ni una integración con un laboratorio real.

## Contrato de pruebas

Endpoint `POST /api/interop/sandbox`; consulta de los últimos 50 recibos de la
fuente configurada mediante `GET /api/interop/sandbox`. Ambas operaciones requieren
`Authorization: Bearer <token>`. El token representa una sola fuente configurada en
el servidor; el remitente no puede escoger otra mediante el cuerpo o un encabezado.

| x-interop-format | Content-Type | Perfil implementado |
| --- | --- | --- |
| api-json | application/json | Contrato propio: resultado final, ID externo, nacimiento, fecha de emisión, código y observaciones |
| fhir-r4 | application/fhir+json | Bundle collection con un Patient, un DiagnosticReport final y Observations numéricas finales, referencias internas fullUrl, códigos LOINC y unidades UCUM |
| hl7-v2 | text/plain | ORU^R01 versión 2.5.1 en modo T; un PID, un OBR final y OBX numéricos finales; separadores estándar; timestamp OBR-22 de 14 dígitos interpretado como UTC por este perfil |

FHIR: un identificador de paciente `urn:enlace:synthetic`, un identificador de
reporte `urn:enlace:synthetic:reports`, un coding LOINC por prueba. No acepta
adjuntos, comparadores de cantidad ni modifierExtension. No descarga URLs.
HL7: solo MSH/PID/OBR/OBX, sin repeticiones/escapes, varios pacientes u órdenes.
No es un servidor MLLP, no produce ACK HL7 y no acepta ADT ni otros tipos.
No es un servidor FHIR REST completo: no implementa búsqueda, SMART on FHIR,
CapabilityStatement ni operaciones transaction. Los perfiles son deliberadamente
limitados y requieren adaptar el contrato al laboratorio que participe.

## Entorno aislado

Usar una **base PostgreSQL exclusiva de pruebas sintéticas**, nunca la base clínica.
No reutilizar secretos o buckets de producción. El módulo no necesita S3.
Configurar fuera de git:

```
DATABASE_URL=<PostgreSQL aislado>
INTEROP_SANDBOX_ENABLED=true
ENLACE_ISOLATED_ENVIRONMENT=true
INTEROP_SANDBOX_SOURCE=TEST-LAB
INTEROP_SANDBOX_TOKEN=<secreto aleatorio de al menos 32 caracteres>
```

En Vercel, `VERCEL_ENV=production` bloquea el endpoint aunque las banderas estén
activadas. No editar esa variable para evadir el bloqueo. Con banderas ausentes
responde 404. No agregar credenciales al navegador o a variables NEXT_PUBLIC_*.
Crear un token exclusivo con un generador criptográfico y rotarlo fuera de git.

Una vez confirmado que DATABASE_URL pertenece a la base aislada, el operador
puede aplicar las migraciones pendientes con `npx prisma migrate deploy` y ejecutar
`npx prisma generate`. Ese comando aplica TODAS las migraciones pendientes: revisar
su estado antes de ejecutarlo. La migración 202610280001_interop_sandbox solamente
crea InteropSandboxReceipt e InteropSandboxEvent; no cambia tablas clínicas.
Después ejecutar la aplicación en local o en un proyecto de pruebas independiente.
La protección existente impide desplegar ramas mejoras/ en el proyecto original.
No se ha aplicado ninguna migración remota durante esta implementación.

## Pruebas

Pruebas automatizadas sin base remota:

```
npx vitest run tests/interop-sandbox.test.ts
npm run typecheck
```

Prueba HTTP con persistencia (requiere el entorno anterior iniciado):

```
INTEROP_TEST_BASE_URL=http://localhost:3000 node scripts/test-interop-sandbox.mjs
```

El script toma INTEROP_SANDBOX_TOKEN del entorno; no lo imprime. Envía únicamente
los fixtures de este directorio, prueba los tres formatos, reenvío, conflicto,
pendiente por identidad y consulta de bandeja. Usa IDs nuevos por ejecución.
No ejecuta migraciones ni borra información. Para probar persistencia tras reinicio,
conservar el ID de recibo y consultar GET después de reiniciar la aplicación.

## Resultado y trazabilidad

- 202: recibo MATCHED o PENDING_REVIEW, **no significa incorporado al expediente**.
- 200: reenvío idéntico reconocido; conserva el mismo ID.
- 409 REPORT_ID_CONFLICT: mismo origen/ID con otro contenido; no sobrescribe.
- 401: credencial ausente o incorrecta.
- 413: cuerpo superior a 128 KiB; el límite también se aplica al stream.
- 415: formato o Content-Type no permitido.
- 422: mensaje fuera del perfil admitido.
- 503: almacenamiento/configuración no disponible; no devuelve datos internos.

Solo `TEST-PATIENT-001`, fecha `2018-04-12`, tiene correspondencia sintética.
Un identificador desconocido o un nacimiento distinto queda PENDING_REVIEW.
No se utiliza coincidencia por nombre ni se consulta User. Los IDs deben empezar
por TEST-; eso es una barrera de pruebas, no un detector de datos personales:
**no enviar información real**, aunque se cambie el identificador.

La restricción única (source, reportId) resuelve reintentos concurrentes entre
procesos. Cada recibo incluye un evento inicial creado atómicamente; reenvíos y
conflictos generan eventos. No se persiste el mensaje crudo: solo la representación
normalizada. El GET permite inspección técnica, no una pantalla administrativa.
No hay aprobación manual ni entrega a pacientes desde este módulo.

## Validación realizada y límites

Se ejecutaron pruebas de parsers, autenticación, aislamiento, endpoint con almacén
simulado, reintentos/conflictos y errores. TypeScript y esquema Prisma se validan
localmente. **La migración PostgreSQL, las carreras reales y el recorrido HTTP con
persistencia requieren ejecución en el entorno aislado y no están certificados
por los mocks.** Ejecutar el script HTTP antes de dar por validada la integración.

Antes de datos reales: contratar/acordar la interfaz del laboratorio, validar el
perfil con sus ejemplos, definir identificadores/autoridades, consentimiento y
entrega clínica bajo permisos/licencias existentes, autenticación por organización,
revisión administrativa, monitoreo, límites de tráfico, retención y procedimientos
de corrección de resultados. Evaluar controles y acuerdos aplicables al intercambio.
Nada de esto debe anunciarse como interoperabilidad productiva ya disponible.

Fuentes de diseño:
- https://hl7.org/fhir/R4/diagnosticreport.html
- https://hl7.org/fhir/R4/observation.html
- https://hl7.eu/refactored/msgORU_R01.html

## Pantalla de administración

Ruta `/dashboard/admin/interoperability`, accesible desde el menú de Admin tanto
en computadora como en móvil. Solo admite administradores activos con sesión
validada. Permite filtrar los últimos 50 recibos por identificación y consultar
hasta 5 eventos recientes de cada recibo, incluidos reenvíos y conflictos. No
expone tokens, no ejecuta aprobaciones y no entrega documentos al expediente.

En producción o sin aislamiento muestra el módulo deshabilitado sin consultar
las tablas nuevas. Con configuración incompleta indica que falta preparar el
entorno. Diferencia una bandeja vacía de una base de datos no disponible.

Para verlo en la aplicación habitual hace falta integrar esta rama en la rama
que alimenta ese despliegue. El trabajo está en la rama de fase 3; no se ha
activado la recepción ni migrado la base clínica.

## Manual synthetic identity review

Active admins in the isolated Preview can confirm TEST-PATIENT-001 (2018-04-12) or reject a pending identity. A 10–1000 character reason, explicit confirmation, and a synthetic target on confirmation are required. Decisions transition PENDING_REVIEW to MANUALLY_MATCHED or REJECTED. Status and event (admin ID, timestamp, reason and confirmed target) commit atomically; conditional updates prevent a second decision. Normalized input and fingerprint are unchanged. Retries retain the reviewed status. No User/Document association or clinical delivery is performed. Production remains disabled.

Apply migration 202610290001_interop_review before deploying this version. The synthetic Neon database received the source SQL transactionally and its source checksum was recorded in _prisma_migrations.

## Delivery into a synthetic record

Migration 202610290002_interop_delivery adds an immutable source/identity binding and unique delivered-document reference. It was applied transactionally to the isolated Neon database with the source checksum recorded.

Create a PATIENT account using an @example.test address and birth date 2018-04-12, then activate its license through Admin. Bind TEST-PATIENT-001 once in Interoperability. Confirmation of the account and a reason are required. No existing clinical account is eligible.

Only MATCHED or audited MANUALLY_MATCHED receipts may be delivered. The transaction locks/rechecks the patient, validates the license, creates one private-by-default text Document, conditionally marks the receipt delivered, and records reception/audit events. A competing delivery rolls back its document. Pending and rejected receipts cannot deliver. Soft-deleting a delivered document does not re-enable delivery.

Documents use an interop-sandbox: reference and render as plain text from the persisted normalized message. No S3/Blob credentials or files are required. The view endpoint checks session, active viewer license, existing patient/doctor/guardian authorization, sandbox state, delivered receipt and active synthetic patient license before rendering. Both received and verified birth dates are labeled in the report. No public share links are created for synthetic reports.

Representatives require an active guardian link and proxyVisible, which the admin must opt into at delivery or the existing clinical representative workflow may grant. Doctor access uses the existing DoctorPatient relationship and license filters. Use independent patient/tutor/doctor accounts to validate these flows in the Preview; automated authorization tests do not replace that UI acceptance test.
