-- Xóa toàn bộ công ty đăng ký tự phục vụ (giữ admin platform)
DELETE FROM company_registration_requests;
DELETE FROM company_member_modules;
DELETE FROM company_modules;
DELETE FROM company_members;
DELETE FROM companies;
DELETE FROM users WHERE is_platform_admin IS NOT TRUE;
