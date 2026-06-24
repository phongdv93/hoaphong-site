-- Tenant DB (mỗi công ty 1 database): dữ liệu nghiệp vụ ERP

-- Bản sao nhẹ user từ platform (đồng bộ khi gán thành viên / dự án)
CREATE TABLE IF NOT EXISTS erp_users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'le',
  tax_code TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  contact_person TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

CREATE TABLE IF NOT EXISTS factory_products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  range_code TEXT NOT NULL DEFAULT '',
  wood_code TEXT NOT NULL DEFAULT '',
  paint_code TEXT NOT NULL DEFAULT '',
  customer_branch_code TEXT NOT NULL DEFAULT '',
  length_mm DOUBLE PRECISION NOT NULL DEFAULT 0,
  depth_mm DOUBLE PRECISION NOT NULL DEFAULT 0,
  height_mm DOUBLE PRECISION NOT NULL DEFAULT 0,
  price TEXT NOT NULL DEFAULT '',
  cbm_m3 DOUBLE PRECISION NOT NULL DEFAULT 0,
  weight_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS factory_parts (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  length_mm DOUBLE PRECISION NOT NULL DEFAULT 0,
  depth_mm DOUBLE PRECISION NOT NULL DEFAULT 0,
  height_mm DOUBLE PRECISION NOT NULL DEFAULT 0,
  default_qty DOUBLE PRECISION NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'cái',
  material_type TEXT NOT NULL DEFAULT '',
  spec_notes TEXT NOT NULL DEFAULT '',
  created_from_product_id INTEGER REFERENCES factory_products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS factory_product_bom_lines (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES factory_products(id) ON DELETE CASCADE,
  bom_section TEXT NOT NULL DEFAULT 'wood',
  line_no INTEGER NOT NULL,
  part_id INTEGER NOT NULL REFERENCES factory_parts(id) ON DELETE RESTRICT,
  qty DOUBLE PRECISION NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'cái',
  remark TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_factory_products_name ON factory_products(name);
CREATE INDEX IF NOT EXISTS idx_factory_bom_product ON factory_product_bom_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_factory_parts_code ON factory_parts(code);

ALTER TABLE factory_products ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE factory_products ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE factory_products ADD COLUMN IF NOT EXISTS supplier TEXT NOT NULL DEFAULT '';
ALTER TABLE factory_products ADD COLUMN IF NOT EXISTS ordered_at DATE;
ALTER TABLE factory_parts ADD COLUMN IF NOT EXISTS length_mm DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE factory_parts ADD COLUMN IF NOT EXISTS depth_mm DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE factory_parts ADD COLUMN IF NOT EXISTS height_mm DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE factory_product_bom_lines ADD COLUMN IF NOT EXISTS bom_section TEXT NOT NULL DEFAULT 'wood';
UPDATE factory_product_bom_lines SET bom_section = 'wood' WHERE trim(bom_section) = '';
ALTER TABLE factory_product_bom_lines DROP CONSTRAINT IF EXISTS factory_product_bom_lines_product_id_line_no_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_factory_bom_product_section_line ON factory_product_bom_lines (product_id, bom_section, line_no);

CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'hardware',
  unit TEXT NOT NULL DEFAULT 'cái',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);

CREATE TABLE IF NOT EXISTS wood_species (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price_per_m3 DOUBLE PRECISION NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_orders (
  id SERIAL PRIMARY KEY,
  po_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  required_volume_m3 DOUBLE PRECISION,
  issued_volume_m3 DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wood_bundles (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  species_id INTEGER NOT NULL REFERENCES wood_species(id),
  packing_list_no TEXT NOT NULL DEFAULT '',
  supplier TEXT NOT NULL DEFAULT '',
  thickness_mm DOUBLE PRECISION NOT NULL,
  length_mm DOUBLE PRECISION NOT NULL,
  photo_end_grain TEXT NOT NULL DEFAULT '',
  photo_packing_list TEXT NOT NULL DEFAULT '',
  photos_json TEXT NOT NULL DEFAULT '[]',
  total_volume_m3 DOUBLE PRECISION NOT NULL DEFAULT 0,
  remaining_volume_m3 DOUBLE PRECISION NOT NULL DEFAULT 0,
  board_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_stock',
  notes TEXT NOT NULL DEFAULT '',
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wood_boards (
  id SERIAL PRIMARY KEY,
  bundle_id INTEGER NOT NULL REFERENCES wood_bundles(id) ON DELETE CASCADE,
  seq_no INTEGER NOT NULL,
  width_mm DOUBLE PRECISION NOT NULL,
  thickness_mm DOUBLE PRECISION NOT NULL,
  length_mm DOUBLE PRECISION NOT NULL,
  volume_m3 DOUBLE PRECISION NOT NULL,
  pos_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  pos_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  pos_z DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available',
  issued_to_po_id INTEGER REFERENCES production_orders(id),
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wood_issues (
  id SERIAL PRIMARY KEY,
  board_id INTEGER NOT NULL REFERENCES wood_boards(id),
  po_id INTEGER NOT NULL REFERENCES production_orders(id),
  volume_m3 DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wood_boards_bundle ON wood_boards(bundle_id);
CREATE INDEX IF NOT EXISTS idx_wood_boards_status ON wood_boards(status);

-- company_id = id công ty trên platform (không FK cross-DB)
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  contract_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  contract_signed_at DATE,
  status TEXT NOT NULL DEFAULT 'open',
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  supplier_address TEXT NOT NULL DEFAULT '',
  export_country TEXT NOT NULL DEFAULT '',
  completed_late_days INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  manager_user_id INTEGER,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, code)
);

ALTER TABLE factory_products ADD COLUMN IF NOT EXISTS source_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE factory_products ADD COLUMN IF NOT EXISTS source_quote_ref TEXT NOT NULL DEFAULT '';

ALTER TABLE projects ADD COLUMN IF NOT EXISTS supplier_address TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS export_country TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_late_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);

CREATE TABLE IF NOT EXISTS project_phases (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'custom',
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deadline_at DATE,
  started_at DATE,
  completed_at DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  assignee_user_id INTEGER,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_phases_project ON project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_assignee ON project_phases(assignee_user_id);

ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS last_progress_at TIMESTAMPTZ;
ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS last_progress_by INTEGER;
ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS progress_from_items BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS project_phase_progress_logs (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id INTEGER NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  user_id INTEGER,
  progress_percent INTEGER NOT NULL,
  status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phase_progress_logs_phase ON project_phase_progress_logs(phase_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phase_progress_logs_project ON project_phase_progress_logs(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS project_members (
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

CREATE TABLE IF NOT EXISTS project_messages (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_messages_project ON project_messages(project_id, created_at DESC);
ALTER TABLE project_messages ADD COLUMN IF NOT EXISTS submission_id INTEGER;

CREATE TABLE IF NOT EXISTS project_submissions (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id INTEGER REFERENCES project_phases(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted',
  created_by INTEGER,
  reviewed_by INTEGER,
  review_note TEXT NOT NULL DEFAULT '',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_submissions_project ON project_submissions(project_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_messages_submission_id_fkey'
  ) THEN
    ALTER TABLE project_messages
      ADD CONSTRAINT project_messages_submission_id_fkey
      FOREIGN KEY (submission_id) REFERENCES project_submissions(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS project_files (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL DEFAULT '',
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT '',
  uploaded_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS project_items (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(18, 4) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT '',
  unit_price NUMERIC(18, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_items_project ON project_items(project_id, sort_order);

ALTER TABLE project_items ADD COLUMN IF NOT EXISTS quantity_done NUMERIC(18, 4) NOT NULL DEFAULT 0;
ALTER TABLE project_items ADD COLUMN IF NOT EXISTS factory_product_id INTEGER REFERENCES factory_products(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS project_item_phase_progress (
  item_id INTEGER NOT NULL REFERENCES project_items(id) ON DELETE CASCADE,
  phase_id INTEGER NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
  quantity_done NUMERIC(18, 4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (item_id, phase_id)
);

CREATE INDEX IF NOT EXISTS idx_item_phase_progress_phase ON project_item_phase_progress(phase_id);

-- ============ XUẤT NHẬP KHẨU / VNACCS ============

CREATE TABLE IF NOT EXISTS customs_vnaccs_profiles (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL UNIQUE,
  tax_code TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL DEFAULT '',
  user_code TEXT NOT NULL DEFAULT '',
  user_password_enc TEXT NOT NULL DEFAULT '',
  terminal_id TEXT NOT NULL DEFAULT '',
  terminal_access_key_enc TEXT NOT NULL DEFAULT '',
  declarant_name TEXT NOT NULL DEFAULT '',
  declarant_phone TEXT NOT NULL DEFAULT '',
  is_test_mode BOOLEAN NOT NULL DEFAULT TRUE,
  gateway_url TEXT NOT NULL DEFAULT '',
  signing_cert_thumbprint TEXT NOT NULL DEFAULT '',
  signing_cert_subject TEXT NOT NULL DEFAULT '',
  signing_cert_issuer TEXT NOT NULL DEFAULT '',
  signing_provider TEXT NOT NULL DEFAULT '',
  last_connection_ok BOOLEAN,
  last_connection_at TIMESTAMPTZ,
  last_connection_message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customs_import_declarations (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  reference_code TEXT NOT NULL DEFAULT '',
  declaration_no TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  procedure TEXT NOT NULL DEFAULT 'IDA',
  channel TEXT NOT NULL DEFAULT 'unknown',
  procedure_type_code TEXT NOT NULL DEFAULT 'A11',
  importer_tax_code TEXT NOT NULL DEFAULT '',
  importer_name TEXT NOT NULL DEFAULT '',
  declarant_tax_code TEXT NOT NULL DEFAULT '',
  customs_office_code TEXT NOT NULL DEFAULT '',
  border_gate_code TEXT NOT NULL DEFAULT '',
  loading_port_code TEXT NOT NULL DEFAULT '',
  declaration_meta JSONB NOT NULL DEFAULT '{}',
  transport_mode_code TEXT NOT NULL DEFAULT '1',
  bill_of_lading_no TEXT NOT NULL DEFAULT '',
  invoice_no TEXT NOT NULL DEFAULT '',
  invoice_date DATE,
  contract_no TEXT NOT NULL DEFAULT '',
  incoterms TEXT NOT NULL DEFAULT 'CIF',
  currency TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC(18, 6) NOT NULL DEFAULT 1,
  total_invoice_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  freight_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  insurance_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  country_of_export TEXT NOT NULL DEFAULT '',
  country_of_origin TEXT NOT NULL DEFAULT '',
  expected_arrival_date DATE,
  warehouse_code TEXT NOT NULL DEFAULT '',
  payment_method_code TEXT NOT NULL DEFAULT 'L',
  ida_registration_no TEXT,
  customs_message TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customs_decl_company ON customs_import_declarations(company_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS customs_master_data (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  extra TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT NOT NULL DEFAULT 'manual',
  version_tag TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (type, code)
);

CREATE INDEX IF NOT EXISTS idx_customs_master_type_code ON customs_master_data(type, code);

CREATE TABLE IF NOT EXISTS customs_import_declaration_lines (
  id SERIAL PRIMARY KEY,
  declaration_id INTEGER NOT NULL REFERENCES customs_import_declarations(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL DEFAULT 1,
  hs_code TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(18, 4) NOT NULL DEFAULT 1,
  unit_code TEXT NOT NULL DEFAULT 'PCE',
  unit_price NUMERIC(18, 4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  origin_country TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  import_duty_code TEXT NOT NULL DEFAULT '',
  vat_duty_code TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_customs_decl_lines ON customs_import_declaration_lines(declaration_id, line_no);

CREATE TABLE IF NOT EXISTS customs_transmission_logs (
  id SERIAL PRIMARY KEY,
  declaration_id INTEGER NOT NULL REFERENCES customs_import_declarations(id) ON DELETE CASCADE,
  procedure TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  http_status INTEGER,
  request_summary TEXT NOT NULL DEFAULT '',
  response_summary TEXT NOT NULL DEFAULT '',
  customs_ref_no TEXT,
  error_code TEXT,
  error_message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customs_tx_log ON customs_transmission_logs(declaration_id, created_at DESC);
