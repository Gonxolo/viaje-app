# Setup — Viaje Corea + Japón 2026

Esta guía te lleva desde cero hasta la app funcionando con URL compartible. Son 4 servicios: **GitHub** (código), **Supabase** (base de datos), **ExchangeRate-API** (tipo de cambio) y **GitHub Pages** (hosting).

Tiempo estimado: 20–30 minutos.

---

## Paso 1 — Supabase (base de datos)

1. Ir a [supabase.com](https://supabase.com) → **Start your project** → registrarse con GitHub.
2. Crear un nuevo proyecto:
   - **Name:** `viaje-corea-japon`
   - **Database Password:** elegir una contraseña fuerte (guardarla, la vas a necesitar)
   - **Region:** elegir la más cercana (ej. `us-east-1` o `ap-southeast-1`)
3. Esperar ~2 minutos a que el proyecto se inicialice.
4. Ir a **SQL Editor** (icono de terminal en el panel izquierdo) → **New query**.
5. Copiar y pegar todo el contenido de `supabase-schema.sql` → clic en **Run**.
6. Deberías ver: `Success. No rows returned`.

### Habilitar Realtime
1. Ir a **Database** → **Replication** en el panel izquierdo.
2. Buscar la tabla `trip_items` y activar el toggle.

### Obtener las API keys
1. Ir a **Project Settings** (ícono de engranaje) → **API**.
2. Copiar:
   - **Project URL** → es tu `VITE_SUPABASE_URL`
   - **anon / public key** → es tu `VITE_SUPABASE_ANON_KEY`

---

## Paso 2 — ExchangeRate-API (tipo de cambio)

1. Ir a [exchangerate-api.com](https://www.exchangerate-api.com/) → **Get Free Key**.
2. Registrarse con email.
3. Confirmar el email → se muestra tu API key directamente.
4. Copiar la key → es tu `VITE_EXCHANGE_API_KEY`.

El plan gratuito da 1.500 requests/mes, más que suficiente.

---

## Paso 3 — GitHub (subir el código)

```bash
# Clonar / mover a la carpeta del proyecto
cd viaje-app

# Inicializar git (si no está inicializado)
git init
git add .
git commit -m "Initial commit"

# Crear repo en GitHub (desde github.com) y conectarlo
git remote add origin https://github.com/TU_USUARIO/viaje-corea-japon.git
git branch -M main
git push -u origin main
```

### Agregar colaboradores al repo
1. Ir al repo en GitHub → **Settings** → **Collaborators**.
2. Invitar a las otras personas por su usuario de GitHub.

---

## Paso 4 — GitHub Secrets (las API keys)

Las keys nunca se suben al código. Se guardan como secretos en GitHub.

1. Ir al repo → **Settings** → **Secrets and variables** → **Actions**.
2. Clic en **New repository secret** y agregar los 3 secretos:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Tu Project URL de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Tu anon key de Supabase |
| `VITE_EXCHANGE_API_KEY` | Tu key de ExchangeRate-API |

---

## Paso 5 — GitHub Pages (hosting)

1. Ir al repo → **Settings** → **Pages**.
2. En **Source**, seleccionar **GitHub Actions**.
3. Guardar.

### Primer deploy
El deploy se dispara automáticamente con cada `git push` a `main`. Para el primer deploy:

```bash
git commit --allow-empty -m "Trigger first deploy"
git push
```

Ir a **Actions** en el repo para ver el progreso. En 2–3 minutos la app estará en:
```
https://TU_USUARIO.github.io/viaje-corea-japon/
```

---

## Paso 6 — Registrar usuarios

1. Abrir la URL de GitHub Pages.
2. La primera persona hace clic en **¿No tenés cuenta? Registrarse**.
3. Ingresar email + contraseña → confirmar el email que llega.
4. Repetir para cada persona del grupo (pueden hacerlo desde sus propios dispositivos).

> ℹ️ Por seguridad, Supabase por defecto requiere confirmación de email. Si quieren saltear esto durante el desarrollo: **Supabase** → **Authentication** → **Settings** → desactivar **Enable email confirmations**.

---

## Uso diario

- **Marcar como listo:** clic en el círculo a la izquierda de cada ítem.
- **Editar precio / notas / responsable:** clic en el ícono ✎.
- **Ver solo pendientes:** usar el filtro de estado.
- **Ordenar por urgencia:** está por defecto, los más urgentes arriba.
- Los cambios se sincronizan en tiempo real para todos los usuarios.

---

## Desarrollo local (opcional)

Para correr la app localmente:

```bash
# Instalar dependencias
npm install

# Crear archivo de variables de entorno
cp .env.example .env.local
# Editar .env.local con tus keys reales

# Correr en modo desarrollo
npm run dev
```

La app abre en `http://localhost:5173`.

---

## Costos

| Servicio | Plan | Costo |
|----------|------|-------|
| Supabase | Free (500MB, 50.000 filas) | $0 |
| ExchangeRate-API | Free (1.500 req/mes) | $0 |
| GitHub Pages | Free (repositorio público o privado con cuenta gratis) | $0 |

**Total: $0/mes** ✓
