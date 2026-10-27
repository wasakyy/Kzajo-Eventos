export interface Mesa {
  id: string
  nombre: string
  capacidad: number
  activa: boolean
}

export interface Familia {
  id: string
  nombre: string
  cantidad_personas: number
  mesa_id: string | null
  estado: string
}

/** Resultado que devuelve la función pública consultar_mesa() */
export interface ResultadoConsulta {
  familia: string
  personas: number
  mesa: string | null
}
