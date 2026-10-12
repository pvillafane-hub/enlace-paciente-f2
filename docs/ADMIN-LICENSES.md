# Gestión administrativa de licencias

Disponible en Admin → Licencias para administradores activos.

- Añadir: correo de una cuenta existente y activa de Doctor o Paciente, plan Básico/PRO, estado, vencimiento y motivo.
- Modificar: cambiar plan, estado y vencimiento; permite reactivar una licencia con fecha válida.
- Desactivar: pone en INACTIVE todas las licencias de la cuenta, evitando que una licencia anterior siga siendo efectiva.
- Sin vencimiento requiere marcar explícitamente la casilla. Las fechas vencen al terminar el día elegido en hora de Puerto Rico.
- Los cambios se confirman antes de enviarse. Mientras se guardan se deshabilita el formulario.
- Solo administradores activos pueden ejecutar las acciones. Se rechazan ediciones de una versión anterior de la licencia.
- Cada escritura y su auditoría se guardan en una transacción Serializable. Se registran actor, entidad, motivo, valores anteriores/nuevos y licencias anteriores desactivadas.
- Los eventos ADMIN_LICENSE_CREATED, ADMIN_LICENSE_UPDATED y ADMIN_LICENSE_DISABLED llevan source=manual. No se cobran ni se generan recibos o eventos de Stripe.
- No se elimina la cuenta ni ningún documento.

La funcionalidad utiliza el modelo License existente; no requiere migración del esquema. Mantiene las reglas actuales de la aplicación: licencias ACTIVE vigentes habilitan las funciones que ya consultan la política de licencias. No añade nuevos bloqueos de expedientes por pago.

Verificado: 71 pruebas automatizadas (65 Vitest y 6 Node), TypeScript y compilación. Las pruebas cubren autorización, cuentas elegibles, duplicados, ediciones antiguas, auditoría, desactivación de alternativas, motivo y vencimiento.

Pendiente: probar la interfaz completa con una sesión administradora y una cuenta sintética. No se otorgaron ni desactivaron licencias de usuarios reales durante la implementación.
