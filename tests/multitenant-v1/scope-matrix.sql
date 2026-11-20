-- Multi-Tenant V1: scope policy regression; read-only.
-- Execute on isolated preproduction Neon branch only.
DO $$
DECLARE failed_count integer;
BEGIN
  WITH matrix(scope, operation, expected) AS (
    VALUES
      ('READ_RECORD','READ_RECORD',true),
      ('READ_RECORD','UPLOAD_DOCUMENT',false),
      ('READ_RECORD','CATEGORIZE_DOCUMENT',false),
      ('READ_AND_UPLOAD','READ_RECORD',true),
      ('READ_AND_UPLOAD','UPLOAD_DOCUMENT',true),
      ('READ_AND_UPLOAD','CATEGORIZE_DOCUMENT',false),
      ('READ_UPLOAD_CATEGORIZE','READ_RECORD',true),
      ('READ_UPLOAD_CATEGORIZE','UPLOAD_DOCUMENT',true),
      ('READ_UPLOAD_CATEGORIZE','CATEGORIZE_DOCUMENT',true)
  ), evaluated AS (
    SELECT *,
      CASE WHEN operation='READ_RECORD' THEN true
           WHEN operation='UPLOAD_DOCUMENT' THEN scope IN ('READ_AND_UPLOAD','READ_UPLOAD_CATEGORIZE')
           ELSE scope='READ_UPLOAD_CATEGORIZE'
      END AS actual
    FROM matrix
  )
  SELECT count(*) INTO failed_count FROM evaluated WHERE actual IS DISTINCT FROM expected;
  IF failed_count <> 0 THEN
    RAISE EXCEPTION 'Scope matrix regression: % failures', failed_count;
  END IF;
  RAISE NOTICE 'Scope matrix regression: 9/9 cases passed';
END $$;
