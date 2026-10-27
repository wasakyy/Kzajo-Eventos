import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

/**
 * QR ÚNICO DEL EVENTO.
 * Apunta a la raíz del sitio publicado (la página de consulta).
 * Como las mesas se leen de la base de datos, cambiar una asignación
 * NO requiere generar otro QR.
 *
 * Importante: genera/descarga el QR desde la dirección FINAL publicada
 * (ej. https://reservas-evento.vercel.app/admin), no desde localhost.
 */
export default function GeneradorQR() {
  const ref = useRef<HTMLDivElement>(null)
  const url = window.location.origin + '/'

  function descargar() {
    const canvas = ref.current?.querySelector('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'qr-consulta-mesa.png'
    a.click()
  }

  return (
    <section className="panel">
      <h3>QR del evento</h3>
      <div ref={ref} className="qr">
        <QRCodeCanvas value={url} size={256} includeMargin level="M" />
      </div>
      <p className="peq">Apunta a: <code>{url}</code></p>
      {url.includes('localhost') && (
        <p className="error">Estás en localhost: este QR no funcionará en los celulares. Genera el QR desde la dirección publicada.</p>
      )}
      <button onClick={descargar}>Descargar QR (PNG)</button>
    </section>
  )
}
