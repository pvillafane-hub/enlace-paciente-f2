# V2 Morovis — preparación de producción (NO ejecutar contra producción existente)

Versión funcional congelada: `bba9a11b9c677f19f750b011b066be9cc286b53c` en `release/v2-piloto-morovis-frozen`.
Trabajo de preparación: `chore/v2-production-readiness`.
Sandbox: `feature/multitenant-v1` y su infraestructura actual. No alterar.

## Bloqueos antes de aceptar datos reales
- Neon: habilitar organización/plan apto para HIPAA y formalizar BAA; crear proyecto nuevo V2, separado de Fase 3 y Sandbox.
- Vercel: resolver permiso 403 para crear proyecto; desplegar desde una referencia aprobada, sin utilizar credenciales de Sandbox.
- AWS S3: almacenamiento de producción independiente, cifrado, acceso mínimo, políticas de retención, BAA y pruebas de acceso.
- Completar revisión de seguridad, privacidad, auditoría, copias de seguridad y restauración antes del go-live.

## Migración inicial de esquema — pendiente de ejecución y validación
El directorio `prisma/migrations` comienza con cambios incrementales, no con la creación de todas las tablas.
1. En una base **vacía y desechable** (sin PHI), generar SQL inicial a partir de `prisma/schema.prisma` de la versión congelada usando Prisma CLI de la versión fijada por el lockfile.
2. Revisar el SQL, restricciones, índices, claves foráneas, extensiones y valores por defecto. Comparar con el esquema de Sandbox sin exportar registros.
3. Definir un baseline reproducible y un historial de migraciones coherente para una instalación vacía. No ejecutar directamente las migraciones incrementales antiguas sobre el baseline completo sin reconciliar el historial.
4. Crear una segunda base vacía, ejecutar el procedimiento desde cero, y verificar tablas, enums, claves, autenticación, autorizaciones y auditoría.
5. Guardar evidencia de validación y aprobación antes de ejecutar sobre Neon V2 producción.

## Cuenta ADMIN
- La autenticación actual usa bcrypt (`verifyPassword`), y `User.passwordHash` contiene el hash existente.
- Migrar exclusivamente el registro administrativo autorizado, preservando `email`, `passwordHash`, `fullName`, `role=ADMIN`, `active`, y evaluar campos necesarios de autenticación.
- NO copiar sesiones, tokens de recuperación, registros clínicos ni usuarios ficticios. Crear sesiones nuevas tras el primer inicio.
- No imprimir hashes, secretos ni correos administrativos en logs o PR. Transferencia segura y restringida, después de BAA.
- Verificar inicio de sesión con la contraseña actual en V2 y que la cuenta no tenga acceso cruzado a Sandbox.

## Criterios de salida
- V2 aislada de Sandbox y de Fase 3 previa.
- Despliegue y esquema reproducibles; backup/restauración probados.
- ADMIN inicia sesión sin restablecer contraseña.
- Pruebas con datos sintéticos de consentimiento, acceso médico, cambio de categoría, reflejo en paciente y auditoría.
- Dominios y TLS verificados; ninguna carga de pacientes reales antes de aprobación de seguridad.

## Generación segura del baseline (agregado 2026-11-21)
En la rama `chore/v2-production-readiness`, ejecutar `npm ci` y luego `bash scripts/generate-v2-baseline.sh`. El script valida Prisma y genera SQL **solo en archivo local** (`.v2-baseline-review/initial-schema.sql`), usando `--from-empty`; no abre conexiones ni modifica bases existentes. Revisar SQL y ensayar en base desechable antes de aprobar una migración inicial. **No ejecutar** `prisma migrate deploy` contra V2 hasta reconciliar el historial incremental. El script no migra administradores ni copia datos.
