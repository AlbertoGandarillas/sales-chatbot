# Índice — Imágenes de catálogo + mensajes ricos WhatsApp

> **ESTADO: PENDIENTE DE APROBACIÓN** (2026-06-26)
>
> Plan spec-driven para dos capacidades relacionadas:
> 1. **Imágenes** en catálogo manual (upload Supabase + thumbnails dashboard)
> 2. **Mensajes WhatsApp nativos** (product_list / confirmación de pedido como Cruje)
>
> **Metodología:** aprobar checkpoints → implementar Spec A → Spec B (depende parcialmente de A).

---

## 1. Problema (resumen)

| Área | Hoy | Deseado |
|---|---|---|
| Imagen catálogo manual | Solo campo URL texto | URL **o** subir archivo |
| Thumbnails dashboard | No se muestran aunque `image_url` esté lleno | Miniatura en lista y preview al editar |
| URL + upload a la vez | N/A | Regla clara de prioridad |
| Bot — consulta stock | Lista de texto plano | Formato nativo WA (product_list / tarjetas) |
| Bot — pedido confirmado | Texto plano | Mensaje tipo ORDER con ítems e imagen (screenshot Cruje) |

---

## 2. Specs hijos

| Spec | Alcance |
|---|---|
| [`catalog-images-storage-spec.md`](./catalog-images-storage-spec.md) | Supabase Storage, upload, URL, thumbnails, precedencia |
| [`whatsapp-rich-messages-spec.md`](./whatsapp-rich-messages-spec.md) | product_list, order_details, agente, sync catálogo Meta |

---

## 3. Dependencias

```
Spec A (imágenes)
    │
    ├─► Thumbnails dashboard (solo A)
    │
    └─► Spec B Tier 1 (Meta Catalog necesita URL pública HTTPS por producto)
            │
            └─► Spec B Tier 2 (order_details con ítems e imágenes)
```

- **Spec A** se puede implementar **sin** Meta Catalog.
- **Spec B Tier 1** requiere catálogo vinculado en Meta + sync de productos.
- **Spec B Tier 3** (fallback) funciona con URLs de Storage/Shopify sin Meta Catalog.

Relacionado (fase posterior): `cruje-whatsapp-catalog-sync-spec.md` (si existe en repo) — este plan lo **extiende** con envío activo desde el agente.

---

## 4. Orden de implementación

| Fase | Spec | Entregable |
|---|---|---|
| **1** | A | Bucket Supabase + upload en formulario + thumbnails |
| **2** | B — Tier 3 | Imagen + caption por producto (fallback) |
| **3** | B — Tier 1 | Sync Meta Catalog + `product_list` en consultas |
| **4** | B — Tier 2 | Confirmación pedido formato ORDER |

---

## 5. Checkpoints (aprobar antes de codear)

| ID | Pregunta | Default propuesto |
|---|---|---|
| CP-IMG1 | ¿Bucket público o signed URLs? | **Público** (Meta Catalog exige HTTPS público para imágenes) |
| CP-IMG2 | Si hay URL externa **y** upload, ¿cuál gana? | **Upload (Storage) gana**; URL queda como respaldo interno |
| CP-IMG3 | ¿Tamaño máximo imagen? | **2 MB**; jpeg/png/webp |
| CP-WA1 | ¿Cruje ya tiene **Meta Catalog** conectado al WABA? | **Verificar con Oswaldo** — bloqueante Tier 1 |
| CP-WA2 | Si no hay Meta Catalog, ¿aceptar fallback imagen+caption? | **Sí** |
| CP-WA3 | ¿Payments API / order_details con pago en Perú? | **No v1** — solo vista de pedido + Yape manual (sin botón pagar nativo) |
| CP-WA4 | Máx productos en product_list por mensaje | **30** (límite Meta); paginar si hay más |

---

## 6. Matriz de archivos (visión global)

| Archivo | Spec | Acción |
|---|---|---|
| `supabase/migrations/*_product_images_storage.sql` | A | Bucket + RLS + columna |
| `lib/product-image.ts` | A | URL efectiva, validación |
| `lib/supabase/storage.ts` | A | Upload/delete helpers |
| `app/dashboard/catalogo/actions.ts` | A | Multipart upload |
| `app/dashboard/catalogo/catalog-client.tsx` | A | Uploader + thumbnails |
| `components/catalog/product-image-field.tsx` | A | Nuevo |
| `lib/whatsapp.ts` | B | sendInteractive, sendImage, sendProductList |
| `lib/whatsapp-catalog-sync.ts` | B | Upsert producto en Meta Catalog |
| `lib/whatsapp-order-message.ts` | B | Payload order_details / resumen |
| `lib/agent.ts` | B | Post buscar_productos / crear_pedido |
| `lib/tools/index.ts` | B | Tool `enviar_catalogo_whatsapp` |
| `app/api/webhook/route.ts` | B | (opcional) inbound order from catalog cart |

---

## 7. Criterios de éxito integrados

- [ ] Producto manual: subir JPG → thumbnail visible en lista
- [ ] Producto Shopify: sigue mostrando imagen CDN sin cambios
- [ ] Producto con URL + upload: se ve la imagen subida
- [ ] Cliente pregunta "¿qué tienes?" → mensaje WA visual (Tier 1 o 3)
- [ ] Pedido confirmado → mensaje ORDER con ítems y total PEN
- [ ] Si Meta Catalog no configurado → fallback funcional sin error
- [ ] `tsc` + `next build` verdes

---

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| Meta Catalog no configurado en Cruje | Tier 3 fallback; documentar setup en runbook |
| order_details requiere Payments API | Usar order object display-only o confirmación híbrida; validar en sandbox |
| Imagen no pública | Bucket público read-only para `product-images` |
| Agente envía texto duplicado + catálogo | Tool envía WA; modelo recibe "ya enviado" |

---

## 9. Fuera de alcance

- Edición de imagen (crop, resize avanzado) — solo resize server-side opcional
- Galería multi-imagen por producto
- Instagram / omnicanal
- OCR comprobantes Yape
