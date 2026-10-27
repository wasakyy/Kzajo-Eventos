# Consulta de mesas por QR

Aplicación web para eventos: el organizador registra familias y mesas, y los
invitados escanean **un único QR** para consultar su mesa escribiendo el nombre
de su familia. Si cambias una mesa, el QR sigue siendo el mismo.

**Reglas:** búsqueda solo por nombre · una familia por mesa.

## Estructura

```
reservas-evento/
├── supabase/schema.sql          ← TABLAS + SEGURIDAD (se ejecuta una vez en Supabase)
├── .env.example                 ← plantilla de claves (copiar a .env.local)
├── vercel.json                  ← permite rutas como /admin en Vercel
└── src/
    ├── services/supabase.ts     ← ★ AQUÍ SE CONECTA LA BASE DE DATOS
    ├── pages/ConsultarMesa.tsx  ← página pública (la del QR)  ruta: /
    ├── pages/Administracion.tsx ← panel privado               ruta: /admin
    ├── components/Login.tsx         inicio de sesión del admin
    ├── components/GeneradorQR.tsx   genera y descarga el QR
    ├── components/ImportarExcel.tsx importa familias desde Excel
    └── types.ts / App.tsx / main.tsx / styles.css
```

## Puesta en marcha (paso a paso)

### 1. Crear la base de datos en Supabase
1. Crea una cuenta y un proyecto en https://supabase.com
2. Menú **SQL Editor → New query**, pega el contenido de `supabase/schema.sql` y pulsa **Run**.
   Esto crea las tablas `mesas` y `familias`, las reglas de seguridad y la función pública `consultar_mesa`.

### 2. Crear el usuario administrador
1. En Supabase: **Authentication → Users → Add user → Create new user**.
2. Escribe tu correo y contraseña (marca *Auto Confirm User*).
3. Recomendado: **Authentication → Sign In / Providers → desactiva "Allow new users to sign up"**,
   para que nadie más pueda crearse una cuenta de administrador.

### 3. Conectar la aplicación (★ dónde se conecta la base de datos)
1. En Supabase: **Project Settings → API**. Copia *Project URL* y la clave *anon public*.
2. En la carpeta del proyecto, copia `.env.example` como `.env.local` y pega los valores:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
3. Esas variables las lee **`src/services/supabase.ts`**, el único archivo que crea la conexión.
4. **Nunca** pongas la clave `service_role` en el proyecto.

### 4. Probar en tu computador
```bash
npm install
npm run dev
```
Abre la dirección que muestra Vite. `/` es la consulta pública y `/admin` el panel.

### 5. Publicar en Vercel
1. Sube el proyecto a GitHub (`.env.local` está ignorado, no se sube).
2. En https://vercel.com: **Add New → Project** → elige el repositorio (Vite se detecta solo).
3. Antes de desplegar, en **Environment Variables** agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Despliega. Obtendrás una dirección como `https://reservas-evento.vercel.app`.

### 6. Generar el QR
Entra a `https://TU-DIRECCION.vercel.app/admin`, inicia sesión y descarga el QR desde
la sección **QR del evento**. Imprímelo. (Genéralo desde la dirección publicada, no desde localhost.)

## Cómo usarla
1. **Crear mesas** (ej. 100 mesas de capacidad 10) o importarlas con el Excel.
2. **Registrar familias** a mano, o **importar Excel** con columnas `Familia | Invitados | Mesa`.
3. Cambiar la mesa de una familia: botón **Editar** → elige otra mesa libre → Guardar.

## Seguridad (resumen)
- Las tablas están protegidas con RLS: los visitantes **no pueden** leer ni modificar nada directamente.
- Solo pueden ejecutar `consultar_mesa()`, que devuelve únicamente familia, personas y mesa,
  exige mínimo 3 letras y limita a 5 resultados (dificulta recorrer la lista completa).
- Solo los usuarios autenticados (admin) acceden al panel y a las tablas.
- El servidor impide asignar dos familias a la misma mesa y superar la capacidad.

## Límites y notas
- Requiere internet en los celulares. Revisa los límites de los planes gratuitos de Supabase y Vercel antes de un evento grande.
- Los nombres se buscan sin importar tildes ni mayúsculas, y por coincidencia parcial.
- Si dos familias comparten apellido, aparecerán ambas (hasta 5): dales nombres distintos (ej. «Familia Pérez Gómez»).
