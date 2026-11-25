-- Traceability policy (ISO/IEC 38500 - Conformidad): audit_log is append-only.
-- The application only inserts; this trigger makes the database refuse any
-- edit or deletion of an audit entry, even from a direct SQL session.
--
-- One exception keeps the existing foreign key working: deleting a user sets
-- "userId" to NULL (ON DELETE SET NULL). That update is allowed only when no
-- other column changes. Users should be deactivated, never deleted, so the
-- actor of every entry is preserved.

CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger AS $$
BEGIN
  -- NEW/OLD only exist for row-level UPDATE, so the comparison is nested
  -- instead of relying on short-circuit evaluation.
  IF TG_OP = 'UPDATE' THEN
    IF NEW."userId" IS NULL
       AND OLD."userId" IS NOT NULL
       AND NEW."id" = OLD."id"
       AND NEW."action" = OLD."action"
       AND NEW."entity" = OLD."entity"
       AND NEW."entityId" IS NOT DISTINCT FROM OLD."entityId"
       AND NEW."oldValues"::text IS NOT DISTINCT FROM OLD."oldValues"::text
       AND NEW."newValues"::text IS NOT DISTINCT FROM OLD."newValues"::text
       AND NEW."ipAddress" IS NOT DISTINCT FROM OLD."ipAddress"
       AND NEW."userAgent" IS NOT DISTINCT FROM OLD."userAgent"
       AND NEW."policyRef" IS NOT DISTINCT FROM OLD."policyRef"
       AND NEW."createdAt" = OLD."createdAt" THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'audit_log es de solo inserción: no se permite % de registros de auditoría', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_update ON "audit_log";
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();

DROP TRIGGER IF EXISTS audit_log_no_delete ON "audit_log";
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();

DROP TRIGGER IF EXISTS audit_log_no_truncate ON "audit_log";
CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_append_only();
