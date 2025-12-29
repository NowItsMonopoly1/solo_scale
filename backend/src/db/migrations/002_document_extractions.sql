-- Document Extractions Table
-- Stores results from AI document extraction pipeline

CREATE TABLE IF NOT EXISTS document_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Extraction Results
  document_type VARCHAR(100) NOT NULL, -- 'Paystub', 'W-2', 'Bank Statement', etc.
  key_entities JSONB NOT NULL DEFAULT '{}', -- Extracted structured data
  discrepancy_alerts JSONB NOT NULL DEFAULT '[]', -- Array of {field, issue, severity}
  extraction_confidence INTEGER NOT NULL CHECK (extraction_confidence >= 0 AND extraction_confidence <= 100),
  raw_text_preview TEXT, -- First 200 chars of extracted text

  -- Automated Chaser
  automated_chaser_sent BOOLEAN DEFAULT FALSE,
  chaser_channel VARCHAR(20), -- 'sms' or 'email'
  chaser_message TEXT,
  chaser_sent_at TIMESTAMP,

  -- Metadata
  file_metadata JSONB, -- {mimeType, fileSize, etc.}
  processing_metadata JSONB, -- {jobId, processingTime, etc.}

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_document_extractions_lead ON document_extractions(lead_id);
CREATE INDEX idx_document_extractions_account ON document_extractions(account_id);
CREATE INDEX idx_document_extractions_type ON document_extractions(document_type);
CREATE INDEX idx_document_extractions_confidence ON document_extractions(extraction_confidence);
CREATE INDEX idx_document_extractions_created ON document_extractions(created_at DESC);

-- GIN index for JSONB queries
CREATE INDEX idx_document_extractions_entities ON document_extractions USING GIN (key_entities);
CREATE INDEX idx_document_extractions_alerts ON document_extractions USING GIN (discrepancy_alerts);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_document_extractions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_extractions_timestamp
BEFORE UPDATE ON document_extractions
FOR EACH ROW
EXECUTE FUNCTION update_document_extractions_timestamp();

COMMENT ON TABLE document_extractions IS 'Stores AI-extracted data from mortgage documents with automated chaser tracking';
COMMENT ON COLUMN document_extractions.key_entities IS 'Extracted structured data (name, employer, income, balance, etc.)';
COMMENT ON COLUMN document_extractions.discrepancy_alerts IS 'Array of discrepancy objects with field, issue, and severity';
COMMENT ON COLUMN document_extractions.extraction_confidence IS 'AI confidence score (0-100)';
COMMENT ON COLUMN document_extractions.automated_chaser_sent IS 'Whether automated chaser SMS/email was triggered and sent';
