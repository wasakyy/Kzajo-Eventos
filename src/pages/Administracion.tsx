import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import type { Familia, Mesa } from '../types'
import Login from '../components/Login'
import GeneradorQR from '../components/GeneradorQR'
import ImportarExcel from '../components/ImportarExcel'

/** PANEL PRIVADO. Solo usuarios autenticados (Supabase Auth) pasan las políticas RLS. */
export default function Administracion() {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSesion(data.session); setListo(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!listo) return null
  if (!sesion) return <Login />
  return <Panel />
}

const vacio = { id: '', nombre: '', cantidad_personas: 1, mesa_id: '' }

function Panel() {
  const [familias, setFamilias] = useState<Familia[]>([])
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [form, setForm] = useState(vacio)
  const [filtro, setFiltro] = useState('')
  const [cantMesas, setCantMesas] = useState(10)
  const [capMesas, setCapMesas] = useState(12)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    const [f, m] = await Promise.all([
      supabase.from('familias').select('*').order('nombre'),
      supabase.from('mesas').select('*').order('nombre'),
    ])
    if (f.error || m.error) setError((f.error ?? m.error)!.message)
    setFamilias((f.data ?? []) as Familia[])
    setMesas((m.data ?? []) as Mesa[])
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const nombreMesa = (id: string | null) => mesas.find((m) => m.id === id)?.nombre ?? '—'

  // Mesas con al menos un invitado asignado
  const ocupadas = useMemo(
    () => new Set(familias.map((f) => f.mesa_id).filter(Boolean)),
    [familias]
  )

  // Personas ya asignadas por mesa (suma de cantidad_personas)
  const usadas = useMemo(() => {
    const u: Record<string, number> = {}
    familias.forEach((f) => {
      if (f.mesa_id) u[f.mesa_id] = (u[f.mesa_id] ?? 0) + f.cantidad_personas
    })
    return u
  }, [familias])

  // Ahora varios invitados pueden compartir mesa: se controla por cupo, no por exclusividad
  const disponibles = mesas.filter((m) => m.activa)

  const visibles = familias.filter((f) => f.nombre.toLowerCase().includes(filtro.toLowerCase()))

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError('')
    const datos = {
      nombre: form.nombre.trim(),
      cantidad_personas: Number(form.cantidad_personas),
      mesa_id: form.mesa_id || null,
    }
    const { error } = form.id
      ? await supabase.from('familias').update(datos).eq('id', form.id)
      : await supabase.from('familias').insert(datos)
    if (error) {
      setError(error.message)
      return
    }
    setForm(vacio)
    cargar()
  }

  async function eliminar(f: Familia) {
    if (!confirm(`¿Eliminar la reserva de ${f.nombre}?`)) return
    const { error } = await supabase.from('familias').delete().eq('id', f.id)
    if (error) setError(error.message)
    cargar()
  }

  async function crearMesas() {
    const base = mesas.length
    const nuevas = Array.from({ length: cantMesas }, (_, i) => ({
      nombre: 'Mesa ' + String(base + i + 1).padStart(2, '0'),
      capacidad: capMesas,
    }))
    const { error } = await supabase.from('mesas').insert(nuevas)
    if (error) setError(error.message)
    cargar()
  }

  return (
    <main className="admin">
      <header>
        <h1>Panel de administración</h1>
        <button className="sec" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      </header>

      <div className="indicadores">
        <div><b>{familias.length}</b>Invitados</div>
        <div><b>{mesas.length}</b>Mesas</div>
        <div><b>{ocupadas.size}</b>Con invitados</div>
        <div>
          <b>{mesas.filter((m) => m.activa && (usadas[m.id] ?? 0) < m.capacidad).length}</b>
          Con cupo
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h3>{form.id ? 'Editar invitado' : 'Registrar invitado'}</h3>
        <form onSubmit={guardar} className="fila">
          <input
            placeholder="Nombre del invitado"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />
          <input
            type="number"
            min={1}
            title="Total de personas, contando al invitado"
            placeholder="Total"
            value={form.cantidad_personas}
            onChange={(e) => setForm({ ...form, cantidad_personas: Number(e.target.value) })}
          />
          <select value={form.mesa_id} onChange={(e) => setForm({ ...form, mesa_id: e.target.value })}>
            <option value="">Sin mesa</option>
            {disponibles.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre} (libres: {m.capacidad - (usadas[m.id] ?? 0)})
              </option>
            ))}
          </select>
          <button type="submit">{form.id ? 'Guardar' : 'Agregar'}</button>
          {form.id && <button type="button" className="sec" onClick={() => setForm(vacio)}>Cancelar</button>}
        </form>
        <p className="peq">El número es el total de personas, contando al invitado.</p>
      </section>

      <section className="panel">
        <h3>Invitados</h3>
        <input placeholder="Buscar invitado…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        <table>
          <thead><tr><th>Invitado</th><th>Personas</th><th>Mesa</th><th></th></tr></thead>
          <tbody>
            {visibles.map((f) => (
              <tr key={f.id}>
                <td>{f.nombre}</td>
                <td>{f.cantidad_personas}</td>
                <td>{nombreMesa(f.mesa_id)}</td>
                <td>
                  <button
                    className="sec"
                    onClick={() =>
                      setForm({
                        id: f.id,
                        nombre: f.nombre,
                        cantidad_personas: f.cantidad_personas,
                        mesa_id: f.mesa_id ?? '',
                      })
                    }
                  >
                    Editar
                  </button>{' '}
                  <button className="peligro" onClick={() => eliminar(f)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Mesas</h3>
        <table>
          <thead><tr><th>Mesa</th><th>Ocupadas</th><th>Capacidad</th><th>Libres</th></tr></thead>
          <tbody>
            {mesas.map((m) => (
              <tr key={m.id}>
                <td>{m.nombre}</td>
                <td>{usadas[m.id] ?? 0}</td>
                <td>{m.capacidad}</td>
                <td>{m.capacidad - (usadas[m.id] ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Crear mesas</h3>
        <div className="fila">
          <label>Cantidad <input type="number" min={1} value={cantMesas} onChange={(e) => setCantMesas(Number(e.target.value))} /></label>
          <label>Capacidad <input type="number" min={1} value={capMesas} onChange={(e) => setCapMesas(Number(e.target.value))} /></label>
          <button onClick={crearMesas}>Crear</button>
        </div>
      </section>

      <ImportarExcel mesas={mesas} alTerminar={cargar} />
      <GeneradorQR />
    </main>
  )
}