-- Seed: negocio Cruje y catálogo inicial

INSERT INTO businesses (id, name, slug, description)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Cruje',
  'cruje',
  'Panadería y pastelería artesanal en Perú'
);

INSERT INTO products (business_id, name, description, category, price_soles, is_custom_order, available) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Pan de yema', 'Pan dulce tradicional con yema dorada', 'panes', 3.50, false, true),
  ('a0000000-0000-4000-8000-000000000001', 'Pan francés (unidad)', 'Baguette crujiente recién horneado', 'panes', 1.00, false, true),
  ('a0000000-0000-4000-8000-000000000001', 'Croissant de mantequilla', 'Hojaldre francés con mantequilla', 'pasteleria', 5.00, false, true),
  ('a0000000-0000-4000-8000-000000000001', 'Alfajor de manjar', 'Galleta rellena de manjar blanco', 'pasteleria', 4.50, false, true),
  ('a0000000-0000-4000-8000-000000000001', 'Queque de vainilla (porción)', 'Porción de queque esponjoso de vainilla', 'pasteleria', 6.00, false, true),
  ('a0000000-0000-4000-8000-000000000001', 'Empanada de pollo', 'Empanada horneada rellena de pollo', 'otros', 4.00, false, true),
  ('a0000000-0000-4000-8000-000000000001', 'Chicha morada (vaso)', 'Bebida tradicional peruana, vaso 300ml', 'bebidas', 3.00, false, true),
  ('a0000000-0000-4000-8000-000000000001', 'Torta personalizada', 'Torta a medida para cumpleaños, bodas y eventos. Precio según diseño.', 'tortas', 0.00, true, true);
