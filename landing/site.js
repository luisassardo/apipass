/* ApiPass landing — language toggle. Static, no network, no trackers. */
(function () {
  'use strict';

  const STRINGS = {
    es: {
      nav_features: 'Características',
      nav_security: 'Seguridad',
      hero_title: 'Tus API keys, cifradas y bajo tu control.',
      hero_lead: 'Una bóveda cifrada para guardar y organizar tus API keys. Funciona 100% en tu dispositivo: sin servidor, sin telemetría, sin nube. Inspirada en KeePassXC, pensada para periodistas y defensores de derechos humanos.',
      cta_download: 'Descargar para macOS',
      cta_browser: 'Usar en el navegador',
      hero_note: 'macOS Apple Silicon · firmada y notarizada por Apple · gratis y de código abierto',
      all_downloads: 'todas las descargas',
      features_title: 'Por qué ApiPass',
      f1_t: 'Cifrado y offline',
      f1_d: 'AES-256-GCM con clave derivada de tu contraseña maestra con Argon2id (resistente a memoria). El archivo de bóveda nunca sale de tu dispositivo.',
      f2_t: 'Organizado para API keys',
      f2_d: 'Agrupa por servicio, proyecto y entorno (dev / staging / prod). Busca al instante. Recordatorio de rotación.',
      f3_t: 'Copia con cuenta atrás',
      f3_d: 'Al estilo KeePassXC: la copia al portapapeles se borra automáticamente tras unos segundos.',
      f4_t: 'App firmada y notarizada',
      f4_d: 'La app de macOS está firmada con Developer ID y notarizada por Apple: se abre sin avisos de "desarrollador no identificado".',
      f5_t: 'Web o escritorio',
      f5_d: 'El mismo código corre en el navegador o como app nativa. En escritorio abre y guarda el archivo real en su sitio.',
      f6_t: 'Auditable',
      f6_d: 'Código abierto, sin frameworks ni CDN externos. Verifica cada descarga con su hash SHA-256 publicado.',
      sec_title: 'Honestos sobre qué protege (y qué no)',
      sec_ok_t: '✓ Qué protege',
      sec_ok_1: 'Si alguien obtiene tu archivo de bóveda, no puede leer las keys sin tu contraseña maestra.',
      sec_ok_2: 'Si manipulan el archivo, el descifrado falla (no se abre silenciosamente alterado).',
      sec_ok_3: 'Nada se transmite por la red: puedes usarlo sin conexión.',
      sec_no_t: '✗ Qué NO protege',
      sec_no_1: 'Un dispositivo comprometido (malware, keylogger, extensión maliciosa) puede leer las keys mientras la bóveda está abierta. Ninguna app puede evitar esto.',
      sec_no_2: 'Una contraseña maestra débil es vulnerable a fuerza bruta. Usa una larga.',
      verify: 'Verifica tu descarga:',
      verify_link: 'y compara con SHA256SUMS.txt',
      footer: 'Esta herramienta es parte de',
      for_audience: 'Creada para periodistas y defensores de derechos humanos.'
    },
    en: {
      nav_features: 'Features',
      nav_security: 'Security',
      hero_title: 'Your API keys, encrypted and under your control.',
      hero_lead: 'An encrypted vault to store and organize your API keys. Runs 100% on your device: no server, no telemetry, no cloud. Inspired by KeePassXC, built for journalists and human rights defenders.',
      cta_download: 'Download for macOS',
      cta_browser: 'Use in the browser',
      hero_note: 'macOS Apple Silicon · signed and notarized by Apple · free and open source',
      all_downloads: 'all downloads',
      features_title: 'Why ApiPass',
      f1_t: 'Encrypted and offline',
      f1_d: 'AES-256-GCM with a key derived from your master password using Argon2id (memory-hard). The vault file never leaves your device.',
      f2_t: 'Built for API keys',
      f2_d: 'Group by service, project and environment (dev / staging / prod). Instant search. Rotation reminders.',
      f3_t: 'Copy with a countdown',
      f3_d: 'KeePassXC-style: the clipboard copy is wiped automatically after a few seconds.',
      f4_t: 'Signed and notarized app',
      f4_d: 'The macOS app is signed with a Developer ID and notarized by Apple: it opens with no "unidentified developer" warning.',
      f5_t: 'Web or desktop',
      f5_d: 'The same code runs in the browser or as a native app. On desktop it opens and saves the real file in place.',
      f6_t: 'Auditable',
      f6_d: 'Open source, no frameworks or external CDNs. Verify each download against its published SHA-256 hash.',
      sec_title: 'Honest about what it protects (and what it does not)',
      sec_ok_t: '✓ What it protects',
      sec_ok_1: 'If someone gets your vault file, they cannot read the keys without your master password.',
      sec_ok_2: 'If the file is tampered with, decryption fails (it will not open silently altered).',
      sec_ok_3: 'Nothing is sent over the network: you can use it offline.',
      sec_no_t: '✗ What it does NOT protect',
      sec_no_1: 'A compromised device (malware, keylogger, malicious extension) can read the keys while the vault is open. No app can prevent this.',
      sec_no_2: 'A weak master password is vulnerable to brute force. Use a long one.',
      verify: 'Verify your download:',
      verify_link: 'and compare against SHA256SUMS.txt',
      footer: 'This tool is part of',
      for_audience: 'Created for journalists and human rights defenders.'
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
