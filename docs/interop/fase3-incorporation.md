# Incorporación de interoperabilidad en Fase3

Estado: propuesta para revisión; no habilita recepción en Production.

La rama `Fase3-interoperabilidad` parte de Fase3 y reúne los cambios de
`mejoras/interop-sandbox`: fichas de integración, revisión de identidad,
vinculación y entrega a un paciente ficticio, y visualización del informe.
También incluye las correcciones de fechas y representantes de esa rama.

## Protecciones conservadas

- `Fase3` y las ramas `Fase3-*` solo compilan en el proyecto Vercel
  `prj_TTNAKJs9CbAfeoKtLeVhVxtgVJFQ`, con aislamiento explícito.
- Se conserva la lista de proyectos autorizados para el control de esquema de
  Fase3. No se sustituye por la configuración del sandbox anterior.
- Recepción, revisión, entrega y edición de integraciones siguen deshabilitadas
  cuando `VERCEL_ENV=production`, aunque se activen las variables de pruebas.
- Las fichas son borradores o están pausadas. Guardarlas no contacta laboratorios
  ni activa conectores. Las credenciales se indican mediante referencias.
- Solo se entrega al paciente ficticio elegible, con licencia activa y
  vinculación registrada. Se mantienen los controles de acceso a documentos.

## Pasos posteriores, pendientes de autorización

1. Revisar y aplicar las tres migraciones aditivas de revisión, entrega y fichas
   en la base aislada de Fase3. El build no debe darse por evidencia de que estas
   tablas están presentes.
2. Configurar un Preview de esta rama en el proyecto Fase3. Las variables actuales
   de Production no se heredan necesariamente en Preview: verificar las conexiones
   de base y Blob y el aislamiento antes de desplegar.
3. Configurar en Preview `INTEROP_SANDBOX_ENABLED`, `INTEROP_SANDBOX_SOURCE` y
   `INTEROP_SANDBOX_TOKEN`, sin incluir valores secretos en Git ni en mensajes.
4. Probar API JSON, el perfil limitado FHIR R4 y HL7 v2.5.1 con datos ficticios;
   revisar rechazos, reenvíos, identidad, entrega y permisos del informe.
5. Aprobar por separado la incorporación a Fase3. Esa incorporación no elimina
   el bloqueo de Production ni constituye conexión validada con un laboratorio.

No se requiere crear otra base por crear una rama. Si se utiliza la base Fase3
en Preview, ambos despliegues comparten datos: la rama por sí sola no los aísla.
No se copian usuarios, documentos ni credenciales del sandbox anterior.
