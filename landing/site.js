/* ApiPass landing — language toggle. Static, no network, no trackers. */
(function () {
  'use strict';

  const STRINGS = {
    es: {
      eyebrow: 'C-LAB · Herramienta · bóveda cifrada',
      role: 'Bóveda offline · código abierto · inspirada en KeePassXC',
      hero_title: 'Tus API keys, cifradas y bajo tu control.',
      hero_lead: 'Una bóveda cifrada para guardar y organizar tus API keys. Funciona 100% en tu dispositivo, sin servidor, sin telemetría, sin nube. AES-256-GCM con clave maestra derivada con Argon2id; el archivo de bóveda nunca sale de tu equipo.',
      cta_download: 'Descargar para macOS',
      cta_browser: 'Usar en el navegador',
      hero_note: 'macOS Intel + Apple Silicon · firmada y notarizada por Apple · gratis y de código abierto · ',
      all_downloads: 'todas las descargas',
      f1_t: 'Cifrada y offline',
      f1_d: 'AES-256-GCM, clave derivada con Argon2id. El archivo de bóveda permanece en tu dispositivo.',
      f2_t: 'Pensada para API keys',
      f2_d: 'Agrupa por servicio, proyecto y entorno. Adjunta archivos. Busca al instante.',
      f3_t: 'Portapapeles con autoborrado',
      f3_d: 'Al estilo KeePassXC: las copias se borran del portapapeles tras unos segundos.',
      f4_t: 'Firmada y notarizada',
      f4_d: 'Firmada con Developer ID y notarizada por Apple, se abre sin avisos alarmantes.',
      f5_t: 'Web o escritorio',
      f5_d: 'El mismo código en el navegador o como app nativa que guarda el archivo real.',
      f6_t: 'Auditable',
      f6_d: 'Código abierto, sin frameworks ni CDNs. Verifica cada descarga con su SHA-256.',
      preview_label: 'Vista previa de la bóveda',
      copied_4s: 'copiado · 4s',
      protects: 'Protege',
      prot_1: 'Un archivo de bóveda robado es ilegible sin tu contraseña maestra.',
      prot_2: 'La manipulación hace que el descifrado falle, nunca se abre alterado en silencio.',
      prot_3: 'Nada cruza la red; funciona totalmente sin conexión.',
      doesnt: 'No protege',
      no_1: 'Un dispositivo comprometido (malware, keylogger) mientras la bóveda está abierta.',
      no_2: 'Una contraseña maestra débil ante fuerza bruta, usa una larga.'
    },
    en: {
      eyebrow: 'C-LAB · Tool · encrypted vault',
      role: 'Offline vault · open source · KeePassXC-inspired',
      hero_title: 'Your API keys, encrypted and under your control.',
      hero_lead: 'An encrypted vault to store and organize your API keys. It runs 100% on your device, no server, no telemetry, no cloud. AES-256-GCM with an Argon2id-derived master key; the vault file never leaves your machine.',
      cta_download: 'Download for macOS',
      cta_browser: 'Use in browser',
      hero_note: 'macOS Intel + Apple Silicon · signed & notarized by Apple · free & open source · ',
      all_downloads: 'all downloads',
      f1_t: 'Encrypted & offline',
      f1_d: 'AES-256-GCM, key derived with Argon2id. The vault file stays on your device.',
      f2_t: 'Built for API keys',
      f2_d: 'Group by service, project and environment. Attach files. Search instantly.',
      f3_t: 'Clipboard auto-clear',
      f3_d: 'KeePassXC-style: copies wipe from the clipboard after a few seconds.',
      f4_t: 'Signed & notarized',
      f4_d: 'Developer-ID signed and Apple-notarized, opens with no scary warnings.',
      f5_t: 'Web or desktop',
      f5_d: 'Same code in the browser or as a native app that saves the real file.',
      f6_t: 'Auditable',
      f6_d: 'Open source, no frameworks or CDNs. Verify each download with its SHA-256.',
      preview_label: 'Vault preview',
      copied_4s: 'copied · 4s',
      protects: 'Protects',
      prot_1: 'A stolen vault file is unreadable without your master password.',
      prot_2: 'Tampering makes decryption fail, never opens silently altered.',
      prot_3: 'Nothing crosses the network; works fully offline.',
      doesnt: "Doesn't",
      no_1: 'A compromised device (malware, keylogger) while the vault is open.',
      no_2: 'A weak master password against brute force, use a long one.'
    }
  };

  function applyLang(lang) {
    document.documentElement.lang = lang;
    const t = STRINGS[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) el.textContent = t[key];
    });
    document.querySelectorAll('.lang-switch button').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
  }

  document.querySelectorAll('.lang-switch button').forEach(b => {
    b.addEventListener('click', () => applyLang(b.dataset.lang));
  });

  // Default to the browser's preferred language if it's English, else Spanish.
  const pref = (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  applyLang(pref);
})();
