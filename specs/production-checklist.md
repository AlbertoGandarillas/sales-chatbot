# Checklist de migración a producción — Cruje

Documentación para cuando el MVP esté validado en el número de prueba de Meta.

## Meta / WhatsApp

- [ ] Verificar número de negocio en Meta Business Suite (salir del sandbox de prueba)
- [ ] Generar **token permanente** vía System User en Meta Business Suite (el token temporal expira ~24 h)
- [ ] Actualizar `WHATSAPP_TOKEN` en Vercel con el token permanente
- [ ] Confirmar `WHATSAPP_PHONE_NUMBER_ID` del número de producción
- [ ] Configurar webhook en producción: `https://<tu-dominio>/api/webhook`
- [ ] Verify token: mismo valor que `WHATSAPP_VERIFY_TOKEN`
- [ ] Suscribir campo `messages` en el webhook

## Vercel

- [ ] Copiar todas las variables de entorno a **Settings → Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`
  - `WHATSAPP_TOKEN`
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_VERIFY_TOKEN`
  - `OWNER_WHATSAPP_NUMBER`
- [ ] Redesplegar después de agregar variables
- [ ] (Opcional) Configurar dominio personalizado

## Supabase

- [ ] Confirmar migraciones aplicadas en producción (`supabase db push`)
- [ ] Activar backup automático (plan Pro) o export manual periódico
- [ ] Endurecer RLS: restringir `orders` UPDATE solo a usuarios autenticados
- [ ] Agregar autenticación al dashboard (Supabase Auth o middleware)

## OpenAI

- [ ] Revisar límites de uso y alertas de billing en platform.openai.com
- [ ] Monitorear costo por conversación; ajustar `HISTORY_LIMIT` si es necesario

## Legal / Perú

- [ ] Política de privacidad para datos de clientes (Ley N.° 29733)
- [ ] Consentimiento para uso de WhatsApp como canal comercial

## Monitoreo

- [ ] Revisar logs de Vercel Functions (`/api/webhook`)
- [ ] Alertas en Supabase para errores de BD
- [ ] Probar flujo completo post-deploy: saludo → pedido → encargo → dashboard
