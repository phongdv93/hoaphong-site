-- Chạy trên mỗi tenant DB (hoaphong_tenant_*)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS template TEXT NOT NULL DEFAULT 'project';

CREATE TABLE IF NOT EXISTS project_contracts (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contract_no TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  party_name TEXT NOT NULL DEFAULT '',
  value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  signed_at DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT NOT NULL DEFAULT '',
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_contracts_project ON project_contracts(project_id);
