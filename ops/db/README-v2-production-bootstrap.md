# Enlace Salud V2 — Bootstrap de base de datos (piloto Morovis)

## Estado y seguridad
- Rama fuente congelada: `release/v2-piloto-morovis-frozen`. No editar ni fusionar esta preparación sin validación.
- Neon destino: proyecto `enlace-salud-v2-production`, base `enlace_salud_prod` (vacía al verificar).
- **BLOQUEO CLÍNICO:** Neon reportó `settings.hipaa=false`. No cargar PHI ni abrir registro real hasta validar BAA, configuración y controles de seguridad.
- Nunca copiar pacientes ni datos de Fase 3 al entorno de prueba.

## Hallazgo
Las seis migraciones históricas son incrementales y faltan migraciones base para tablas como User, Document y Organization. Aplicar `prisma migrate deploy` directamente a una base vacía no es seguro.

## Procedimiento de bootstrap propuesto (solo sobre base NUEVA, vacía y aislada)
1. Confirmar conexión a rama temporal de Neon, verificar que no existan tablas de aplicación y que `DATABASE_URL` apunte a esa rama.
2. Usar exactamente Prisma 5.22 del proyecto. Validar `npx prisma validate`.
3. Generar SQL inicial desde el esquema actual: `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > baseline.sql`.
4. Revisar SQL generado y ejecutar **solo en rama temporal** con `npx prisma db execute --file baseline.sql --schema prisma/schema.prisma`.
5. Aplicar `ops/db/v2-security-constraints.sql` y comprobar las 10 restricciones SQL.
6. Comprobar índices, relaciones, tablas, enumeraciones y autorización de acceso entre organizaciones usando pacientes sintéticos. No usar datos reales.
7. Crear procedimiento reproducible para registrar como aplicadas las seis migraciones históricas, cuyos cambios ya están incluidos en el esquema actual; **no ejecutarlas de nuevo**. Verificar `prisma migrate status` sin divergencias.
8. Solo después de pruebas y revisión, repetir en base de producción vacía y ejecutar smoke tests de login, consentimiento, tutores, documentos e interoperabilidad.

## Observaciones
- `schema.prisma` no expresa todas las restricciones CHECK. El archivo SQL complementario conserva las restricciones identificadas en la base Fase 3.
- El esquema actual usa Prisma 5 y PostgreSQL. Verificar compatibilidad real antes de aplicar.
- No publicar Vercel para pacientes reales hasta completar variables de entorno, almacenamiento seguro, HTTPS, aislamiento multitenant y verificación de cumplimiento.
