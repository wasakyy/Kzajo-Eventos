import { Route, Routes } from 'react-router-dom'
import ConsultarMesa from './pages/ConsultarMesa'
import Administracion from './pages/Administracion'
import { configuracionCompleta } from './services/supabase'

/**
 * Rutas:
 *   /        -> página pública (la que abre el QR)
 *   /admin   -> panel privado (requiere iniciar sesión)
 */
export default function App() {
  return (
    <>
      {!configuracionCompleta && (
        <div className="aviso-config">
          Falta configurar Supabase: crea el archivo <code>.env.local</code> (ver <code>.env.example</code>).
        </div>
      )}
      <Routes>
        <Route path="/" element={<ConsultarMesa />} />
        <Route path="/admin" element={<Administracion />} />
        <Route path="*" element={<ConsultarMesa />} />
      </Routes>
    </>
  )
}
