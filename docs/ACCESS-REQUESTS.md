# Solicitudes e invitaciones de acceso

El paciente invita al doctor desde `/dashboard/doctors`; queda pendiente de aceptación del doctor en `/dashboard/requests`. Enviar una invitación registra el consentimiento del paciente, pero no crea acceso hasta que el doctor acepta. El doctor puede aceptar o rechazar únicamente invitaciones del paciente dirigidas a su propia cuenta.

Cuando el doctor solicita acceso, el paciente aprueba o rechaza desde `/dashboard/doctors/requests`, accesible desde Mis doctores. Un doctor nunca puede aprobar su propia solicitud. Ambas cuentas muestran estados pendientes, aprobados y rechazados. Cancelar desde el paciente retira la solicitud; revocar elimina el vínculo y la solicitud. Cada decisión invalida las páginas del dashboard y registra auditoría.

`initiatedBy` es nullable: los registros anteriores no tienen evidencia suficiente para atribuir el origen. Se muestran como solicitudes anteriores. Solo el paciente puede aprobarlas explícitamente o reenviar una invitación para que el doctor acepte. No se modifica retrospectivamente el consentimiento ni se conceden nuevos accesos durante la migración.

Las transacciones de consentimiento e invitación usan aislamiento Serializable y las decisiones comprueban estado, destinatario, origen y versión de la solicitud. Si hay concurrencia, la operación puede requerir un nuevo intento. Una solicitud pendiente con origen conocido no es reiniciada por el doctor.

La migración añade una columna nullable y una restricción de roles. Ejecutar deliberadamente `node scripts/migrate-isolated.mjs` en el entorno aislado de Vercel con su conexión directa y restaurar `npm run build` después de verificar el despliegue. El script no imprime credenciales ni resultados de datos.

Validación automatizada: invitación sin acceso inmediato, destinatario autorizado, rechazo sin acceso, repetición/concurrencia, roles inactivos, preservación de una invitación existente, renovación explícita y separación de decisiones. La prueba visual autenticada con cuentas reales de paciente y doctor requiere una sesión de esas cuentas; las pruebas automatizadas no sustituyen esa comprobación.
