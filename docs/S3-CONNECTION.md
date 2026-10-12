# Conexión de almacenamiento S3

La copia independiente utiliza S3 para nuevas cargas. Las credenciales se configuraron como Secret en Vercel con autorización del propietario; la aplicación original conserva su configuración.

## Comportamiento

- Las nuevas referencias tienen prefijo s3: y se restringen al espacio de objetos de la copia.
- Las referencias antiguas de Blob conservan su proveedor y continúan disponibles.
- Las cargas utilizan cifrado, claves aleatorias y escritura condicional para impedir sobrescrituras.
- La lectura sigue pasando por las rutas de autorización de documentos y enlaces compartidos.
- No se migran cuentas ni documentos de la original.

## Configuración

El proveedor se selecciona mediante DOCUMENT_STORAGE_PROVIDER. Las variables AWS_REGION, AWS_BUCKET_NAME, AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY deben configurarse directamente en Vercel. Para credenciales temporales se requiere también AWS_SESSION_TOKEN.

Preferir credenciales limitadas al espacio de objetos de la copia. No guardar credenciales ni inventarios de infraestructura en el repositorio.

## Validación

52 pruebas automatizadas, TypeScript y compilación aprobados.

Prueba real aprobada desde Vercel: escritura y lectura cifrada de un objeto sintético, rechazo del acceso anónimo y limpieza del objeto de prueba. El despliegue terminó correctamente. La bandera temporal VERIFY_S3_STORAGE se desactivó después de la prueba.

La prueba no constituye una auditoría de toda la política del bucket, de IAM o de facturación. Falta comprobar el flujo clínico completo con una cuenta de prueba autenticada.

## Reversión

Seleccionar blob dirige nuevas cargas a Blob. Las referencias S3 ya guardadas siguen requiriendo las credenciales y el bucket con el que se crearon.
