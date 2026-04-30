-- CORFO "Capital de Riesgo" — apply to Supabase (PostgreSQL public schema)
-- Mirrors repo root schema.sql; includes seed for corfo_line

CREATE TABLE vc_report (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT,
  as_of_date    DATE NOT NULL,
  source_path   TEXT,
  ingested_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE corfo_line (
  line_code     VARCHAR(16) PRIMARY KEY
);

INSERT INTO corfo_line (line_code) VALUES
  ('F1'),('F2'),('F3'),('FEM'),('K1'),('FC'),('FT'),('FET')
ON CONFLICT (line_code) DO NOTHING;

CREATE TABLE report_footnote (
  id            BIGSERIAL PRIMARY KEY,
  report_id     BIGINT NOT NULL REFERENCES vc_report (id) ON DELETE CASCADE,
  note_number   SMALLINT NOT NULL,
  description   TEXT NOT NULL,
  UNIQUE (report_id, note_number)
);

CREATE TABLE line_summary (
  id                          BIGSERIAL PRIMARY KEY,
  report_id                   BIGINT NOT NULL REFERENCES vc_report (id) ON DELETE CASCADE,
  line_id                     VARCHAR(16) NOT NULL REFERENCES corfo_line (line_code),
  num_funds                   INTEGER NOT NULL,
  credit_lines_granted_usd    NUMERIC(20, 2) NOT NULL,
  disbursements_usd           NUMERIC(20, 2) NOT NULL,
  credit_to_draw_usd          NUMERIC(20, 2) NOT NULL,
  accumulated_investments_usd NUMERIC(20, 2) NOT NULL,
  UNIQUE (report_id, line_id)
);

CREATE TABLE fund_line (
  id                      BIGSERIAL PRIMARY KEY,
  report_id               BIGINT NOT NULL REFERENCES vc_report (id) ON DELETE CASCADE,
  line_id                 VARCHAR(16) NOT NULL REFERENCES corfo_line (line_code),
  fund_name               TEXT NOT NULL,
  line_opening_date       DATE,
  credit_approved_uf      NUMERIC(20, 4) NOT NULL,
  debt_to_capital_ratio   NUMERIC(10, 4),
  disbursement_uf         NUMERIC(20, 4) NOT NULL,
  amounts_invested_uf     NUMERIC(20, 4) NOT NULL,
  entity_count            INTEGER,
  line_status             VARCHAR(32) NOT NULL
    CHECK (line_status IN ('Vigente', 'No Vigente')),
  credit_to_draw_uf       NUMERIC(20, 4) NOT NULL,
  is_subtotal             BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (report_id, line_id, fund_name, line_opening_date, is_subtotal)
);

CREATE INDEX idx_fund_line_line ON fund_line (line_id);
CREATE INDEX idx_fund_line_fund ON fund_line (lower(fund_name));

CREATE TABLE company (
  id                BIGSERIAL PRIMARY KEY,
  legal_name        TEXT NOT NULL,
  name_normalized   TEXT
);

CREATE UNIQUE INDEX uq_company_normalized ON company (name_normalized)
  WHERE name_normalized IS NOT NULL;

CREATE TABLE company_investment (
  id                      BIGSERIAL PRIMARY KEY,
  report_id               BIGINT NOT NULL REFERENCES vc_report (id) ON DELETE CASCADE,
  line_id                 VARCHAR(16) NOT NULL REFERENCES corfo_line (line_code),
  fund_name               TEXT NOT NULL,
  company_id              BIGINT NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
  company_size            TEXT NOT NULL,
  economic_activity       TEXT NOT NULL,
  first_investment_date   DATE,
  total_invested_usd      NUMERIC(20, 2) NOT NULL,
  UNIQUE (report_id, line_id, fund_name, company_id)
);

CREATE INDEX idx_ci_company ON company_investment (company_id);
CREATE INDEX idx_ci_fund ON company_investment (line_id, lower(fund_name));
