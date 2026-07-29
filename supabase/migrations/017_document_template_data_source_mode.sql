-- Add vehicle_exchange_agreement category and configurable data_source_mode for document templates.
-- Additive migration; safe to run once on environments that already have 015/016 applied.

ALTER TABLE document_templates
  ADD COLUMN IF NOT EXISTS data_source_mode text;

ALTER TABLE document_templates
  ALTER COLUMN data_source_mode SET DEFAULT 'crm_with_manual_overrides';

UPDATE document_templates
SET data_source_mode = CASE category
  WHEN 'power_of_attorney' THEN 'manual_only'
  WHEN 'custom' THEN 'manual_only'
  ELSE 'crm_with_manual_overrides'
END
WHERE data_source_mode IS NULL;

ALTER TABLE document_templates
  ALTER COLUMN data_source_mode SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_templates_data_source_mode_check'
  ) THEN
    ALTER TABLE document_templates
      ADD CONSTRAINT document_templates_data_source_mode_check
      CHECK (data_source_mode IN ('crm_only', 'crm_with_manual_overrides', 'manual_only'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_templates_category_check'
  ) THEN
    ALTER TABLE document_templates DROP CONSTRAINT document_templates_category_check;
  END IF;

  ALTER TABLE document_templates
    ADD CONSTRAINT document_templates_category_check
    CHECK (category IN (
      'purchase_agreement',
      'handover_protocol',
      'power_of_attorney',
      'commission_agreement',
      'invoice_sheet',
      'vehicle_exchange_agreement',
      'custom'
    ));
END $$;
