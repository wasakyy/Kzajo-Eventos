import { ChangeEvent, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../services/supabase'
import type { Mesa } from '../types'

/**
 * Importa familias desde un Excel (.xlsx) con las columnas:
 *     Familia | Invitados | Mesa
 * - "Mesa" puede ser "Mesa 01" o solo el número (1 -> "Mesa 01").
 * - Si la mesa no existe, se crea (capacidad = máx(10, invitados)).
 * - Si una mesa ya está ocupada, esa fila se reporta como error.
 */
export default function ImportarExcel({ mesas, alTerminar }: { mesas: Mesa[]; alTerminar: () => void }) {
  const [mensaje, setMensaje] = useState('')

  const nombreMesa = (v: unknown) => {
    const t = String(v ?? '').trim()
    if (!t) return ''
    return /^\d+$/.test(t) ? 'Mesa ' + t.padStart(2, '0') : t
  }

  async function procesar(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setMensaje('Importando…')
    const libro = XLSX.read(await archivo.arrayBuffer())
    const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(libro.Sheets[libro.SheetNames[0]])

    const mapa = new Map(mesas.map((m) => [m.nombre.toLowerCase(), m.id]))
    let ok = 0
    const errores: string[] = []

    for (const [i, fila] of filas.entries()) {
      const nombre = String(fila['Familia'] ?? '').trim()
      const personas = Number(fila['Invitados'] ?? 1) || 1
      const mesa = nombreMesa(fila['Mesa'])
      if (!nombre) continue

      let mesaId: string | null = null
      if (mesa) {
        mesaId = mapa.get(mesa.toLowerCase()) ?? null
        if (!mesaId) {
          const { data, error } = await supabase
            .from('mesas').insert({ nombre: mesa, capacidad: Math.max(10, personas) }).select().single()
          if (error || !data) { errores.push(`Fila ${i + 2}: no se pudo crear ${mesa}`); continue }
          mesaId = data.id
          mapa.set(mesa.toLowerCase(), data.id)
        }
      }
      const { error } = await supabase
        .from('familias').insert({ nombre, cantidad_personas: personas, mesa_id: mesaId })
      if (error) errores.push(`Fila ${i + 2} (${nombre}): ${error.code === '23505' ? 'la mesa ya está ocupada' : error.message}`)
      else ok++
    }
    setMensaje(`Importadas: ${ok}. ${errores.length ? 'Con problemas:\n' + errores.join('\n') : ''}`)
    e.target.value = ''
    alTerminar()
  }

  return (
    <section className="panel">
      <h3>Importar desde Excel</h3>
      <p className="peq">Columnas: <b>Familia</b>, <b>Invitados</b>, <b>Mesa</b></p>
      <input type="file" accept=".xlsx,.xls" onChange={procesar} />
      {mensaje && <pre className="peq">{mensaje}</pre>}
    </section>
  )
}
