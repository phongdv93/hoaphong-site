-- Platform DB (DATABASE_URL): đăng nhập, công ty, thành viên, module, website CMS

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  published SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price TEXT NOT NULL DEFAULT 'Liên hệ',
  image TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Khác',
  featured SMALLINT NOT NULL DEFAULT 0,
  published SMALLINT NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'sparkles',
  features TEXT NOT NULL DEFAULT '[]',
  published SMALLINT NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS contact_requests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registry công ty + kết nối tenant DB
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL DEFAULT '',
  tax_code TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT NOT NULL DEFAULT '',
  tenant_db_name TEXT NOT NULL DEFAULT '',
  tenant_db_url TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE companies ADD COLUMN IF NOT EXISTS tenant_db_name TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tenant_db_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subdomain TEXT;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS website_url TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_subdomain ON companies(subdomain) WHERE subdomain IS NOT NULL AND subdomain <> '';

CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(code);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- Chỉ Hoa Phong Premium (is_platform_admin) được thêm/sửa/xóa qua API
CREATE TABLE IF NOT EXISTS company_members (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  department_id TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (company_id, user_id)
);

ALTER TABLE company_members ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE company_members ADD COLUMN IF NOT EXISTS department_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_id);

CREATE TABLE IF NOT EXISTS company_member_modules (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  can_access BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (company_id, user_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_company_member_modules_user ON company_member_modules(company_id, user_id);

-- Hồ sơ đăng ký doanh nghiệp (tự động duyệt / từ chối)
CREATE TABLE IF NOT EXISTS company_registration_requests (
  id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  tax_code TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  admin_name TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  verify_details JSONB NOT NULL DEFAULT '{}',
  rejection_reason TEXT,
  company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reg_req_tax ON company_registration_requests(tax_code);
CREATE INDEX IF NOT EXISTS idx_reg_req_status ON company_registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_reg_req_created ON company_registration_requests(created_at DESC);

CREATE TABLE IF NOT EXISTS company_modules (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  started_at DATE,
  expires_at DATE,
  monthly_fee NUMERIC(18, 2) NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  enabled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (company_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_company_modules_module ON company_modules(module_id);

-- Đặt lại mật khẩu (quên mật khẩu)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);
