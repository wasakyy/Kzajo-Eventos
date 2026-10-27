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
  const [capMesas, setCapMesas] = useState(10)
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
  const ocupadas = useMemo(() => new Set(familias.map((f) => f.mesa_id).filter(Boolean)), [familias])
  // Mesas que se pueden elegir: libres, o la que ya tiene la familia que se edita
  const disponibles = mesas.filter((m) => m.activa && (!ocupadas.has(m.id) || m.id === form.mesa_id))

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
      setError(error.code === '23505' ? 'Esa mesa ya está asignada a otra familia.' : error.message)
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
        <div><b>{familias.length}</b>Familias</div>
        <div><b>{mesas.length}</b>Mesas</div>
        <div><b>{ocupadas.size}</b>Asignadas</div>
        <div><b>{mesas.filter((m) => m.activa).length - ocupadas.size}</b>Disponibles</div>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h3>{form.id ? 'Editar familia' : 'Registrar familia'}</h3>
        <form onSubmit={guardar} className="fila">
          <input placeholder="Nombre de la familia" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <input type="number" min={1} value={form.cantidad_personas} onChange={(e) => setForm({ ...form, cantidad_personas: Number(e.target.value) })} />
          <select value={form.mesa_id} onChange={(e) => setForm({ ...form, mesa_id: e.target.value })}>
            <option value="">Sin mesa</option>
            {disponibles.map((m) => <option key={m.id} value={m.id}>{m.nombre} (cap. {m.capacidad})</option>)}
          </select>
          <button type="submit">{form.id ? 'Guardar' : 'Agregar'}</button>
          {form.id && <button type="button" className="sec" onClick={() => setForm(vacio)}>Cancelar</button>}
        </form>
      </section>

      <section className="panel">
        <h3>Familias</h3>
        <input placeholder="Buscar familia…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        <table>
          <thead><tr><th>Familia</th><th>Personas</th><th>Mesa</th><th></th></tr></thead>
          <tbody>
            {visibles.map((f) => (
              <tr key={f.id}>
                <td>{f.nombre}</td><td>{f.cantidad_personas}</td><td>{nombreMesa(f.mesa_id)}</td>
                <td>
                  <button className="sec" onClick={() => setForm({ id: f.id, nombre: f.nombre, cantidad_personas: f.cantidad_personas, mesa_id: f.mesa_id ?? '' })}>Editar</button>{' '}
                  <button className="peligro" onClick={() => eliminar(f)}>Eliminar</button>
                </td>
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
