# Conexión de la copia nueva a S3

Preparado el 12 de octubre de 2026. Activación pendiente de configurar credenciales en Vercel.

Proyecto destino: enlace-salud-mejoras (project-pmewh.vercel.app).
Bucket identificado en configuración original: enlacepaciente-documents-dev-f2, región us-east-2.
Nuevos objetos: enlace-salud-mejoras/documents/<UUID>. La referencia en base de datos lleva prefijo s3:.

Variables exclusivas de Production en la copia nueva:
- DOCUMENT_STORAGE_PROVIDER=s3
- AWS_REGION=us-east-2
- AWS_BUCKET_NAME=enlacepaciente-documents-dev-f2
- AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY como Secret, introducidas directamente en Vercel.
- AWS_SESSION_TOKEN únicamente si las credenciales son temporales.

Preferir credenciales IAM limitadas a s3:GetObject, s3:PutObject y s3:DeleteObject en arn:aws:s3:::enlacepaciente-documents-dev-f2/enlace-salud-mejoras/documents/*.
No se necesita listar el bucket ni acceder a documentos de la original. No se modifican usuarios, IAM, ACL ni políticas del bucket con este código.

Los documentos de Blob anteriores mantienen su ubicación y siguen usando Blob aunque cambie el proveedor de cargas. No se eliminan ni migran objetos existentes.
PutObject usa IfNoneMatch=* para no sobrescribir, AES256 y sin ACL pública. GetObject se entrega a través de las rutas existentes de autorización. Las claves fuera del prefijo de la copia se rechazan. Esto no comprueba ni corrige una política pública heredada del bucket: verificar privacidad en AWS antes de uso clínico.

Revertir DOCUMENT_STORAGE_PROVIDER a blob dirige futuras cargas a Blob. Las referencias S3 previas siguen usando S3, por lo que sus credenciales deben conservarse.

Validado: 52 pruebas (46 Vitest + 6 Node), compilación y TypeScript. No se ha realizado aún una carga/lectura contra AWS real ni se ha verificado facturación, permisos IAM o políticas del bucket.
