-- ════════════════════════════════════════════════════════════════════════════
-- FERMIER LAB · Políticas de seguridad RLS (Clerk + Supabase)
-- ════════════════════════════════════════════════════════════════════════════
-- Reemplaza las políticas permisivas USING(true) por reglas reales por rol y
-- por cliente. Cada cliente solo accede a SUS propios datos.
--
-- ⚠️ ANTES de correr esto, completa los pasos 1 y 2 del runbook (Clerk session
--    claims + Supabase Third-Party Auth) o nadie verá datos.
--
-- Claims que vienen en el token de Clerk:
--   auth.jwt() ->> 'rol'        → admin | asesor | operador | cliente
--   auth.jwt() ->> 'clienteId'  → id del cliente (solo rol cliente)
--   auth.jwt() ->> 'sub'        → id de usuario de Clerk
-- ════════════════════════════════════════════════════════════════════════════

-- ── 0. Limpiar políticas permisivas anteriores ──────────────────────────────
DROP POLICY IF EXISTS "service_full_access" ON clientes;
DROP POLICY IF EXISTS "service_full_access" ON parcelas;
DROP POLICY IF EXISTS "service_full_access" ON naves;
DROP POLICY IF EXISTS "service_full_access" ON puntos;
DROP POLICY IF EXISTS "service_full_access" ON analisis;
DROP POLICY IF EXISTS "service_full_access" ON fumigaciones;
DROP POLICY IF EXISTS "service_full_access" ON conversaciones;

-- ── Asegurar que RLS está activo ─────────────────────────────────────────────
ALTER TABLE clientes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE naves         ENABLE ROW LEVEL SECURITY;
ALTER TABLE puntos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE analisis      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fumigaciones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversaciones ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════════
-- CLIENTES
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY clientes_staff ON clientes FOR ALL
  USING      ((auth.jwt() ->> 'rol') IN ('admin','asesor'))
  WITH CHECK ((auth.jwt() ->> 'rol') IN ('admin','asesor'));

CREATE POLICY clientes_operador_read ON clientes FOR SELECT
  USING ((auth.jwt() ->> 'rol') = 'operador');

CREATE POLICY clientes_propio ON clientes FOR SELECT
  USING ((auth.jwt() ->> 'rol') = 'cliente' AND id = (auth.jwt() ->> 'clienteId'));

-- ════════════════════════════════════════════════════════════════════════════
-- PARCELAS
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY parcelas_staff ON parcelas FOR ALL
  USING      ((auth.jwt() ->> 'rol') IN ('admin','asesor'))
  WITH CHECK ((auth.jwt() ->> 'rol') IN ('admin','asesor'));

CREATE POLICY parcelas_operador_read ON parcelas FOR SELECT
  USING ((auth.jwt() ->> 'rol') = 'operador');

CREATE POLICY parcelas_propio ON parcelas FOR SELECT
  USING ((auth.jwt() ->> 'rol') = 'cliente' AND cliente_id = (auth.jwt() ->> 'clienteId'));

-- ════════════════════════════════════════════════════════════════════════════
-- NAVES
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY naves_staff ON naves FOR ALL
  USING      ((auth.jwt() ->> 'rol') IN ('admin','asesor'))
  WITH CHECK ((auth.jwt() ->> 'rol') IN ('admin','asesor'));

CREATE POLICY naves_operador_read ON naves FOR SELECT
  USING ((auth.jwt() ->> 'rol') = 'operador');

CREATE POLICY naves_propio ON naves FOR SELECT
  USING ((auth.jwt() ->> 'rol') = 'cliente' AND EXISTS (
    SELECT 1 FROM parcelas p
    WHERE p.id = naves.parcela_id AND p.cliente_id = (auth.jwt() ->> 'clienteId')
  ));

-- ════════════════════════════════════════════════════════════════════════════
-- PUNTOS
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY puntos_staff ON puntos FOR ALL
  USING      ((auth.jwt() ->> 'rol') IN ('admin','asesor'))
  WITH CHECK ((auth.jwt() ->> 'rol') IN ('admin','asesor'));

CREATE POLICY puntos_propio ON puntos FOR SELECT
  USING ((auth.jwt() ->> 'rol') = 'cliente' AND EXISTS (
    SELECT 1 FROM naves n
    JOIN parcelas p ON p.id = n.parcela_id
    WHERE n.id = puntos.nave_id AND p.cliente_id = (auth.jwt() ->> 'clienteId')
  ));

-- ════════════════════════════════════════════════════════════════════════════
-- ANALISIS
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY analisis_staff ON analisis FOR ALL
  USING      ((auth.jwt() ->> 'rol') IN ('admin','asesor'))
  WITH CHECK ((auth.jwt() ->> 'rol') IN ('admin','asesor'));

CREATE POLICY analisis_propio ON analisis FOR SELECT
  USING ((auth.jwt() ->> 'rol') = 'cliente' AND EXISTS (
    SELECT 1 FROM puntos pt
    JOIN naves n    ON n.id = pt.nave_id
    JOIN parcelas p ON p.id = n.parcela_id
    WHERE pt.id = analisis.punto_id AND p.cliente_id = (auth.jwt() ->> 'clienteId')
  ));

-- ════════════════════════════════════════════════════════════════════════════
-- FUMIGACIONES
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY fumig_staff ON fumigaciones FOR ALL
  USING      ((auth.jwt() ->> 'rol') IN ('admin','asesor'))
  WITH CHECK ((auth.jwt() ->> 'rol') IN ('admin','asesor'));

-- El operador registra y consulta sus rutas
CREATE POLICY fumig_operador ON fumigaciones FOR ALL
  USING      ((auth.jwt() ->> 'rol') = 'operador')
  WITH CHECK ((auth.jwt() ->> 'rol') = 'operador');

-- El cliente solo ve las fumigaciones de sus parcelas
CREATE POLICY fumig_propio ON fumigaciones FOR SELECT
  USING ((auth.jwt() ->> 'rol') = 'cliente' AND EXISTS (
    SELECT 1 FROM parcelas p
    WHERE p.id = fumigaciones.parcela_id AND p.cliente_id = (auth.jwt() ->> 'clienteId')
  ));

-- ════════════════════════════════════════════════════════════════════════════
-- CONVERSACIONES (FermierBot) — cada usuario solo las suyas
-- ════════════════════════════════════════════════════════════════════════════
CREATE POLICY conv_propias ON conversaciones FOR ALL
  USING      (user_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (auth.jwt() ->> 'sub'));

-- ════════════════════════════════════════════════════════════════════════════
-- ROLLBACK (si algo sale mal, descomenta y corre esto para volver a abrir todo)
-- ════════════════════════════════════════════════════════════════════════════
-- DROP POLICY IF EXISTS clientes_staff ON clientes;
-- DROP POLICY IF EXISTS clientes_operador_read ON clientes;
-- DROP POLICY IF EXISTS clientes_propio ON clientes;
-- ... (repetir por cada política) ...
-- CREATE POLICY "service_full_access" ON clientes      FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "service_full_access" ON parcelas      FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "service_full_access" ON naves         FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "service_full_access" ON puntos        FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "service_full_access" ON analisis      FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "service_full_access" ON fumigaciones  FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "service_full_access" ON conversaciones FOR ALL USING (true) WITH CHECK (true);
