import { FormEvent, useState } from 'react'
import { supabase } from '../services/supabase'
import type { ResultadoConsulta } from '../types'

/**
 * PÁGINA PÚBLICA (la que abre el QR).
 * Llama a la función SQL "consultar_mesa" (ver supabase/schema.sql).
 * Los visitantes nunca leen las tablas directamente.
 */
export default function ConsultarMesa() {
  const [nombre, setNombre] = useState('')
  const [resultados, setResultados] = useState<ResultadoConsulta[] | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function consultar(e: FormEvent) {
    e.preventDefault()
    setError('')
    setResultados(null)
    if (nombre.trim().length < 3) {
      setError('Escribe al menos 3 letras del nombre de tu familia.')
      return
    }
    setCargando(true)
    const { data, error } = await supabase.rpc('consultar_mesa', { p_nombre: nombre })
    setCargando(false)
    if (error) {
      setError('No pudimos realizar la consulta. Intenta de nuevo o pide ayuda al organizador.')
      return
    }
    setResultados((data ?? []) as ResultadoConsulta[])
  }

  return (
    <main className="publico">
      <h1>¡Bienvenidos a nuestra celebración!</h1>
      <p className="sub">Consulta la mesa asignada a tu familia.</p>

      <form onSubmit={consultar}>
        <input
          type="text"
          placeholder="Escribe el nombre de tu familia"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoFocus
        />
        <button type="submit" disabled={cargando}>
          {cargando ? 'Buscando…' : 'CONSULTAR MI MESA'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {resultados && resultados.length === 0 && (
        <p className="error">
          No encontramos esa familia. Revisa el nombre (por ejemplo «Pérez») o pide ayuda al organizador.
        </p>
      )}

      {resultados?.map((r) => (
        <div className="tarjeta" key={r.familia}>
          <h2>¡Bienvenidos, {r.familia}!</h2>
          {r.mesa ? (
            <p className="mesa">🪑 SU MESA ES LA {r.mesa.toUpperCase()}</p>
          ) : (
            <p>Aún no tienen mesa asignada. Consulta con el organizador.</p>
          )}
          <p>Invitados registrados: {r.personas} {r.personas === 1 ? 'persona' : 'personas'}.</p>
        </div>
      ))}
    </main>
  )
}
