/**
 * ============================================================
 *  AQUÍ SE CONECTA LA BASE DE DATOS (SUPABASE)
 * ============================================================
 * La URL y la clave pública se leen de las variables de entorno:
 *
 *   - En tu computador: archivo  .env.local  (ver .env.example)
 *   - En Vercel: Project > Settings > Environment Variables
 *
 * Variables necesarias:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * La clave "anon" es pública por diseño: la seguridad real la dan
 * las políticas RLS definidas en supabase/schema.sql.
 */
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configuracionCompleta = Boolean(url && key)

if (!configuracionCompleta) {
  console.error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Revisa el archivo .env.local (ver .env.example).'
  )
}

export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  key ?? 'placeholder'
)
