-- CORFO "Capital de Riesgo" public report — logical data model
-- Aligned to: (1) Summary by line, (2) Fund by line, (3) Investment details
-- Uses BIGSERIAL/NUMERIC/TIMESTAMPTZ (PostgreSQL). For SQLite: INTEGER PK, REAL/NUMERIC, TEXT dates.

-- One row per report snapshot (e.g. "Informe ... al 31-12-2025", PDF v4)
CREATE TABLE vc_report (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT,
  as_of_date    DATE NOT NULL,  -- e.g. report cutoff 2025-12-31
  source_path   TEXT,           -- original PDF name/path
  ingested_at   TIMESTAMPTZ DEFAULT now()
);

-- Vehicle / instrument line: F1, F2, F3, FEM, K1, FC, FT, FET, ...
CREATE TABLE corfo_line (
  line_code     VARCHAR(16) PRIMARY KEY
);
-- Run once after create:
-- INSERT INTO corfo_line (line_code) VALUES
--   ('F1'),('F2'),('F3'),('FEM'),('K1'),('FC'),('FT'),('FET')
-- ON CONFLICT (line_code) DO NOTHING;

-- Footnotes: columns reference (1)–(9) in the source; keep definitions for audit
CREATE TABLE report_footnote (
  id            BIGSERIAL PRIMARY KEY,
  report_id     BIGINT NOT NULL REFERENCES vc_report (id) ON DELETE CASCADE,
  note_number   SMALLINT NOT NULL,  -- 1, 2, 3, ...
  description   TEXT NOT NULL,
  UNIQUE (report_id, note_number)
);

-- ---------------------------------------------------------------------------
-- TABLE 1 — Summary by line (aggregates, USD in source)
-- Either ingest from the PDF "resumen" table OR derive by summing table 2/3
-- (store ingested if you need to preserve publisher rounding vs. your math)
-- ---------------------------------------------------------------------------
CREATE TABLE line_summary (
  id                         BIGSERIAL PRIMARY KEY,
  report_id                  BIGINT NOT NULL REFERENCES vc_report (id) ON DELETE CASCADE,
  line_id                    VARCHAR(16) NOT NULL REFERENCES corfo_line (line_code),
  num_funds                  INTEGER NOT NULL,
  credit_lines_granted_usd   NUMERIC(20, 2) NOT NULL,  -- "Líneas de Crédito otorgados"
  disbursements_usd          NUMERIC(20, 2) NOT NULL,  -- "Desembolsos"
  credit_to_draw_usd         NUMERIC(20, 2) NOT NULL,  -- "Línea de crédito por girar"
  accumulated_investments_usd NUMERIC(20, 2) NOT NULL, -- "Inversiones acumuladas"
  UNIQUE (report_id, line_id)
);

-- Publisher "Total general" row: either omit and SUM line_summary, or use:
-- CREATE TABLE report_usd_totals (
--   report_id BIGINT PRIMARY KEY REFERENCES vc_report (id),
--   num_funds INTEGER, credit_lines_granted_usd NUMERIC(20,2), ...
-- );

-- ---------------------------------------------------------------------------
-- TABLE 2 — Investment fund by line (per fund within a vehicle, amounts in UF)
-- Skip "Total Línea Fx" subtotal rows in ETL, or set is_subtotal = true
-- ---------------------------------------------------------------------------
CREATE TABLE fund_line (
  id                      BIGSERIAL PRIMARY KEY,
  report_id               BIGINT NOT NULL REFERENCES vc_report (id) ON DELETE CASCADE,
  line_id                 VARCHAR(16) NOT NULL REFERENCES corfo_line (line_code),
  fund_name               TEXT NOT NULL,          -- "Fondo de Inversión" as printed
  line_opening_date       DATE,                 -- "Fecha Apertura de Línea" DD-MM-YYYY
  credit_approved_uf      NUMERIC(20, 4) NOT NULL,  -- (2)
  debt_to_capital_ratio  NUMERIC(10, 4),         -- (3) e.g. 0.5, 2.98 — store as decimal
  disbursement_uf         NUMERIC(20, 4) NOT NULL,  -- (4)
  amounts_invested_uf     NUMERIC(20, 4) NOT NULL,  -- (5)(6)
  entity_count            INTEGER,                -- "N° (E)" (7)
  line_status             VARCHAR(32) NOT NULL   -- (8) Vigente | No Vigente
    CHECK (line_status IN ('Vigente', 'No Vigente')),
  credit_to_draw_uf       NUMERIC(20, 4) NOT NULL,  -- (9)
  is_subtotal             BOOLEAN NOT NULL DEFAULT false,
  -- Same fund name can exist under different lines; may repeat with typos across years
  UNIQUE (report_id, line_id, fund_name, line_opening_date, is_subtotal)
);

CREATE INDEX idx_fund_line_line ON fund_line (line_id);
CREATE INDEX idx_fund_line_fund ON fund_line (lower(fund_name));

-- ---------------------------------------------------------------------------
-- TABLE 3 — Investment details (company + fund + line; USD in source)
-- Companies overlap across (line, fund): normalize company
-- ---------------------------------------------------------------------------
CREATE TABLE company (
  id                BIGSERIAL PRIMARY KEY,
  legal_name        TEXT NOT NULL,
  name_normalized   TEXT -- uppercase, fold accents, optional RUT if you add a column
);

CREATE UNIQUE INDEX uq_company_normalized ON company (name_normalized)
  WHERE name_normalized IS NOT NULL;

CREATE TABLE company_investment (
  id                      BIGSERIAL PRIMARY KEY,
  report_id               BIGINT NOT NULL REFERENCES vc_report (id) ON DELETE CASCADE,
  line_id                 VARCHAR(16) NOT NULL REFERENCES corfo_line (line_code),
  fund_name               TEXT NOT NULL,          -- join textually to fund_line in ETL/BI
  company_id              BIGINT NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
  company_size            TEXT NOT NULL,          -- Tamaño: Mediana, Pequeña, ...
  economic_activity       TEXT NOT NULL,          -- Actividad Económica
  first_investment_date   DATE,                   -- "Fecha 1ª Inversión"
  total_invested_usd      NUMERIC(20, 2) NOT NULL, -- "Monto Total Invertido (US$)"
  UNIQUE (report_id, line_id, fund_name, company_id)  -- one total per company per fund-line in a report
);

CREATE INDEX idx_ci_company ON company_investment (company_id);
CREATE INDEX idx_ci_fund ON company_investment (line_id, lower(fund_name));

-- ---------------------------------------------------------------------------
-- Optional: reference dimensions for analytics (enums in PDF as controlled vocab)
-- ---------------------------------------------------------------------------
-- CREATE TABLE ref_company_size (code TEXT PRIMARY KEY);
-- CREATE TABLE ref_economic_activity (code TEXT PRIMARY KEY);
-- then FK from company_investment to replace TEXT columns

-- ---------------------------------------------------------------------------
-- Optional: link table 3 rows to table 2 when names match 1:1
-- ---------------------------------------------------------------------------
-- ALTER TABLE company_investment ADD COLUMN fund_line_id BIGINT REFERENCES fund_line (id);
-- backfill: JOIN ON report_id, line_id, normalized fund_name
