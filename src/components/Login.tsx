import { FormEvent, useState } from 'react'
import { supabase } from '../services/supabase'

/** Inicio de sesión del administrador (Supabase Auth, correo + contraseña). */
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Correo o contraseña incorrectos.')
  }

  return (
    <main className="publico">
      <h1>Panel de administración</h1>
      <form onSubmit={entrar}>
        <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Entrar</button>
      </form>
      {error && <p className="error">{error}</p>}
    </main>
  )
}
