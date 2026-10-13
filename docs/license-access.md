# Acceso por licencia

Doctor y Paciente sin licencia activa conservan únicamente el listado de documentos cargados antes del final comprobable de su licencia anterior. Se usa Document.createdAt, no studyDate. La fecha límite es exclusiva: en el instante validUntil la licencia ya expiró. La licencia del paciente no habilita a un doctor vencido. Staff hereda la licencia de su doctor activo.

No se leen archivos del almacenamiento sin licencia: view, cargas, eliminación, creación de enlaces y creación de pacientes están protegidos en servidor. Los enlaces públicos existentes requieren que el propietario del documento mantenga licencia activa; son enlaces de compartición del propietario, no autorización de una cuenta de doctor. Las solicitudes, invitaciones y nuevas aprobaciones requieren licencia del actor. Rechazo, cancelación, revocación y seguridad siguen disponibles.

Listados, resúmenes y reportes filtran por fecha de carga. Las alertas y los campos clínicos actuales no se muestran a un doctor sin licencia. El aviso explica que el historial es parcial. Una renovación activa restaura la visibilidad conforme a las autorizaciones vigentes.

Admin conserva la fecha de fin al desactivar y no la adelanta al editar una licencia ya inactiva. Una licencia creada inactiva no acredita un período anterior. Si no existe licencia anterior con final comprobable, se muestra un listado vacío; no se inventa una fecha para licencias históricas sin vencimiento registrado.

No se cambia el esquema ni se migran archivos. La demostración dummy conserva sus expedientes públicos. La verificación autenticada en el despliegue debe hacerse con cuentas normales de prueba.
