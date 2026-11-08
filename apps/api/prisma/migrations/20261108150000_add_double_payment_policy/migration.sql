INSERT INTO "system_config" ("key", "value", "description", "updatedAt")
VALUES (
  'double_payment_enabled',
  'true',
  'Activar cobro de doble mensualidad por mora extrema',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;
