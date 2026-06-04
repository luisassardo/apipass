/*
 * api-pass — client-side encrypted API-key vault.
 * No network calls. No telemetry. No external CDN. Source is auditable.
 */
(function () {
  'use strict';

  const CRYPTO = window.ApiPassCrypto;
  const CLIPBOARD_CLEAR_SECONDS = 20; // wipe clipboard N seconds after a copy (KeePassXC-style)
  const IDLE_LOCK_MS = 5 * 60 * 1000; // auto-lock after 5 min idle
  const MAX_ATTACH_BYTES = 1024 * 1024; // 1 MB per attachment

  // Desktop (Tauri) detection. When present, we use native open/save so the app
  // reads and writes the real .apikeys file in place instead of downloading copies.
  const TAURI = window.__TAURI__ || null;
  const IS_TAURI = !!TAURI;

  // ---------- i18n ----------
  const STRINGS = {
    es: {
      title: 'ApiPass',
      subtitle: 'Tus API keys, cifradas y organizadas. Nunca salen de tu dispositivo.',
      lock: 'Bloquear',
      open_vault: 'Abrir bóveda',
      create_vault: 'Crear bóveda',
      vault_file: 'Archivo de bóveda (.apikeys)',
      choose_vault: 'Elegir archivo…',
      master_password: 'Contraseña maestra',
      unlock: 'Desbloquear',
      create_hint: 'Crea una bóveda nueva y vacía. Elige una contraseña maestra fuerte: es la única forma de abrir el archivo, y no se puede recuperar.',
      confirm_password: 'Confirmar contraseña',
      create_open: 'Crear y abrir',
      about_summary: '¿Cómo funciona y qué protege (y qué no)?',
      search_ph: 'Buscar por servicio, proyecto, entorno…',
      add_key: '+ Añadir key',
      unsaved: 'Cambios sin guardar.',
      save_download: 'Guardar (descargar bóveda)',
      empty: 'Esta bóveda no tiene keys todavía. Pulsa “Añadir key”.',
      f_service: 'Servicio',
      f_label: 'Etiqueta',
      f_label_ph: 'ej: cuenta personal, proyecto X',
      f_secret: 'Key / secret',
      f_env: 'Entorno',
      f_project: 'Proyecto',
      f_notes: 'Notas',
      f_notes_ph: 'alcance, política de rotación, dónde se usa…',
      cancel: 'Cancelar',
      save_entry: 'Guardar key',
      edit_key: 'Editar key',
      reveal: 'Mostrar',
      hide: 'Ocultar',
      copy: 'Copiar',
      copied: 'Copiado ✓',
      edit: 'Editar',
      del: 'Eliminar',
      created: 'Creada',
      rotated: 'Rotada',
      footer: 'Esta herramienta es parte de',
      for_audience: 'Creada para periodistas y defensores de derechos humanos.',
      clip_title: 'Se borrará del portapapeles automáticamente al llegar a 0',
      err_no_file: 'Elige un archivo de bóveda.',
      err_no_pw: 'Escribe la contraseña maestra.',
      err_bad_format: 'Ese archivo no es una bóveda de api-pass válida.',
      err_unsupported: 'Versión de bóveda no soportada por esta página.',
      err_wrong_pw: 'Contraseña incorrecta o archivo dañado.',
      err_pw_short: 'Usa al menos 8 caracteres (cuantos más, mejor).',
      err_pw_match: 'Las contraseñas no coinciden.',
      err_service_req: 'El servicio es obligatorio.',
      confirm_del: '¿Eliminar esta key de la bóveda?',
      confirm_discard: 'Tienes cambios sin guardar. ¿Bloquear y descartarlos?',
      clip_cleared: 'Portapapeles borrado.',
      save_failed: 'No se pudo guardar la bóveda:',
      unlocking: 'Descifrando…',
      saving: 'Cifrando…',
      err_argon2: 'No se pudo cargar el componente de cifrado (argon2).',
      pw_weak: 'Débil',
      pw_fair: 'Aceptable',
      pw_good: 'Buena',
      pw_strong: 'Fuerte',
      f_attachments: 'Archivos adjuntos',
      attach_add: '+ Añadir archivo',
      attach_note: 'Certificados, JSON de cuenta de servicio, claves… Se guardan cifrados dentro de la bóveda. Máx. 1 MB por archivo.',
      attach_download: 'Descargar',
      attach_remove: 'Quitar',
      attach_too_big: 'supera el límite de 1 MB y no se adjuntó.',
      attach_export_warn: 'Este archivo se guardará SIN cifrar en tu disco. ¿Continuar?',
      attach_saved: 'Archivo guardado.'
    },
    en: {
      title: 'ApiPass',
      subtitle: 'Your API keys, encrypted and organized. They never leave your device.',
      lock: 'Lock',
      open_vault: 'Open vault',
      create_vault: 'Create vault',
      vault_file: 'Vault file (.apikeys)',
      choose_vault: 'Choose file…',
      master_password: 'Master password',
      unlock: 'Unlock',
      create_hint: 'Create a new, empty vault. Choose a strong master password: it is the only way to open the file, and it cannot be recovered.',
      confirm_password: 'Confirm password',
      create_open: 'Create & open',
      about_summary: 'How does it work, and what does it protect (and not)?',
      search_ph: 'Search by service, project, environment…',
      add_key: '+ Add key',
      unsaved: 'Unsaved changes.',
      save_download: 'Save (download vault)',
      empty: 'This vault has no keys yet. Press “Add key”.',
      f_service: 'Service',
      f_label: 'Label',
      f_label_ph: 'e.g. personal account, project X',
      f_secret: 'Key / secret',
      f_env: 'Environment',
      f_project: 'Project',
      f_notes: 'Notes',
      f_notes_ph: 'scope, rotation policy, where it is used…',
      cancel: 'Cancel',
      save_entry: 'Save key',
      edit_key: 'Edit key',
      reveal: 'Reveal',
      hide: 'Hide',
      copy: 'Copy',
      copied: 'Copied ✓',
      edit: 'Edit',
      del: 'Delete',
      created: 'Created',
      rotated: 'Rotated',
      footer: 'This tool is part of',
      for_audience: 'Created for journalists and human rights defenders.',
      clip_title: 'Auto-clears from the clipboard when it reaches 0',
      err_no_file: 'Choose a vault file.',
      err_no_pw: 'Enter the master password.',
      err_bad_format: 'That file is not a valid api-pass vault.',
      err_unsupported: 'Vault version not supported by this page.',
      err_wrong_pw: 'Wrong password or corrupted file.',
      err_pw_short: 'Use at least 8 characters (the more, the better).',
      err_pw_match: 'Passwords do not match.',
      err_service_req: 'Service is required.',
      confirm_del: 'Delete this key from the vault?',
      confirm_discard: 'You have unsaved changes. Lock and discard them?',
      clip_cleared: 'Clipboard cleared.',
      save_failed: 'Could not save the vault:',
      unlocking: 'Decrypting…',
      saving: 'Encrypting…',
      err_argon2: 'Could not load the encryption component (argon2).',
      pw_weak: 'Weak',
      pw_fair: 'Fair',
      pw_good: 'Good',
      pw_strong: 'Strong',
      f_attachments: 'Attachments',
      attach_add: '+ Add file',
      attach_note: 'Certificates, service-account JSON, keys… stored encrypted inside the vault. Max 1 MB per file.',
      attach_download: 'Download',
      attach_remove: 'Remove',
      attach_too_big: 'exceeds the 1 MB limit and was not attached.',
      attach_export_warn: 'This file will be saved UNENCRYPTED to your disk. Continue?',
      attach_saved: 'File saved.'
    }
  };

  const ABOUT_HTML = {
    es: `
      <p>ApiPass guarda tus API keys en un único archivo <strong>cifrado</strong> (AES-256-GCM). La clave de cifrado se deriva de tu contraseña maestra con <strong>Argon2id</strong> (función resistente a memoria, 64 MiB). Todo ocurre en tu navegador: no hay servidor, no hay subida, no hay telemetría.</p>
      <p><strong>Qué protege:</strong> si alguien obtiene tu archivo de bóveda, no puede leer las keys sin tu contraseña maestra. Si manipula el archivo, el descifrado falla.</p>
      <p class="danger"><strong>Qué NO protege:</strong> si tu dispositivo está comprometido (malware, keylogger, extensión maliciosa del navegador), nada puede proteger las keys mientras la bóveda está abierta. Ninguna app web puede. Mientras está desbloqueada, las keys viven en la memoria del navegador.</p>
      <ul>
        <li>El archivo de bóveda es tuyo: guárdalo donde decidas (USB, nube cifrada). ApiPass nunca lo almacena ni lo envía.</li>
        <li>La copia al portapapeles se borra automáticamente a los 20 segundos.</li>
        <li>La bóveda se bloquea sola tras 5 minutos de inactividad o al cambiar de pestaña.</li>
        <li>Verifícalo: abre DevTools → Red → no hay peticiones. El código es HTML/JS/CSS estático y auditable.</li>
      </ul>
    `,
    en: `
      <p>ApiPass stores your API keys in a single <strong>encrypted</strong> file (AES-256-GCM). The encryption key is derived from your master password with <strong>Argon2id</strong> (a memory-hard function, 64 MiB). Everything runs in your browser: no server, no upload, no telemetry.</p>
      <p><strong>What it protects:</strong> if someone gets your vault file, they cannot read the keys without your master password. If they tamper with the file, decryption fails.</p>
      <p class="danger"><strong>What it does NOT protect:</strong> if your device is compromised (malware, keylogger, malicious browser extension), nothing can protect the keys while the vault is open. No web app can. While unlocked, the keys live in browser memory.</p>
      <ul>
        <li>The vault file is yours: keep it wherever you decide (USB, encrypted cloud). ApiPass never stores or sends it.</li>
        <li>Clipboard copies are wiped automatically after 20 seconds.</li>
        <li>The vault auto-locks after 5 minutes idle or when you switch tabs.</li>
        <li>Verify it: open DevTools → Network → no requests. The code is static, auditable HTML/JS/CSS.</li>
      </ul>
    `
  };

  let currentLang = 'es';
  function t(key) { return STRINGS[currentLang][key] || key; }

  function applyLang(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key === 'about_body') el.innerHTML = ABOUT_HTML[lang];
      else if (STRINGS[lang][key] !== undefined) el.textContent = STRINGS[lang][key];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      if (STRINGS[lang][key] !== undefined) el.placeholder = STRINGS[lang][key];
    });
    document.querySelectorAll('.lang-switch button').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    if (vault) renderEntries();
  }

  document.querySelectorAll('.lang-switch button').forEach(b => {
    b.addEventListener('click', () => applyLang(b.dataset.lang));
  });

  // ---------- state ----------
  let vault = null;          // decrypted vault object { meta, entries } or null when locked
  let masterPassword = null; // held in memory only while unlocked
  let dirty = false;
  let editingId = null;
  let clipboardTimer = null;
  let idleTimer = null;
  let pendingEnvelope = null; // parsed file awaiting password on the open panel
  let currentVaultPath = null; // desktop only: path of the open/last-saved vault file
  let editorAttachments = []; // working copy of the open entry's attachments

  const $ = sel => document.querySelector(sel);

  // ---------- helpers ----------
  function nowISO() { return new Date().toISOString(); }
  function genId() {
    const b = CRYPTO.randomBytes(8);
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString(); } catch (_) { return iso; }
  }
  function setDirty(v) {
    dirty = v;
    $('#dirty-bar').classList.toggle('hidden', !v);
  }

  // Button busy state for the ~1s Argon2id hash (decrypt/encrypt). Updates the
  // label's text (the button keeps its data-i18n span) and disables it.
  function btnLabelEl(btn) { return btn.querySelector('[data-i18n]') || btn; }
  function setBtnBusy(btn, label) {
    btn.disabled = true;
    btn.dataset.busy = '1';
    btnLabelEl(btn).textContent = label;
  }
  function clearBtnBusy(btn, i18nKey) {
    delete btn.dataset.busy;
    btn.disabled = false;
    btnLabelEl(btn).textContent = t(i18nKey);
  }

  // ---------- password strength (heuristic estimate; honest, not zxcvbn) ----------
  // Returns { score: 1..4, bits } from length, character-pool size, and simple
  // penalties for low diversity, repeats, and common patterns.
  function estimateStrength(pw) {
    if (!pw) return { score: 0, bits: 0 };
    let pool = 0;
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/[0-9]/.test(pw)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
    let bits = pw.length * Math.log2(pool || 1);
    if (new Set(pw.toLowerCase()).size <= 4) bits *= 0.5;   // very few distinct chars
    if (/(.)\1{2,}/.test(pw)) bits *= 0.7;                  // 3+ repeated chars
    if (/password|qwerty|1234|abcd|admin|letmein|contrase/i.test(pw)) bits = Math.min(bits, 20);
    let score = 1;
    if (bits >= 40) score = 2;
    if (bits >= 60) score = 3;
    if (bits >= 80) score = 4;
    return { score: score, bits: bits };
  }

  function updateStrengthMeter() {
    const pw = $('#create-password').value;
    const box = $('#pw-strength');
    if (!pw) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const { score } = estimateStrength(pw);
    const colors = { 1: 'var(--err)', 2: 'var(--warn)', 3: 'var(--accent)', 4: 'var(--ok)' };
    const labels = { 1: 'pw_weak', 2: 'pw_fair', 3: 'pw_good', 4: 'pw_strong' };
    $('#pw-bar-fill').style.width = (score * 25) + '%';
    $('#pw-bar-fill').style.background = colors[score];
    $('#pw-strength-label').textContent = t(labels[score]);
    $('#pw-strength-label').style.color = colors[score];
  }

  // ---------- lock-screen tabs ----------
  $('#tab-open').addEventListener('click', () => switchLockTab('open'));
  $('#tab-create').addEventListener('click', () => switchLockTab('create'));
  function switchLockTab(which) {
    $('#tab-open').classList.toggle('active', which === 'open');
    $('#tab-create').classList.toggle('active', which === 'create');
    $('#panel-open').classList.toggle('hidden', which !== 'open');
    $('#panel-create').classList.toggle('hidden', which !== 'create');
  }

  // ---------- open existing vault ----------
  const vaultFileInput = $('#vault-file-input');
  vaultFileInput.addEventListener('change', () => {
    const file = vaultFileInput.files[0];
    $('#open-error').textContent = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        pendingEnvelope = JSON.parse(reader.result);
        currentVaultPath = null; // web: we only have the File, not a writable path
        $('#open-filename').textContent = file.name;
        $('.file-pick').classList.add('has-file');
        refreshOpenBtn();
      } catch (_) {
        pendingEnvelope = null;
        $('#open-error').textContent = t('err_bad_format');
      }
    };
    reader.readAsText(file);
  });

  // Desktop: hijack the file-pick button to use the native dialog (captures the
  // real path so we can later save the vault back in place).
  if (IS_TAURI) {
    document.querySelector('.file-pick').addEventListener('click', e => {
      e.preventDefault(); // suppress the hidden <input type=file>
      openVaultNative();
    });
    // External links open in the system browser, not inside the app webview.
    const clab = document.getElementById('clab-link');
    if (clab) clab.addEventListener('click', e => {
      e.preventDefault();
      TAURI.core.invoke('open_url', { url: clab.href });
    });
  }

  async function openVaultNative() {
    $('#open-error').textContent = '';
    try {
      const selected = await TAURI.dialog.open({
        multiple: false,
        filters: [{ name: 'api-pass vault', extensions: ['apikeys', 'json'] }]
      });
      if (!selected) return; // user cancelled
      const path = typeof selected === 'string' ? selected : selected.path;
      const text = await TAURI.core.invoke('read_vault', { path: path });
      pendingEnvelope = JSON.parse(text);
      currentVaultPath = path;
      $('#open-filename').textContent = path.replace(/\\/g, '/').split('/').pop();
      $('.file-pick').classList.add('has-file');
      refreshOpenBtn();
    } catch (_) {
      pendingEnvelope = null;
      $('#open-error').textContent = t('err_bad_format');
    }
  }

  $('#open-password').addEventListener('input', refreshOpenBtn);
  function refreshOpenBtn() {
    $('#open-btn').disabled = !(pendingEnvelope && $('#open-password').value);
  }
  $('#open-password').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !$('#open-btn').disabled) openVault();
  });
  $('#open-btn').addEventListener('click', openVault);

  async function openVault() {
    const pw = $('#open-password').value;
    $('#open-error').textContent = '';
    if (!pendingEnvelope) { $('#open-error').textContent = t('err_no_file'); return; }
    if (!pw) { $('#open-error').textContent = t('err_no_pw'); return; }
    const btn = $('#open-btn');
    setBtnBusy(btn, t('unlocking'));
    try {
      const obj = await CRYPTO.decryptVault(pendingEnvelope, pw);
      vault = normalizeVault(obj);
      masterPassword = pw;
      clearBtnBusy(btn, 'unlock');
      enterVault();
    } catch (e) {
      clearBtnBusy(btn, 'unlock');
      const map = {
        BAD_FORMAT: 'err_bad_format',
        UNSUPPORTED: 'err_unsupported',
        ARGON2_UNAVAILABLE: 'err_argon2',
        WRONG_PASSWORD_OR_CORRUPT: 'err_wrong_pw'
      };
      $('#open-error').textContent = t(map[e.message] || 'err_wrong_pw');
    }
  }

  function normalizeVault(obj) {
    if (!obj || !Array.isArray(obj.entries)) {
      return { meta: { app: 'api-pass', v: 1, created: nowISO(), modified: nowISO() }, entries: [] };
    }
    return obj;
  }

  // ---------- create new vault ----------
  function refreshCreateBtn() {
    $('#create-btn').disabled = !($('#create-password').value && $('#create-password2').value);
  }
  $('#create-password').addEventListener('input', () => { refreshCreateBtn(); updateStrengthMeter(); });
  $('#create-password2').addEventListener('input', refreshCreateBtn);
  $('#create-btn').addEventListener('click', createVault);

  function createVault() {
    const pw = $('#create-password').value;
    const pw2 = $('#create-password2').value;
    $('#create-error').textContent = '';
    if (pw.length < 8) { $('#create-error').textContent = t('err_pw_short'); return; }
    if (pw !== pw2) { $('#create-error').textContent = t('err_pw_match'); return; }
    vault = { meta: { app: 'api-pass', v: 1, created: nowISO(), modified: nowISO() }, entries: [] };
    masterPassword = pw;
    currentVaultPath = null; // new vault: first save picks a path
    setDirty(true); // brand-new vault should be saved to disk
    enterVault();
  }

  // ---------- enter / leave vault ----------
  function enterVault() {
    $('#lock-screen').classList.add('hidden');
    $('#vault-screen').classList.remove('hidden');
    $('#lock-btn').classList.remove('hidden');
    // clear lock-screen secrets from the DOM
    $('#open-password').value = '';
    $('#create-password').value = '';
    $('#create-password2').value = '';
    pendingEnvelope = null;
    renderEntries();
    resetIdleTimer();
  }

  function lockVault(skipConfirm) {
    if (dirty && !skipConfirm && !window.confirm(t('confirm_discard'))) return;
    vault = null;
    masterPassword = null;
    currentVaultPath = null;
    pendingEnvelope = null;
    setDirty(false);
    editingId = null;
    clearClipboardTimer();
    if (idleTimer) clearTimeout(idleTimer);
    $('#entries').innerHTML = '';
    $('#search').value = '';
    $('#vault-screen').classList.add('hidden');
    $('#editor-overlay').classList.add('hidden');
    $('#lock-btn').classList.add('hidden');
    $('#lock-screen').classList.remove('hidden');
    $('#open-filename').textContent = t('choose_vault');
    $('.file-pick').classList.remove('has-file');
    vaultFileInput.value = '';
    refreshOpenBtn();
    switchLockTab('open');
  }
  $('#lock-btn').addEventListener('click', () => lockVault(false));

  // ---------- auto-lock ----------
  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    if (!vault) return;
    idleTimer = setTimeout(() => lockVault(true), IDLE_LOCK_MS);
  }
  ['mousemove', 'keydown', 'click', 'input'].forEach(ev =>
    document.addEventListener(ev, () => { if (vault) resetIdleTimer(); }, { passive: true })
  );
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && vault) lockVault(true);
  });

  // ---------- clipboard ----------
  // Copy with a visible countdown that auto-clears the clipboard, like KeePassXC.
  // Only one secret can be "armed" at a time (there is one clipboard), so a new
  // copy resets the previous button's countdown.
  let copyInterval = null;
  let activeCopyBtn = null;

  function resetActiveCopyBtn() {
    if (activeCopyBtn) {
      activeCopyBtn.textContent = t('copy');
      activeCopyBtn.classList.remove('ok');
      activeCopyBtn.removeAttribute('title');
      activeCopyBtn = null;
    }
  }

  function clearClipboardTimer() {
    if (copyInterval) { clearInterval(copyInterval); copyInterval = null; }
    if (clipboardTimer) { clearTimeout(clipboardTimer); clipboardTimer = null; }
    resetActiveCopyBtn();
  }

  async function copySecret(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      // Clipboard API may be blocked (e.g. file:// in some browsers). Manual fallback.
      window.prompt(t('copy') + ':', text);
      return;
    }
    clearClipboardTimer(); // reset any prior countdown
    activeCopyBtn = btn;
    btn.classList.add('ok');
    btn.title = t('clip_title');
    btn.textContent = t('copied');
    let remaining = CLIPBOARD_CLEAR_SECONDS;
    // Show "Copied ✓" briefly, then tick the countdown down to 0 and wipe.
    clipboardTimer = setTimeout(() => {
      btn.textContent = remaining + 's';
      copyInterval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          navigator.clipboard.writeText('').catch(() => {});
          clearClipboardTimer();
        } else {
          btn.textContent = remaining + 's';
        }
      }, 1000);
    }, 900);
  }

  // ---------- search ----------
  $('#search').addEventListener('input', renderEntries);

  function matchesQuery(entry, q) {
    if (!q) return true;
    const attachNames = (entry.attachments || []).map(a => a.name).join(' ');
    const hay = [entry.service, entry.label, entry.project, entry.env, entry.notes, attachNames]
      .filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  }

  // ---------- render ----------
  function renderEntries() {
    const list = $('#entries');
    list.innerHTML = '';
    const q = $('#search').value.trim().toLowerCase();
    const entries = vault.entries
      .filter(e => matchesQuery(e, q))
      .sort((a, b) => (a.service || '').localeCompare(b.service || ''));

    $('#empty-state').classList.toggle('hidden', vault.entries.length !== 0);

    entries.forEach(entry => list.appendChild(renderEntry(entry)));
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function renderEntry(entry) {
    const card = el('div', 'entry');

    const head = el('div', 'entry-head');
    head.appendChild(el('span', 'entry-service', entry.service || '—'));
    if (entry.label) head.appendChild(el('span', 'entry-label', entry.label));
    const tags = el('div', 'entry-tags');
    if (entry.env) tags.appendChild(el('span', 'tag env-' + entry.env, entry.env));
    if (entry.project) tags.appendChild(el('span', 'tag', entry.project));
    if (entry.attachments && entry.attachments.length) {
      tags.appendChild(el('span', 'entry-attach', '📎 ' + entry.attachments.length));
    }
    head.appendChild(tags);
    card.appendChild(head);

    // secret row (masked by default)
    const secretRow = el('div', 'entry-secret-row');
    const secret = el('div', 'entry-secret');
    const masked = '•'.repeat(Math.min(40, Math.max(8, (entry.secret || '').length)));
    secret.textContent = masked;
    secretRow.appendChild(secret);

    const revealBtn = el('button', 'icon-btn', t('reveal'));
    let revealed = false;
    revealBtn.addEventListener('click', () => {
      revealed = !revealed;
      secret.textContent = revealed ? (entry.secret || '') : masked;
      secret.classList.toggle('revealed', revealed);
      revealBtn.textContent = revealed ? t('hide') : t('reveal');
    });
    secretRow.appendChild(revealBtn);

    const copyBtn = el('button', 'icon-btn', t('copy'));
    copyBtn.addEventListener('click', () => copySecret(entry.secret || '', copyBtn));
    secretRow.appendChild(copyBtn);
    card.appendChild(secretRow);

    if (entry.notes) card.appendChild(el('p', 'entry-notes', entry.notes));

    const foot = el('div', 'entry-foot');
    const editBtn = el('button', 'icon-btn', t('edit'));
    editBtn.addEventListener('click', () => openEditor(entry.id));
    const delBtn = el('button', 'icon-btn', t('del'));
    delBtn.addEventListener('click', () => deleteEntry(entry.id));
    foot.appendChild(editBtn);
    foot.appendChild(delBtn);
    const meta = el('span', 'entry-meta',
      t('created') + ' ' + fmtDate(entry.created) +
      (entry.rotated ? ' · ' + t('rotated') + ' ' + fmtDate(entry.rotated) : ''));
    foot.appendChild(meta);
    card.appendChild(foot);

    return card;
  }

  // ---------- editor modal ----------
  $('#add-btn').addEventListener('click', () => openEditor(null));
  $('#editor-cancel').addEventListener('click', closeEditor);
  $('#editor-save').addEventListener('click', saveEntry);
  $('#editor-overlay').addEventListener('click', e => {
    if (e.target === $('#editor-overlay')) closeEditor();
  });

  function openEditor(id) {
    editingId = id;
    const entry = id ? vault.entries.find(e => e.id === id) : null;
    $('#editor-title').textContent = entry ? t('edit_key') : t('add_key');
    $('#f-service').value = entry ? (entry.service || '') : '';
    $('#f-label').value = entry ? (entry.label || '') : '';
    $('#f-secret').value = entry ? (entry.secret || '') : '';
    $('#f-env').value = entry ? (entry.env || '') : '';
    $('#f-project').value = entry ? (entry.project || '') : '';
    $('#f-notes').value = entry ? (entry.notes || '') : '';
    // attachments: edit a clone so Cancel discards changes
    editorAttachments = entry && Array.isArray(entry.attachments)
      ? entry.attachments.map(a => Object.assign({}, a)) : [];
    $('#attach-error').textContent = '';
    renderAttachList();
    $('#editor-overlay').classList.remove('hidden');
    $('#f-service').focus();
  }

  function closeEditor() {
    $('#editor-overlay').classList.add('hidden');
    editingId = null;
    editorAttachments = [];
    $('#attach-input').value = '';
  }

  function saveEntry() {
    const service = $('#f-service').value.trim();
    if (!service) { $('#f-service').focus(); return; }
    const fields = {
      service: service,
      label: $('#f-label').value.trim(),
      secret: $('#f-secret').value,
      env: $('#f-env').value,
      project: $('#f-project').value.trim(),
      notes: $('#f-notes').value.trim(),
      attachments: editorAttachments
    };
    if (editingId) {
      const entry = vault.entries.find(e => e.id === editingId);
      const secretChanged = entry.secret !== fields.secret;
      Object.assign(entry, fields);
      if (secretChanged) entry.rotated = nowISO();
    } else {
      vault.entries.push(Object.assign({ id: genId(), created: nowISO(), rotated: '' }, fields));
    }
    setDirty(true);
    closeEditor();
    renderEntries();
  }

  // ---------- attachments ----------
  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }
  function arrayBufferToB64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = '';
    const CHUNK = 0x8000; // avoid call-stack limits on large files
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
  }
  function b64ToBlob(b64, type) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: type || 'application/octet-stream' });
  }

  $('#attach-input').addEventListener('change', () => {
    const files = Array.from($('#attach-input').files || []);
    $('#attach-error').textContent = '';
    files.forEach(file => {
      if (file.size > MAX_ATTACH_BYTES) {
        $('#attach-error').textContent = '"' + file.name + '" ' + t('attach_too_big');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        editorAttachments.push({
          id: genId(),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          data: arrayBufferToB64(reader.result)
        });
        renderAttachList();
      };
      reader.readAsArrayBuffer(file);
    });
    $('#attach-input').value = ''; // allow re-adding the same filename
  });

  function renderAttachList() {
    const list = $('#attach-list');
    list.innerHTML = '';
    editorAttachments.forEach(att => {
      const item = el('div', 'attach-item');
      item.appendChild(el('span', 'attach-name', att.name));
      item.appendChild(el('span', 'attach-size', fmtBytes(att.size)));
      const dl = el('button', 'icon-btn', t('attach_download'));
      dl.type = 'button';
      dl.addEventListener('click', () => exportAttachment(att));
      const rm = el('button', 'icon-btn', t('attach_remove'));
      rm.type = 'button';
      rm.addEventListener('click', () => {
        editorAttachments = editorAttachments.filter(a => a.id !== att.id);
        renderAttachList();
      });
      item.appendChild(dl);
      item.appendChild(rm);
      list.appendChild(item);
    });
  }

  // Export an attachment to disk. WARNING: writes plaintext (no longer encrypted).
  async function exportAttachment(att) {
    if (!window.confirm(t('attach_export_warn'))) return;
    if (IS_TAURI) {
      try {
        const path = await TAURI.dialog.save({ defaultPath: att.name });
        if (!path) return;
        await TAURI.core.invoke('write_file_b64', { path: path, b64: att.data });
      } catch (err) {
        window.alert(t('save_failed') + ' ' + (err && err.message ? err.message : err));
      }
      return;
    }
    const url = URL.createObjectURL(b64ToBlob(att.data, att.type));
    const a = document.createElement('a');
    a.href = url;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function deleteEntry(id) {
    if (!window.confirm(t('confirm_del'))) return;
    vault.entries = vault.entries.filter(e => e.id !== id);
    setDirty(true);
    renderEntries();
  }

  // ---------- save (encrypt, then write or download) ----------
  $('#save-btn').addEventListener('click', saveVault);
  async function saveVault() {
    const btn = $('#save-btn');
    setBtnBusy(btn, t('saving'));
    try {
      vault.meta.modified = nowISO();
      const envelope = await CRYPTO.encryptVault(vault, masterPassword);
      const text = JSON.stringify(envelope, null, 2);

      if (IS_TAURI) {
        // Desktop: write the real file in place. First save of a new vault asks
        // for a path; later saves overwrite it silently.
        let path = currentVaultPath;
        if (!path) {
          path = await TAURI.dialog.save({
            defaultPath: 'vault.apikeys',
            filters: [{ name: 'api-pass vault', extensions: ['apikeys'] }]
          });
          if (!path) return; // cancelled — keep dirty (finally clears busy)
        }
        await TAURI.core.invoke('write_vault', { path: path, contents: text });
        currentVaultPath = path;
        setDirty(false);
        return;
      }

      // Web: download a fresh file the user re-saves over their copy.
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vault.apikeys';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDirty(false);
    } catch (err) {
      window.alert(t('save_failed') + ' ' + (err && err.message ? err.message : err));
    } finally {
      clearBtnBusy(btn, 'save_download');
    }
  }

  // warn on tab close with unsaved changes
  window.addEventListener('beforeunload', e => {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---------- init ----------
  applyLang('es');
})();
