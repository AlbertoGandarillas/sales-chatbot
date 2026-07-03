-- Bootstrap del primer admin de plataforma
-- 1. Crea el usuario en Supabase Dashboard → Authentication → Users (email + password)
-- 2. Copia el UUID del usuario
-- 3. Ejecuta (reemplaza valores):

INSERT INTO platform_admins (user_id, email)
VALUES ('00000000-0000-0000-0000-000000000000', 'tu@email.com')
ON CONFLICT (user_id) DO NOTHING;

-- Login: https://tu-dominio/admin/login
