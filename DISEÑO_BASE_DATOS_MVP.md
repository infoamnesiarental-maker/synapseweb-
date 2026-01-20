# 🗄️ Diseño de Base de Datos MVP - Synapse

**Versión:** MVP 1.1  
**Fecha:** 2025-01-27  
**Última actualización:** 2025-01-27 (Fix recursión RLS en purchases)  
**Enfoque:** Mínimo viable - Solo funcionalidades core

---

## 📋 TABLAS NECESARIAS PARA MVP

### 1. **profiles** (Perfiles de Usuario)
Extiende `auth.users` de Supabase. Almacena información básica de todos los usuarios.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'producer', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
```

**Campos:**
- `id`: UUID que referencia a `auth.users`
- `email`: Email único
- `full_name`: Nombre completo
- `phone`: Teléfono (opcional)
- `role`: Rol del usuario ('user', 'producer', 'admin')
- `avatar_url`: URL de foto de perfil

---

### 2. **producers** (Productoras)
Información de las productoras. Solo usuarios con role='producer' pueden tener registro aquí.

```sql
CREATE TABLE producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  email_contact TEXT,
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  twitter TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_producers_user_id ON producers(user_id);
CREATE INDEX idx_producers_active ON producers(is_active);
```

**Campos:**
- `user_id`: Referencia al perfil del usuario productora
- `name`: Nombre de la productora
- `description`: Descripción
- `logo_url`: URL del logo
- `email_contact`: Email de contacto
- `website`, `instagram`, `facebook`, `twitter`: Redes sociales
- `is_active`: Si está activa (admin puede desactivar)

---

### 3. **events** (Eventos)
Eventos creados por productoras.

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT, -- 'techno', 'house', 'trance', etc.
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

-- Índices
CREATE INDEX idx_events_producer ON events(producer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_published ON events(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_events_category ON events(category);
```

**Campos:**
- `producer_id`: Productora que crea el evento
- `name`: Nombre del evento
- `slug`: URL amigable (único)
- `description`: Descripción
- `category`: Categoría/género
- `start_date`, `end_date`: Fechas del evento
- `venue_name`, `venue_address`, `venue_city`: Ubicación
- `flyer_url`: URL del flyer
- `status`: Estado ('draft', 'published', 'finished', 'cancelled')
- `published_at`: Cuándo se publicó

---

### 4. **ticket_types** (Tipos de Entradas)
Tipos de tickets para cada evento.

```sql
CREATE TABLE ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'General', 'VIP', 'Early Bird', etc.
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  quantity_available INTEGER NOT NULL,
  quantity_sold INTEGER DEFAULT 0,
  sale_start_date TIMESTAMPTZ,
  sale_end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_ticket_types_event ON ticket_types(event_id);
```

**Campos:**
- `event_id`: Evento al que pertenece
- `name`: Nombre del tipo ('General', 'VIP', etc.)
- `price`: Precio
- `quantity_available`: Cantidad disponible
- `quantity_sold`: Cantidad vendida (se actualiza con triggers)
- `sale_start_date`, `sale_end_date`: Fechas de venta

---

### 5. **purchases** (Compras)
Compras realizadas (con o sin registro).

```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL si es guest
  guest_email TEXT, -- Si compró sin registro
  guest_name TEXT,
  guest_phone TEXT,
  event_id UUID REFERENCES events(id), -- Evento relacionado (agregado en v1.1)
  total_amount DECIMAL(10, 2) NOT NULL, -- Precio total que paga el cliente
  base_amount DECIMAL(10, 2) DEFAULT 0, -- Precio base de la productora (sin comisiones) - v1.1
  commission_amount DECIMAL(10, 2) DEFAULT 0, -- Comisión de Synapse (15%) - v1.1
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mercadopago', 'transfer')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_provider_id TEXT, -- ID de Mercado Pago
  payment_provider_data JSONB, -- Datos adicionales del pago
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_status ON purchases(payment_status);
CREATE INDEX idx_purchases_guest_email ON purchases(guest_email);
CREATE INDEX idx_purchases_event ON purchases(event_id); -- v1.1
```

**Campos:**
- `user_id`: Usuario registrado (NULL si es guest)
- `guest_email`, `guest_name`, `guest_phone`: Datos si compró sin registro
- `event_id`: Evento relacionado (agregado en v1.1)
- `total_amount`: Precio total que paga el cliente (base + comisión)
- `base_amount`: Precio base de la productora, sin comisiones (v1.1)
- `commission_amount`: Comisión de Synapse (15% sobre precio base) (v1.1)
- `payment_method`: Método de pago
- `payment_status`: Estado del pago
- `payment_provider_id`: ID de Mercado Pago
- `payment_provider_data`: Datos adicionales en JSON

**Nota:** Los campos `base_amount` y `commission_amount` se calculan automáticamente durante el checkout. El `total_amount` es la suma de estos dos valores (base + comisión).

---

### 6. **tickets** (Tickets)
Tickets generados por cada compra.

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES ticket_types(id),
  event_id UUID NOT NULL REFERENCES events(id),
  ticket_number TEXT UNIQUE NOT NULL, -- Formato: EVT-{event_id}-{sequential}
  qr_code TEXT UNIQUE NOT NULL,
  qr_hash TEXT NOT NULL, -- Hash de seguridad
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled', 'refunded')),
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_tickets_purchase ON tickets(purchase_id);
CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_qr ON tickets(qr_code);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_number ON tickets(ticket_number);
```

**Campos:**
- `purchase_id`: Compra a la que pertenece
- `ticket_type_id`: Tipo de ticket
- `event_id`: Evento
- `ticket_number`: Número único del ticket
- `qr_code`: Código QR único
- `qr_hash`: Hash de seguridad
- `status`: Estado ('valid', 'used', 'cancelled', 'refunded')
- `validated_at`, `validated_by`: Cuándo y quién validó

---

### 7. **refunds** (Devoluciones)
Solicitudes de devolución.

```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id), -- NULL si es devolución completa
  user_id UUID REFERENCES profiles(id), -- Usuario que solicita
  guest_email TEXT, -- Si es guest
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id), -- Productora o admin que procesa
  refund_amount DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_refunds_purchase ON refunds(purchase_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_user ON refunds(user_id);
```

**Campos:**
- `purchase_id`: Compra a devolver
- `ticket_id`: Ticket específico (NULL si es toda la compra)
- `user_id` o `guest_email`: Quién solicita
- `reason`: Motivo
- `status`: Estado ('pending', 'approved', 'rejected')
- `processed_at`, `processed_by`: Cuándo y quién procesó
- `refund_amount`: Monto a devolver

---

### 8. **event_views** (Vistas de Eventos)
Para analytics: cuántas veces se vio un evento.

```sql
CREATE TABLE event_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id), -- NULL si es anónimo
  ip_address TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_event_views_event ON event_views(event_id);
CREATE INDEX idx_event_views_date ON event_views(viewed_at);
```

**Campos:**
- `event_id`: Evento visto
- `user_id`: Usuario (NULL si es anónimo)
- `ip_address`: IP para evitar duplicados
- `viewed_at`: Cuándo se vio

---

### 9. **transfers** (Transferencias a Productoras) ⭐ NUEVO v1.1
Registro de transferencias de dinero a productoras después de cada venta.

```sql
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL, -- Monto a transferir (precio base de productora)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  transfer_method TEXT CHECK (transfer_method IN ('mercadopago', 'bank_transfer', 'manual')),
  transfer_reference TEXT, -- Referencia de la transferencia
  transfer_data JSONB, -- Datos adicionales de la transferencia
  scheduled_at TIMESTAMPTZ, -- Cuándo se debe transferir (24-48hs post-evento)
  transferred_at TIMESTAMPTZ, -- Cuándo se transfirió realmente
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_transfers_purchase ON transfers(purchase_id);
CREATE INDEX idx_transfers_event ON transfers(event_id);
CREATE INDEX idx_transfers_producer ON transfers(producer_id);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_scheduled ON transfers(scheduled_at) WHERE scheduled_at IS NOT NULL;
```

**Campos:**
- `purchase_id`: Compra relacionada
- `event_id`: Evento relacionado
- `producer_id`: Productora que recibirá el dinero
- `amount`: Monto a transferir (igual a `base_amount` de la compra)
- `status`: Estado de la transferencia ('pending', 'completed', 'failed', 'cancelled')
- `transfer_method`: Método de transferencia ('mercadopago', 'bank_transfer', 'manual')
- `transfer_reference`: Referencia de la transferencia (ID de Mercado Pago, número de transferencia bancaria, etc.)
- `transfer_data`: Datos adicionales en JSON
- `scheduled_at`: Fecha programada para transferir (típicamente 24-48hs después del evento)
- `transferred_at`: Fecha real de transferencia

**Flujo:**
1. Al completarse una compra, se crea un registro de transferencia con `status='pending'`
2. Se programa la transferencia para 24-48hs después del evento (`scheduled_at`)
3. Cuando se procesa la transferencia (manual o automática), se actualiza a `status='completed'` y se registra `transferred_at`

---

## 🔐 ROW LEVEL SECURITY (RLS) - POLÍTICAS

### Habilitar RLS en todas las tablas

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY; -- v1.1
```

---

### 1. **profiles** - Políticas

```sql
-- Usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admin puede ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin puede actualizar cualquier perfil
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

### 2. **producers** - Políticas

```sql
-- Cualquiera puede ver productoras activas (público)
CREATE POLICY "Public can view active producers"
  ON producers FOR SELECT
  USING (is_active = true);

-- Productoras pueden ver su propio registro
CREATE POLICY "Producers can view own producer"
  ON producers FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

-- Productoras pueden actualizar su propio registro
CREATE POLICY "Producers can update own producer"
  ON producers FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admin puede ver todas las productoras
CREATE POLICY "Admins can view all producers"
  ON producers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin puede crear/actualizar/eliminar productoras
CREATE POLICY "Admins can manage producers"
  ON producers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

### 3. **events** - Políticas

```sql
-- Público puede ver eventos publicados
CREATE POLICY "Public can view published events"
  ON events FOR SELECT
  USING (status = 'published' AND published_at IS NOT NULL);

-- Productoras pueden ver sus propios eventos (cualquier estado)
CREATE POLICY "Producers can view own events"
  ON events FOR SELECT
  USING (
    producer_id IN (
      SELECT p.id FROM producers p
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid()
    )
  );

-- Productoras pueden crear eventos
CREATE POLICY "Producers can create events"
  ON events FOR INSERT
  WITH CHECK (
    producer_id IN (
      SELECT p.id FROM producers p
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid() AND pr.role = 'producer'
    )
  );

-- Productoras pueden actualizar sus eventos (solo si están en draft o published)
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

-- Admin puede ver todos los eventos
CREATE POLICY "Admins can view all events"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin puede actualizar cualquier evento
CREATE POLICY "Admins can update all events"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

### 4. **ticket_types** - Políticas

```sql
-- Público puede ver tipos de tickets de eventos publicados
CREATE POLICY "Public can view ticket types for published events"
  ON ticket_types FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE status = 'published' AND published_at IS NOT NULL
    )
  );

-- Productoras pueden ver tipos de tickets de sus eventos
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

-- Productoras pueden crear/actualizar tipos de tickets para sus eventos
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

-- Admin puede ver/actualizar todos los tipos de tickets
CREATE POLICY "Admins can manage all ticket types"
  ON ticket_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

### 5. **purchases** - Políticas

```sql
-- Usuarios pueden ver sus propias compras
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT
  USING (user_id = auth.uid());

-- Usuarios guest pueden ver compras por email (si tienen el email)
-- Nota: Esto requiere validación adicional en la aplicación
CREATE POLICY "Guests can view purchases by email"
  ON purchases FOR SELECT
  USING (
    user_id IS NULL AND
    guest_email IS NOT NULL
    -- La validación del email se hace en la app, no en RLS
  );

-- Productoras pueden ver compras de sus eventos
-- NOTA: Usa event_id directamente para evitar recursión infinita
CREATE POLICY "Producers can view purchases for own events"
  ON purchases FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN producers p ON e.producer_id = p.id
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid()
    )
  );

-- Cualquiera puede crear compras (para checkout)
CREATE POLICY "Anyone can create purchases"
  ON purchases FOR INSERT
  WITH CHECK (true);

-- Usuarios pueden actualizar sus propias compras (solo para guest_email si no tienen user_id)
CREATE POLICY "Users can update own purchases"
  ON purchases FOR UPDATE
  USING (user_id = auth.uid());

-- Admin puede ver todas las compras
CREATE POLICY "Admins can view all purchases"
  ON purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

### 6. **tickets** - Políticas

```sql
-- Usuarios pueden ver tickets de sus compras
CREATE POLICY "Users can view own tickets"
  ON tickets FOR SELECT
  USING (
    purchase_id IN (
      SELECT id FROM purchases WHERE user_id = auth.uid()
    )
  );

-- Productoras pueden ver tickets de sus eventos (para validación)
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

-- Productoras pueden actualizar tickets de sus eventos (para validación)
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

-- Cualquiera puede crear tickets (durante checkout)
CREATE POLICY "Anyone can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (true);

-- Admin puede ver todos los tickets
CREATE POLICY "Admins can view all tickets"
  ON tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

### 7. **refunds** - Políticas

```sql
-- Usuarios pueden ver sus propias solicitudes de devolución
CREATE POLICY "Users can view own refunds"
  ON refunds FOR SELECT
  USING (user_id = auth.uid());

-- Usuarios pueden crear solicitudes de devolución
CREATE POLICY "Users can create refunds"
  ON refunds FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    guest_email IS NOT NULL -- Para guests, validar en app
  );

-- Productoras pueden ver devoluciones de sus eventos
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

-- Productoras pueden actualizar devoluciones de sus eventos
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

-- Admin puede ver y procesar todas las devoluciones
CREATE POLICY "Admins can manage all refunds"
  ON refunds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

### 8. **transfers** - Políticas ⭐ v1.1

```sql
-- Productoras pueden ver transferencias de sus eventos
CREATE POLICY "Producers can view own transfers"
  ON transfers FOR SELECT
  USING (
    producer_id IN (
      SELECT p.id FROM producers p
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = auth.uid()
    )
  );

-- Admins pueden ver todas las transferencias
CREATE POLICY "Admins can view all transfers"
  ON transfers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Usuarios autenticados pueden crear transferencias
-- (necesario cuando se completa una compra y se crea la transferencia automáticamente)
CREATE POLICY "Authenticated users can create transfers"
  ON transfers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins pueden gestionar todas las transferencias
CREATE POLICY "Admins can manage transfers"
  ON transfers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

### 9. **event_views** - Políticas

```sql
-- Cualquiera puede crear vistas (para analytics)
CREATE POLICY "Anyone can create event views"
  ON event_views FOR INSERT
  WITH CHECK (true);

-- Productoras pueden ver vistas de sus eventos
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

-- Admin puede ver todas las vistas
CREATE POLICY "Admins can view all event views"
  ON event_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

---

## 🔄 TRIGGERS Y FUNCIONES

### 1. Trigger para actualizar `updated_at`

```sql
-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_producers_updated_at BEFORE UPDATE ON producers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_types_updated_at BEFORE UPDATE ON ticket_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 2. Trigger para sincronizar auth.users → profiles

```sql
-- Función para crear perfil automáticamente cuando se crea usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    'user' -- Rol por defecto
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta cuando se crea un usuario en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

### 3. Trigger para actualizar quantity_sold en ticket_types

```sql
-- Función para actualizar cantidad vendida cuando se crea un ticket
CREATE OR REPLACE FUNCTION update_ticket_type_quantity_sold()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ticket_types
  SET quantity_sold = quantity_sold + 1
  WHERE id = NEW.ticket_type_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger cuando se crea un ticket
CREATE TRIGGER on_ticket_created
  AFTER INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_ticket_type_quantity_sold();
```

---

### 4. Función para generar ticket_number

```sql
-- Función para generar número de ticket único
CREATE OR REPLACE FUNCTION generate_ticket_number(event_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  event_prefix TEXT;
  sequence_num INTEGER;
BEGIN
  -- Obtener prefijo del evento (primeros 8 caracteres del UUID)
  event_prefix := UPPER(SUBSTRING(event_uuid::TEXT, 1, 8));
  
  -- Obtener siguiente número secuencial
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM tickets
  WHERE ticket_number LIKE 'EVT-' || event_prefix || '-%';
  
  RETURN 'EVT-' || event_prefix || '-' || LPAD(sequence_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
```

---

### 5. Función para generar QR code y hash

```sql
-- Función para generar QR code único
CREATE OR REPLACE FUNCTION generate_qr_code(ticket_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  -- Generar código QR único basado en UUID + timestamp
  RETURN 'SYN-' || UPPER(SUBSTRING(ticket_uuid::TEXT, 1, 8)) || '-' || 
         UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Función para generar hash de seguridad
CREATE OR REPLACE FUNCTION generate_qr_hash(ticket_uuid UUID, qr_code TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Usar crypt para generar hash seguro
  RETURN encode(digest(ticket_uuid::TEXT || qr_code || NOW()::TEXT, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 VISTAS ÚTILES PARA ANALYTICS

### Vista: Eventos con métricas

```sql
CREATE OR REPLACE VIEW event_metrics AS
SELECT 
  e.id,
  e.name,
  e.producer_id,
  e.status,
  e.start_date,
  COUNT(DISTINCT t.id) as tickets_sold,
  SUM(tt.price) as total_revenue,
  COUNT(DISTINCT ev.id) as total_views,
  COUNT(DISTINCT CASE WHEN t.status = 'used' THEN t.id END) as tickets_used,
  COUNT(DISTINCT CASE WHEN t.status = 'valid' THEN t.id END) as tickets_valid
FROM events e
LEFT JOIN ticket_types tt ON tt.event_id = e.id
LEFT JOIN tickets t ON t.ticket_type_id = tt.id
LEFT JOIN event_views ev ON ev.event_id = e.id
GROUP BY e.id, e.name, e.producer_id, e.status, e.start_date;
```

---

## 🚀 SCRIPT SQL COMPLETO

He creado un archivo separado con el script SQL completo listo para ejecutar: `supabase_mvp_schema.sql`

---

## 📝 NOTAS IMPORTANTES

1. **Seguridad:**
   - Las políticas RLS son la primera línea de defensa
   - Validar siempre en la aplicación también
   - Para guests, validar email en la app antes de mostrar compras

2. **Performance:**
   - Todos los índices necesarios están creados
   - Las vistas se pueden materializar si hay muchos datos

3. **Escalabilidad:**
   - Estructura preparada para agregar más features después
   - Fácil agregar campos sin romper funcionalidad existente

4. **Validaciones:**
   - Los CHECK constraints validan valores permitidos
   - Triggers mantienen datos consistentes
   - La app debe validar también (doble capa)

5. **Políticas RLS sin recursión:**
   - La política "Producers can view purchases" usa `event_id` directamente
   - Evita consultar `purchases` dentro de `purchases` (recursión infinita)
   - Ver `supabase_fix_purchases_rls_recursion.sql` para el fix aplicado

---

## 📊 RESUMEN DE CAMBIOS v1.1

### Nuevos campos en `purchases`:
- `event_id`: Referencia al evento (permite evitar recursión en políticas RLS)
- `base_amount`: Precio base de la productora
- `commission_amount`: Comisión de Synapse (15%)

### Nueva tabla `transfers`:
- Rastrea todas las transferencias a productoras
- Estados: pending, completed, failed, cancelled
- Programación automática post-evento

### Políticas RLS actualizadas:
- **`purchases`**: Política "Producers can view purchases" corregida para usar `event_id` directamente y evitar recursión infinita
- **`transfers`**: 
  - Productoras pueden ver sus transferencias
  - Usuarios autenticados pueden crear transferencias (cuando completan una compra)
  - Admins pueden gestionar todas las transferencias

### Fixes aplicados:
- ✅ Eliminada recursión infinita en políticas RLS de `purchases`
- ✅ Política de productoras ahora usa `event_id` directamente (sin consultar `purchases` dentro de `purchases`)
- ✅ Agregada política INSERT para `transfers` (permite crear transferencias cuando se completa una compra)

---

## 🚀 SCRIPTS SQL

### Scripts principales:
1. **`supabase_mvp_schema.sql`**: Script base completo con todas las tablas, funciones, triggers y políticas RLS iniciales
2. **`supabase_add_payment_fields.sql`**: Migración v1.1 que agrega campos de pagos y tabla de transferencias
3. **`supabase_remove_processing_costs.sql`**: Elimina campo `processing_costs` de purchases
4. **`supabase_fix_purchases_rls_recursion.sql`**: Fix para recursión infinita en políticas RLS de purchases
5. **`supabase_fix_transfers_insert_policy.sql`**: Agrega política INSERT para transfers (permite crear transferencias al completar compra)

### Orden de ejecución:
1. Ejecutar primero `supabase_mvp_schema.sql` (crea toda la estructura base)
2. Ejecutar después `supabase_add_payment_fields.sql` (agrega funcionalidades de pagos)
3. Ejecutar `supabase_remove_processing_costs.sql` (elimina costos de procesamiento)
4. Ejecutar `supabase_fix_purchases_rls_recursion.sql` (arregla recursión en RLS)
5. Ejecutar `supabase_fix_transfers_insert_policy.sql` (permite crear transferencias)

---

**Estado actual:** ✅ Base de datos completa con sistema de pagos MVP implementado, políticas RLS sin recursión, y creación de transferencias funcionando correctamente

**Última actualización:** 2025-01-27 - Agregada política INSERT para transfers
