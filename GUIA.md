# Volanta · Guía para ponerla online (gratis)

Todo lo de esta guía es gratuito. Te lleva unos 20 minutos y se hace una sola vez.

## 1. Crear la cuenta de GitHub (donde se guarda el sitio)
1. Entrá a https://github.com/signup y creá una cuenta con tu email.
2. Arriba a la derecha tocá **+ → New repository**. Nombre: `volanta`. Dejalo **Public** y tocá **Create repository**.
3. En la página del repositorio tocá **uploading an existing file** y arrastrá **todo el contenido** de la carpeta `volanta` (menos `node_modules` y `dist`, si aparecen). Tocá **Commit changes**.

## 2. Publicar la web en Cloudflare Pages
1. Creá una cuenta en https://dash.cloudflare.com/sign-up
2. Andá a **Workers & Pages → Create → Pages → Connect to Git** y elegí el repositorio `volanta`.
3. Configurá así:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Tocá **Save and Deploy**. En 1 o 2 minutos tenés tu web en `https://volanta.pages.dev` (o un nombre parecido).

## 3. Activar el panel para cargar notas
1. Abrí el archivo `admin/config.yml` en GitHub (ícono del lápiz) y cambiá `TU-USUARIO` por tu usuario de GitHub. Si tu dirección de Cloudflare es distinta, cambiala también en `site_url`.
2. Creá una llave de acceso: https://github.com/settings/personal-access-tokens/new
   - Repository access: **Only select repositories → volanta**
   - Permissions → Repository permissions → **Contents: Read and write**
   - Generá la llave y copiala. Es tu contraseña: no la compartas.
3. Entrá a `https://TU-SITIO.pages.dev/admin/`, elegí **Sign in with Token** y pegá la llave.

Listo. Desde ahí:
- **Notas → Nueva nota**: completás volanta, título, bajada, sección, foto y texto, y tocás **Guardar**. En 1 o 2 minutos está en la web.
- Para que una nota vaya como principal en la portada, marcá **"¿Va como principal?"**.
- Si no subís foto, el sitio genera una portada con el color de la sección.
- **Configuración del sitio**: redes, email, Cafecito, anunciantes y el texto de "Quiénes somos".

Funciona también desde el celular.

## 4. Empezar a generar ingresos
- **Cafecito** (aportes de lectores): creá tu cuenta en https://cafecito.app y poné tu usuario en Configuración. El botón "Apoyá" empieza a funcionar solo.
- **Anunciantes locales**: subí el banner (1200 × 200 px) en Configuración → Anunciantes. Mientras no haya, el sitio muestra un espacio que invita a anunciar.
- **Google AdSense**: cuando tengas algunas semanas de notas, pedí la aprobación en https://adsense.google.com y pegá tu ID (`ca-pub-…`) en Configuración.

## 5. Dominio propio (opcional, lo único que cuesta)
Un `.com.ar` se registra en https://nic.ar y sale unos pocos miles de pesos al año. Después se conecta desde Cloudflare Pages → tu proyecto → **Custom domains**. Acordate de actualizar la dirección en Configuración del sitio.

## Antes de lanzar
- Borrá las notas de ejemplo desde el panel.
- Completá redes y email en Configuración.
