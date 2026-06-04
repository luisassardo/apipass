# ApiPass

Bóveda **cifrada para API keys** que corre **100% en el navegador** (o como app de escritorio). Tus keys nunca salen de tu dispositivo: no hay backend, no hay subida, no hay telemetría, no hay CDN externos.

Parte de [**C-LAB**](https://c-lab.tools/) y del portfolio [`tools-cybersecurity`](../CONVENTIONS.md), pensada para periodistas y defensores de derechos humanos que manejan keys de servicios (OpenAI, Stripe, AWS, APIs de scraping, etc.) y necesitan guardarlas de forma segura, organizada y portátil — sin confiar en un gestor en la nube.

Inspirada en [KeePassXC](https://github.com/keepassxreboot/keepassxc), pero especializada en API keys: organización por servicio / proyecto / entorno, copia al portapapeles con **borrado automático con cuenta atrás** (estilo KeePassXC) y recordatorio de rotación.

## Descargar

- **App de escritorio (macOS, Intel + Apple Silicon)** — [descarga la última versión](https://github.com/luisassardo/apipass/releases/latest) (`.dmg` universal, firmado y notarizado por Apple).
- **Usar en el navegador** — [apipass.c-lab.tools](https://apipass.c-lab.tools)

> Verifica la descarga: cada release incluye `SHA256SUMS.txt`. Puedes comprobar el hash del `.dmg` con [Hash Checker](https://github.com/luisassardo) o `shasum -a 256 ApiPass_*.dmg`.

## Por qué

Los gestores de secretos en la nube (Doppler, Infisical, 1Password) obligan a confiar en un servidor y suelen estar pensados para equipos corporativos. Para un periodista que trabaja solo o en una organización pequeña de alto riesgo, eso añade superficie de ataque y dependencia. ApiPass:

- Corre **100% en el navegador** (Web Crypto API).
- **No tiene backend.** El archivo de bóveda cifrado es tuyo y lo guardas donde decidas (USB cifrada, nube cifrada).
- **Sin CDN externos**: todo el código es estático y auditable.
- **Funciona offline** una vez cargada la página.

## Cómo protege tus keys (y qué NO protege)

| Amenaza | ¿Cubierta? |
|---|---|
| Te roban el archivo de bóveda en reposo | ✅ AES-256-GCM; la clave se deriva de tu contraseña maestra con **Argon2id** (resistente a memoria, 64 MiB) — vaults antiguos con PBKDF2 siguen abriéndose. |
| Manipulan el archivo de bóveda | ✅ El sello de autenticación de GCM falla → descifrado rechazado. |
| Contraseña maestra débil / fuerza bruta offline | ⚠️ El KDF la ralentiza, pero una contraseña débil sigue siendo débil. Usa una larga. |
| Dispositivo comprometido (malware, keylogger, extensión maliciosa) | ❌ **Fuera de alcance.** Ninguna app web puede protegerte si el endpoint está comprometido. |
| Otra app lee el portapapeles | ⚠️ Mitigado: la copia se borra automáticamente a los 20 s. |
| Keys en memoria mientras la bóveda está abierta | ⚠️ Mitigado: bloqueo automático a los 5 min de inactividad y al cambiar de pestaña. |

> **El archivo de bóveda cifrado es la frontera de privacidad.** ApiPass nunca lo almacena ni lo transmite. Lo descargas, lo guardas tú, y lo cargas para desbloquear.

ApiPass se distribuye de **dos formas con el mismo código** (la UI vive en [`frontend/`](frontend/)):

- **Web** — sitio estático (Cloudflare Pages o local). Copia al portapapeles.
- **App de escritorio** — app nativa firmada (Tauri 2.x), estilo KeePassXC. Abre y **guarda el archivo `.apikeys` real en su sitio**, sin descargar copias. Ver [`DESKTOP.md`](DESKTOP.md).

## Uso (web)

No requiere servidor. Abre `frontend/index.html` en cualquier navegador moderno:

```bash
open frontend/index.html         # macOS
xdg-open frontend/index.html     # Linux
```

O sírvelo con cualquier servidor estático:

```bash
cd frontend && python3 -m http.server 8000
# → http://localhost:8000
```

## Uso (app de escritorio)

Requiere [Rust](https://rustup.rs) y Node. La UI es la misma de `frontend/`.

```bash
npm install            # instala el CLI de Tauri (devDependency)
npx tauri dev          # ventana nativa con recarga en caliente
npx tauri build        # genera el .dmg / .app firmable (macOS)
```

Firma + notarización (macOS, con tu Apple Developer ID) se configura en
`src-tauri/tauri.conf.json` + variables de entorno; ver [`DESKTOP.md`](DESKTOP.md) §4.

> Nota: la API de portapapeles del navegador puede estar restringida bajo `file://`. Si la copia falla, sírvelo por `http://localhost` o despliega a Cloudflare Pages. En ese caso ApiPass usa un cuadro de respaldo para copiar a mano.

### Flujo

1. **Crear bóveda** → elige una contraseña maestra fuerte → se abre vacía.
2. **Añadir key**: servicio, etiqueta, key/secret, entorno (dev/staging/prod), proyecto, notas.
3. **Guardar (descargar bóveda)**: descarga `vault.apikeys` cifrado. Reemplaza tu copia anterior.
4. **Abrir bóveda**: elige el archivo `.apikeys` + contraseña maestra → desbloquea.

La contraseña maestra **no se puede recuperar**. Si la pierdes, pierdes las keys.

## Formato del archivo

`.apikeys` es un sobre JSON cifrado y versionado (ver [`PLAN.md`](PLAN.md)). El campo `version`/`kdf` permite endurecer el KDF en el futuro sin romper bóvedas antiguas.

## Estado y roadmap

- **v0.1 web** (actual) — bóveda cifrada, CRUD, búsqueda, copia con autoborrado, bloqueo automático, ES/EN.
- **v0.1 escritorio** (actual) — shell Tauri 2.x sobre la misma UI; abrir/guardar nativo del `.apikeys`. macOS-first (firmable + notarizable con Apple Dev ID). Cripto sigue en JS (PBKDF2). Ver [`DESKTOP.md`](DESKTOP.md).
- **v0.2** — KDF Argon2id (en la app, vía Rust; en web, WASM vendorizado); medidor de fuerza de contraseña; importar desde `.env`.
- **v0.2 escritorio** — desbloqueo con Touch ID / Keychain; cripto en Rust.
- **v0.3** — bundles Windows + Linux en CI; auto-updater firmado de Tauri; interop opcional KeePass KDBX (`kdbxweb`).
- **futuro** — posible CLI hermana (`apikey run -- comando`) para perfiles desarrolladores, compartiendo el mismo formato de bóveda.

## Deploy a Cloudflare Pages

Igual que el resto del portfolio: publicar la carpeta [`frontend/`](frontend/) como sitio estático (build output directory = `frontend`). El archivo [`frontend/_headers`](frontend/_headers) aplica CSP estricta (`connect-src 'none'`), que impide cualquier conexión de red desde la página.

## Licencia

MIT — ver [LICENSE](LICENSE).
