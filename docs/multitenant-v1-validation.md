# Multi-Tenant V1 — validación previa a producción (2026-11-19)

Rama de GitHub: feature/multitenant-v1
Rama Neon de pruebas: multitenant-v1-preprod-validation

## Resultados ejecutados
- Se crearon en la rama de pruebas Organization, OrganizationMember, PatientOrganization, MedicalAccessGrant y AccessAuditEvent.
- Se confirmaron tablas, claves foráneas, restricciones UNIQUE e índices.
- Se añadieron y ejecutaron en la rama de pruebas cuatro guardas SQL:
  1. MedicalAccessGrant_distinct_people: doctorId <> patientId
  2. MedicalAccessGrant_revocation_consistent: REVOKED exige revokedAt y otros estados exigen NULL
  3. MedicalAccessGrant_one_active_per_context: índice UNIQUE parcial (organizationId, patientId, doctorId) WHERE status='ACTIVE'
  4. MedicalAccessGrant_expiration_after_creation: validUntil > createdAt cuando exista
- Se ejecutaron seis casos sintéticos de una expresión booleana de autorización (seis resultados esperados). **No constituyen pruebas de RLS ni del código de aplicación.**

## SQL de endurecimiento probado en la rama Neon de pruebas
```sql
ALTER TABLE "MedicalAccessGrant" ADD CONSTRAINT "MedicalAccessGrant_distinct_people" CHECK ("doctorId" <> "patientId");
ALTER TABLE "MedicalAccessGrant" ADD CONSTRAINT "MedicalAccessGrant_revocation_consistent" CHECK (("status" = 'REVOKED' AND "revokedAt" IS NOT NULL) OR ("status" <> 'REVOKED' AND "revokedAt" IS NULL));
CREATE UNIQUE INDEX "MedicalAccessGrant_one_active_per_context" ON "MedicalAccessGrant" ("organizationId","patientId","doctorId") WHERE "status" = 'ACTIVE';
ALTER TABLE "MedicalAccessGrant" ADD CONSTRAINT "MedicalAccessGrant_expiration_after_creation" CHECK ("validUntil" IS NULL OR "validUntil" > "createdAt");
```

## Criterios de acceso para implementación en servidor
- Una clínica no adquiere acceso al expediente por pertenencia administrativa del paciente.
- Médico: organización ACTIVE + OrganizationMember activo con rol DOCTOR + MedicalAccessGrant ACTIVE para ese paciente y esa organización + vigencia no expirada + alcance suficiente.
- Tutor: validar GuardianLink ACTIVE, verificación y vigencia, además de alcance legal.
- Cada operación debe filtrar por usuario autenticado y organización seleccionada; no confiar en organizationId enviado por cliente.
- Cada lectura/escritura de información médica debe registrar auditoría.
- Rechazar acceso entre clínicas por defecto. Una autorización de Clínica A no es una autorización de Clínica B.
- El paciente controla la autorización individual a cada médico.

## Bloqueos para producción
1. Ejecutar prisma validate con Prisma 5.22 y revisar drift completo del schema Prisma respecto de Neon.
2. Validar que la aplicación Next.js compruebe permisos en cada API y operación de documentos/S3.
3. Implementar y probar RLS con el rol de base de datos y pooling reales; actualmente no hay RLS en las tablas.
4. Probar escenarios de acceso real, revocación, tutores y cambios de clínica con usuarios ficticios.
5. Preparar una migración Prisma coherente con los cambios SQL, incluyendo índices parciales y CHECK constraints, sin usar prisma db push sobre producción.
6. Validar procedimiento de restauración y despliegue controlado.

Ninguna de estas guardas está aplicada a producción todavía.
