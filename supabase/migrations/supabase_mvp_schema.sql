-- ============================================
-- SCRIPT SQL COMPLETO PARA MVP SYNAPSE
-- ============================================
-- Ejecutar este script en el SQL Editor de Supabase
-- 
-- ⚠️ ORDEN DE EJECUCIÓN (IMPORTANTE):
-- 1️⃣ PARTE 1: Extensiones (líneas 10-13)
-- 2️⃣ PARTE 2: Tablas (líneas 18-100)
-- 3️⃣ PARTE 3: Índices (líneas 105-150)
-- 4️⃣ PARTE 4: Funciones (líneas 155-250)
-- 5️⃣ PARTE 5: Triggers (líneas 255-290)
-- 6️⃣ PARTE 6: Habilitar RLS (líneas 295-305)
-- 7️⃣ PARTE 7: Políticas RLS (líneas 310-650)
-- 8️⃣ PARTE 8: Vista Analytics (líneas 655-670)
--
-- 💡 RECOMENDACIÓN: Ejecutar PARTE por PARTE y verificar que no hay errores

-- ============================================
-- 1️⃣ PARTE 1: EXTENSIONES (EJECUTAR PRIMERO)
-- ============================================
-- Habilitar extensiones necesarias
-- ✅ Ejecuta esta parte primero y verifica que no hay errores
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 2️⃣ PARTE 2: TABLAS (EJECUTAR SEGUNDO)
-- ============================================
-- ⚠️ IMPORTANTE: Ejecutar todas las tablas en este orden:
-- 1. profiles (primero, otras tablas la referencian)
-- 2. producers (depende de profiles)
-- 3. events (depende de producers)
-- 4. ticket_types (depende de events)
-- 5. purchases (depende de profiles)
-- 6. tickets (depende de purchases, ticket_types, events)
-- 7. refunds (depende de purchases, tickets, profiles)
-- 8. event_views (depende de events, profiles)

-- Tabla: profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'producer', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: producers
-- NOTA: El usuario DEBE estar registrado primero (en profiles) para crear una productora
-- Flujo: Usuario se registra → Luego puede crear productora desde /register-producer
-- 
-- Columnas eliminadas (no se usan en el registro):
-- - logo_url (eliminada en migración)
-- - website (eliminada en migración)
-- - facebook (eliminada en migración)
-- - twitter (eliminada en migración)
CREATE TABLE IF NOT EXISTS producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Nombre de fantasía (nombre público de la marca) - Etapa 1
  description TEXT, -- Descripción de la marca - Etapa 1 (opcional)
  email_contact TEXT, -- Email de contacto público - Etapa 1 (opcional)
  instagram TEXT, -- Instagram - Etapa 1 (opcional)
  -- Nuevos campos para registro por etapas (agregados en migración supabase_migration_producers.sql)
  -- whatsapp TEXT, -- WhatsApp - Etapa 1 (opcional)
  -- business_name TEXT, -- Razón Social / Nombre legal - Etapa 2 (obligatorio)
  -- cuit TEXT UNIQUE, -- CUIT - Etapa 2 (obligatorio, no modificable después de crear)
  -- admin_email TEXT, -- Email administrativo interno - Etapa 2 (obligatorio)
  -- admin_phone TEXT, -- Teléfono administrativo - Etapa 2 (obligatorio)
  -- bank_name TEXT, -- Nombre del banco - Etapa 3 (opcional)
  -- bank_account_type TEXT, -- Tipo de cuenta: 'corriente' o 'ahorro' - Etapa 3 (opcional)
  -- cbu TEXT, -- CBU - Etapa 3 (opcional)
  -- registration_stage TEXT DEFAULT 'profile', -- Etapa: 'profile', 'account', 'bank', 'complete'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  venue_name TEXT NOT NULL,
  venue_address TEXT,
  venue_city TEXT,
  flyer_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'finished', 'cancelled')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: ticket_types
CREATE TABLE IF NOT EXISTS ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  quantity_available INTEGER NOT NULL,
  quantity_sold INTEGER DEFAULT 0,
  sale_start_date TIMESTAMPTZ,
  sale_end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: purchases
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  guest_email TEXT,
  guest_name TEXT,
  guest_phone TEXT,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mercadopago', 'transfer')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_provider_id TEXT,
  payment_provider_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id),
  event_id UUID NOT NULL REFERENCES events(id),
  ticket_number TEXT UNIQUE NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  qr_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled', 'refunded')),
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: refunds
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id),
  user_id UUID REFERENCES profiles(id),
  guest_email TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),
  refund_amount DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: event_views
CREATE TABLE IF NOT EXISTS event_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  ip_address TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3️⃣ PARTE 3: ÍNDICES (EJECUTAR TERCERO)
-- ============================================
-- ✅ Ejecutar después de crear todas las tablas
-- Los índices mejoran el rendimiento de las consultas

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- producers
CREATE INDEX IF NOT EXISTS idx_producers_user_id ON producers(user_id);
CREATE INDEX IF NOT EXISTS idx_producers_active ON producers(is_active);

-- events
CREATE INDEX IF NOT EXISTS idx_events_producer ON events(producer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

-- ticket_types
CREATE INDEX IF NOT EXISTS idx_ticket_types_event ON ticket_types(event_id);

-- purchases
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_purchases_guest_email ON purchases(guest_email);

-- tickets
CREATE INDEX IF NOT EXISTS idx_tickets_purchase ON tickets(purchase_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_qr ON tickets(qr_code);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets(ticket_number);

-- refunds
CREATE INDEX IF NOT EXISTS idx_refunds_purchase ON refunds(purchase_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_user ON refunds(user_id);

-- event_views
CREATE INDEX IF NOT EXISTS idx_event_views_event ON event_views(event_id);
CREATE INDEX IF NOT EXISTS idx_event_views_date ON event_views(viewed_at);

-- ============================================
-- 4️⃣ PARTE 4: FUNCIONES (EJECUTAR CUARTO)
-- ============================================
-- ✅ Ejecutar después de crear tablas e índices
-- Estas funciones se usan en los triggers

-- Función: Actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función: Crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Actualizar quantity_sold
CREATE OR REPLACE FUNCTION update_ticket_type_quantity_sold()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ticket_types
  SET quantity_sold = quantity_sold + 1
  WHERE id = NEW.ticket_type_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función: Generar ticket_number
CREATE OR REPLACE FUNCTION generate_ticket_number(event_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  event_prefix TEXT;
  sequence_num INTEGER;
BEGIN
  event_prefix := UPPER(SUBSTRING(event_uuid::TEXT, 1, 8));
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM tickets
  WHERE ticket_number LIKE 'EVT-' || event_prefix || '-%';
  
  RETURN 'EVT-' || event_prefix || '-' || LPAD(sequence_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Función: Generar QR code
CREATE OR REPLACE FUNCTION generate_qr_code(ticket_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN 'SYN-' || UPPER(SUBSTRING(ticket_uuid::TEXT, 1, 8)) || '-' || 
         UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Función: Generar QR hash
CREATE OR REPLACE FUNCTION generate_qr_hash(ticket_uuid UUID, qr_code TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(ticket_uuid::TEXT || qr_code || NOW()::TEXT, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5️⃣ PARTE 5: TRIGGERS (EJECUTAR QUINTO)
-- ============================================
-- ✅ Ejecutar después de crear las funciones
-- Los triggers usan las funciones creadas anteriormente

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_producers_updated_at 
  BEFORE UPDATE ON producers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_types_updated_at 
  BEFORE UPDATE ON ticket_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at 
  BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at 
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at 
  BEFORE UPDATE ON refunds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para actualizar quantity_sold
CREATE TRIGGER on_ticket_created
  AFTER INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_ticket_type_quantity_sold();

-- ============================================
-- 6️⃣ PARTE 6: HABILITAR RLS (EJECUTAR SEXTO)
-- ============================================
-- ✅ Ejecutar después de crear todas las tablas
-- Esto habilita Row Level Security en todas las tablas

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_views ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7️⃣ PARTE 7: POLÍTICAS RLS (EJECUTAR SÉPTIMO)
-- ============================================
-- ⚠️ IMPORTANTE: Ejecutar después de habilitar RLS
-- Orden recomendado:
-- 1. profiles (primero)
-- 2. producers (depende de profiles)
-- 3. events (depende de producers)
-- 4. ticket_types (depende de events)
-- 5. purchases (depende de profiles)
-- 6. tickets (depende de purchases, events)
-- 7. refunds (depende de purchases, tickets)
-- 8. event_views (depende de events)

-- ============================================
-- 7.1 POLÍTICAS RLS - profiles
-- ============================================

-- Función helper para evitar recursión infinita en políticas RLS
-- Esta función consulta profiles sin pasar por RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (get_user_role() = 'admin');

-- ============================================
-- 8. POLÍTICAS RLS - producers
-- ============================================

DROP POLICY IF EXISTS "Public can view active producers" ON producers;
CREATE POLICY "Public can view active producers"
  ON producers FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Producers can view own producer" ON producers;
CREATE POLICY "Producers can view own producer"
  ON producers FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Producers can update own producer" ON producers;
CREATE POLICY "Producers can update own producer"
  ON producers FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all producers" ON producers;
CREATE POLICY "Admins can view all producers"
  ON producers FOR SELECT
  USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can manage producers" ON producers;
CREATE POLICY "Admins can manage producers"
  ON producers FOR ALL
  USING (get_user_role() = 'admin');

-- Política para permitir que usuarios creen su propia productora
DROP POLICY IF EXISTS "Users can create own producer" ON producers;
CREATE POLICY "Users can create own producer"
  ON producers FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND
    get_user_role() = 'producer'
  );

-- ============================================
-- 9. POLÍTICAS RLS - events
-- ============================================

DROP POLICY IF EXISTS "Public can view published events" ON events;
CREATE POLICY "Public can view published events"
  ON events FOR SELECT
  USING (status = 'published' AND published_at IS NOT NULL);

DROP POLICY IF EXISTS "Producers can view own events" ON events;
CREATE POLICY "Producers can view own events"
  ON events FOR SELECT
  USING (
    producer_id IN (
      SELECT p.id FROM producers p
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Producers can create events" ON events;
CREATE POLICY "Producers can create events"
  ON events FOR INSERT
  WITH CHECK (
    producer_id IN (
      SELECT p.id FROM producers p
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid() AND pr.role = 'producer'
    )
  );

DROP POLICY IF EXISTS "Producers can update own events" ON events;
CREATE POLICY "Producers can update own events"
  ON events FOR UPDATE
  USING (
    producer_id IN (
      SELECT p.id FROM producers p
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid()
    )
    AND status IN ('draft', 'published')
  );

DROP POLICY IF EXISTS "Admins can view all events" ON events;
CREATE POLICY "Admins can view all events"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update all events" ON events;
CREATE POLICY "Admins can update all events"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 10. POLÍTICAS RLS - ticket_types
-- ============================================

DROP POLICY IF EXISTS "Public can view ticket types for published events" ON ticket_types;
CREATE POLICY "Public can view ticket types for published events"
  ON ticket_types FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE status = 'published' AND published_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Producers can view ticket types for own events" ON ticket_types;
CREATE POLICY "Producers can view ticket types for own events"
  ON ticket_types FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN producers p ON e.producer_id = p.id
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Producers can manage ticket types for own events" ON ticket_types;
CREATE POLICY "Producers can manage ticket types for own events"
  ON ticket_types FOR ALL
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN producers p ON e.producer_id = p.id
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all ticket types" ON ticket_types;
CREATE POLICY "Admins can manage all ticket types"
  ON ticket_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 11. POLÍTICAS RLS - purchases
-- ============================================

DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Producers can view purchases for own events" ON purchases;
CREATE POLICY "Producers can view purchases for own events"
  ON purchases FOR SELECT
  USING (
    id IN (
      SELECT DISTINCT p.id FROM purchases p
      JOIN tickets t ON t.purchase_id = p.id
      JOIN events e ON t.event_id = e.id
      JOIN producers pr ON e.producer_id = pr.id
      JOIN profiles prof ON pr.user_id = prof.id
      WHERE prof.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can create purchases" ON purchases;
CREATE POLICY "Anyone can create purchases"
  ON purchases FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own purchases" ON purchases;
CREATE POLICY "Users can update own purchases"
  ON purchases FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all purchases" ON purchases;
CREATE POLICY "Admins can view all purchases"
  ON purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 12. POLÍTICAS RLS - tickets
-- ============================================

DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
CREATE POLICY "Users can view own tickets"
  ON tickets FOR SELECT
  USING (
    purchase_id IN (
      SELECT id FROM purchases WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Producers can view tickets for own events" ON tickets;
CREATE POLICY "Producers can view tickets for own events"
  ON tickets FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN producers p ON e.producer_id = p.id
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Producers can validate tickets for own events" ON tickets;
CREATE POLICY "Producers can validate tickets for own events"
  ON tickets FOR UPDATE
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN producers p ON e.producer_id = p.id
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can create tickets" ON tickets;
CREATE POLICY "Anyone can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all tickets" ON tickets;
CREATE POLICY "Admins can view all tickets"
  ON tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 13. POLÍTICAS RLS - refunds
-- ============================================

DROP POLICY IF EXISTS "Users can view own refunds" ON refunds;
CREATE POLICY "Users can view own refunds"
  ON refunds FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create refunds" ON refunds;
CREATE POLICY "Users can create refunds"
  ON refunds FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    guest_email IS NOT NULL
  );

DROP POLICY IF EXISTS "Producers can view refunds for own events" ON refunds;
CREATE POLICY "Producers can view refunds for own events"
  ON refunds FOR SELECT
  USING (
    purchase_id IN (
      SELECT DISTINCT p.id FROM purchases p
      JOIN tickets t ON t.purchase_id = p.id
      JOIN events e ON t.event_id = e.id
      JOIN producers pr ON e.producer_id = pr.id
      JOIN profiles prof ON pr.user_id = prof.id
      WHERE prof.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Producers can process refunds for own events" ON refunds;
CREATE POLICY "Producers can process refunds for own events"
  ON refunds FOR UPDATE
  USING (
    purchase_id IN (
      SELECT DISTINCT p.id FROM purchases p
      JOIN tickets t ON t.purchase_id = p.id
      JOIN events e ON t.event_id = e.id
      JOIN producers pr ON e.producer_id = pr.id
      JOIN profiles prof ON pr.user_id = prof.id
      WHERE prof.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all refunds" ON refunds;
CREATE POLICY "Admins can manage all refunds"
  ON refunds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 14. POLÍTICAS RLS - event_views
-- ============================================

DROP POLICY IF EXISTS "Anyone can create event views" ON event_views;
CREATE POLICY "Anyone can create event views"
  ON event_views FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Producers can view views for own events" ON event_views;
CREATE POLICY "Producers can view views for own events"
  ON event_views FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN producers p ON e.producer_id = p.id
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all event views" ON event_views;
CREATE POLICY "Admins can view all event views"
  ON event_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 8️⃣ PARTE 8: VISTA PARA ANALYTICS (EJECUTAR ÚLTIMO)
-- ============================================
-- ✅ Ejecutar al final, después de todas las políticas RLS
-- Esta vista usa las tablas creadas anteriormente

CREATE OR REPLACE VIEW event_metrics AS
SELECT 
  e.id,
  e.name,
  e.producer_id,
  e.status,
  e.start_date,
  COUNT(DISTINCT t.id) as tickets_sold,
  COALESCE(SUM(tt.price), 0) as total_revenue,
  COUNT(DISTINCT ev.id) as total_views,
  COUNT(DISTINCT CASE WHEN t.status = 'used' THEN t.id END) as tickets_used,
  COUNT(DISTINCT CASE WHEN t.status = 'valid' THEN t.id END) as tickets_valid
FROM events e
LEFT JOIN ticket_types tt ON tt.event_id = e.id
LEFT JOIN tickets t ON t.ticket_type_id = tt.id
LEFT JOIN event_views ev ON ev.event_id = e.id
GROUP BY e.id, e.name, e.producer_id, e.status, e.start_date;

-- ============================================
-- ✅ FIN DEL SCRIPT
-- ============================================
-- 
-- 📋 RESUMEN DEL ORDEN DE EJECUCIÓN:
-- 
-- 1️⃣ PARTE 1: Extensiones (líneas 10-13)
--    → Ejecutar primero, verificar ✅
-- 
-- 2️⃣ PARTE 2: Tablas (líneas 18-100)
--    → Ejecutar segundo, verificar que se crearon 8 tablas ✅
-- 
-- 3️⃣ PARTE 3: Índices (líneas 105-150)
--    → Ejecutar tercero, verificar ✅
-- 
-- 4️⃣ PARTE 4: Funciones (líneas 155-250)
--    → Ejecutar cuarto, verificar ✅
-- 
-- 5️⃣ PARTE 5: Triggers (líneas 255-290)
--    → Ejecutar quinto, verificar ✅
-- 
-- 6️⃣ PARTE 6: Habilitar RLS (líneas 295-305)
--    → Ejecutar sexto, verificar ✅
-- 
-- 7️⃣ PARTE 7: Políticas RLS (líneas 310-650)
--    → Ejecutar séptimo, verificar ✅
-- 
-- 8️⃣ PARTE 8: Vista Analytics (líneas 655-670)
--    → Ejecutar último, verificar ✅
-- 
-- 🔍 VERIFICACIÓN FINAL:
-- Ejecuta esto para verificar que todo se creó:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' ORDER BY table_name;
-- 
-- Deberías ver: event_metrics, event_views, events, profiles, 
-- producers, purchases, refunds, ticket_types, tickets
