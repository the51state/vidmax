const navigation = document.querySelector('.menu');
const menus = [...document.querySelectorAll('.menu details')];

function closeMenus(except) {
  menus.forEach((menu) => {
    if (menu !== except) menu.open = false;
  });
}

menus.forEach((menu) => {
  menu.addEventListener('toggle', () => {
    if (menu.open) closeMenus(menu);
  });
  menu.addEventListener('focusout', (event) => {
    if (event.relatedTarget && !menu.contains(event.relatedTarget)) menu.open = false;
  });
});

if (navigation) {
  document.addEventListener('click', (event) => {
    if (!navigation.contains(event.target)) closeMenus();
  });
  navigation.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openMenu = event.target.closest('details[open]');
    if (!openMenu) return;
    event.preventDefault();
    openMenu.open = false;
    openMenu.querySelector('summary').focus();
  });
}

// Hover is supplementary: native summary clicks and keyboard controls remain available.
const visualMenuPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
document.querySelectorAll('.menu-visual-dropdown').forEach((menu) => {
  let closeTimer;
  menu.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch' || !visualMenuPointer.matches) return;
    clearTimeout(closeTimer);
    closeMenus(menu);
    menu.open = true;
  });
  menu.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'touch' || !visualMenuPointer.matches) return;
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => { menu.open = false; }, 160);
  });
  menu.addEventListener('focusin', () => clearTimeout(closeTimer));
  menu.addEventListener('toggle', () => {
    if (!menu.open) clearTimeout(closeTimer);
  });
});

const header = document.querySelector('.top');
if (header) {
  const desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let pointerInRevealArea = false;

  function updateHeaderVisibility() {
    const menuOpen = menus.some((menu) => menu.open);
    const keepVisible = pointerInRevealArea || menuOpen || header.matches(':focus-within');
    const hide = desktopPointer.matches && window.scrollY > header.offsetHeight && !keepVisible;
    header.classList.toggle('header-hidden', hide);
  }

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || !desktopPointer.matches) return;
    const headerVisible = !header.classList.contains('header-hidden');
    pointerInRevealArea = event.clientY < 24 ||
      (headerVisible && (event.clientY < header.offsetHeight || header.contains(event.target)));
    updateHeaderVisibility();
  }, { passive: true });
  window.addEventListener('scroll', updateHeaderVisibility, { passive: true });
  desktopPointer.addEventListener('change', updateHeaderVisibility);
  header.addEventListener('focusin', updateHeaderVisibility);
  header.addEventListener('focusout', () => requestAnimationFrame(updateHeaderVisibility));
  menus.forEach((menu) => menu.addEventListener('toggle', updateHeaderVisibility));
  updateHeaderVisibility();
}

const backToTop = document.querySelector('.back-to-top');
if (backToTop && header) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function updateBackToTop() {
    backToTop.hidden = window.scrollY < 320;
  }

  backToTop.addEventListener('click', () => {
    header.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  });
  window.addEventListener('scroll', updateBackToTop, { passive: true });
  updateBackToTop();
}

const productField = document.querySelector('#talep-urun');
const product = new URLSearchParams(location.search).get('urun');
if (productField && product) productField.value = product.slice(0, 150);

const productMenu = document.querySelector('.menu-products');
if (productMenu) {
  const preview = productMenu.querySelector('.menu-overview img');
  const defaultImage = preview.getAttribute('src');
  const categories = productMenu.querySelectorAll('[data-preview]');

  function showPreview(source) {
    if (preview.getAttribute('src') !== source) preview.setAttribute('src', source);
  }

  categories.forEach((category) => {
    const showCategory = () => showPreview(category.dataset.preview);
    category.addEventListener('pointerenter', showCategory);
    category.addEventListener('focus', showCategory);
  });

  const overview = productMenu.querySelector('.menu-overview');
  overview.addEventListener('pointerenter', () => showPreview(defaultImage));
  overview.addEventListener('focus', () => showPreview(defaultImage));
  productMenu.addEventListener('toggle', () => {
    if (!productMenu.open) showPreview(defaultImage);
  });
}

function encodeMailPart(bytes) {
  const lines = [];
  // A multiple of 57 bytes encodes to whole MIME lines of 76 characters.
  const chunkSize = 57 * 256;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    lines.push(...btoa(String.fromCharCode(...chunk)).match(/.{1,76}/g));
  }
  return lines.join('\r\n');
}

async function createMailDraft(recipient, subject, body, files) {
  const boundary = 'vidmax-' + Date.now().toString(36);
  const parts = [
    'X-Unsent: 1',
    `To: ${recipient}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodeMailPart(new TextEncoder().encode(body)),
  ];
  for (const file of files) {
    const extension = file.name.slice(file.name.lastIndexOf('.'));
    const basename = Array.from(file.name.slice(0, -extension.length)).slice(0, 55).join('');
    const filename = (basename || 'attachment') + extension;
    const encodedName = encodeURIComponent(filename).replace(/['()*]/g, (character) =>
      '%' + character.charCodeAt(0).toString(16).toUpperCase());
    parts.push(
      `--${boundary}`,
      'Content-Type: application/octet-stream',
      'Content-Transfer-Encoding: base64',
      'Content-Disposition: attachment;',
      ` filename*=UTF-8''${encodedName}`,
      '',
      encodeMailPart(new Uint8Array(await file.arrayBuffer())),
    );
  }
  parts.push(`--${boundary}--`, '');
  return new Blob(parts.map((part) => part + '\r\n'), { type: 'message/rfc822' });
}

// Change this one source value, then run siteyi-olustur.py to update TR and EN.
const FORM_ENDPOINT = '';
const FORM_OPENED_AT = Math.round(performance.timeOrigin || Date.now());
const FORM_TEXT = {
  consent: 'Confirm that you have read the Privacy Notice to continue.',
  sending: 'Submitting…',
  quoteSuccess: 'Your quote request has been received. Our team will contact you.',
  careerSuccess: 'Your application has been received. Thank you for your interest.',
  error: 'Your submission could not be completed. Your details have been kept; please try again.',
  validation: 'Check your details and files, then try again.',
  large: 'The file size limit was exceeded. Choose smaller files.',
  rate: 'Too many attempts. Please try again later.',
  timeout: 'The submission timed out. Your details have been kept; please try again.',
  quoteSubmit: 'Submit Quote Request',
  careerSubmit: 'Submit Application',
  serverHelp: 'Your details will be submitted through this form.',
};

function setFormMetadata(form) {
  form.elements.form_opened_at.value = String(FORM_OPENED_AT);
  form.elements.language.value = document.documentElement.lang === 'en' ? 'en' : 'tr';
}

function showFormStatus(status, text, state) {
  status.hidden = false;
  status.textContent = text;
  status.dataset.state = state;
}

function initializeSubmission(form, button, fallback) {
  setFormMetadata(form);
  const consent = form.elements.kvkk_onay;
  const updateConsent = () => consent.setCustomValidity(consent.checked ? '' : FORM_TEXT.consent);
  updateConsent();
  consent.addEventListener('change', updateConsent);
  form.querySelector('fieldset').disabled = false;
  if (FORM_ENDPOINT.trim()) {
    button.textContent = form.elements.form_type.value === 'quote' ? FORM_TEXT.quoteSubmit : FORM_TEXT.careerSubmit;
    form.querySelector('[data-form-instructions]').textContent = FORM_TEXT.serverHelp;
    if (fallback) fallback.hidden = true;
  }
}

function validateSubmission(form, status) {
  form.elements.kvkk_onay.setCustomValidity(form.elements.kvkk_onay.checked ? '' : FORM_TEXT.consent);
  if (!form.reportValidity()) return false;
  if (form.elements.website.value.trim()) {
    showFormStatus(status, FORM_TEXT.error, 'error');
    return false;
  }
  return true;
}

function clearDraft(download) {
  if (!download) return;
  if (download.hasAttribute('href')) {
    URL.revokeObjectURL(download.href);
    download.removeAttribute('href');
  }
  download.remove();
}

function createDraftLink(template, draft) {
  const link = template.content.firstElementChild.cloneNode(true);
  link.href = URL.createObjectURL(draft);
  template.after(link);
  return link;
}

async function submitToEndpoint(form, button, status, download, fallback) {
  clearDraft(download);
  if (fallback) fallback.hidden = true;
  setFormMetadata(form);
  const payload = new FormData(form);
  // Omit the browser's empty File placeholder when no optional attachments were selected.
  for (const input of form.querySelectorAll('input[type="file"]')) {
    payload.delete(input.name);
    for (const file of input.files) payload.append(input.name, file, file.name);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  button.disabled = true;
  showFormStatus(status, FORM_TEXT.sending, 'pending');
  try {
    const response = await fetch(FORM_ENDPOINT.trim(), {
      method: 'POST', body: payload, headers: { Accept: 'application/json' },
      credentials: 'same-origin', signal: controller.signal,
    });
    let result;
    try { result = await response.json(); } catch { result = null; }
    if (!response.ok || !result || Array.isArray(result) || result.ok !== true) {
      const messages = { VALIDATION_ERROR: FORM_TEXT.validation, FILE_TOO_LARGE: FORM_TEXT.large, RATE_LIMITED: FORM_TEXT.rate };
      const message = response.status === 413 ? FORM_TEXT.large
        : response.status === 429 ? FORM_TEXT.rate : (Object.prototype.hasOwnProperty.call(messages, result && result.code) ? messages[result.code] : FORM_TEXT.error);
      showFormStatus(status, message, 'error');
      return;
    }
    const kind = form.elements.form_type.value;
    form.reset();
    setFormMetadata(form);
    form.elements.kvkk_onay.setCustomValidity(FORM_TEXT.consent);
    showFormStatus(status, kind === 'quote' ? FORM_TEXT.quoteSuccess : FORM_TEXT.careerSuccess, 'success');
  } catch (error) {
    showFormStatus(status, error && error.name === 'AbortError' ? FORM_TEXT.timeout : FORM_TEXT.error, 'error');
  } finally {
    clearTimeout(timeout);
    button.disabled = false;
  }
}

const quoteForm = document.querySelector('.quote-form');
if (quoteForm) {
  const attachmentInput = quoteForm.elements.ekler;
  const submitButton = quoteForm.querySelector('[type="submit"]');
  const status = quoteForm.querySelector('.quote-status');
  let fallback = null;
  let download = null;
  const draftTemplate = quoteForm.querySelector('.quote-draft-template');
  const mailTemplate = quoteForm.querySelector('.quote-mail-template');
  const recipient = 'info@vidmaxvida.com';
  const subject = 'Vidmax quote request';
  initializeSubmission(quoteForm, submitButton, fallback);
  quoteForm.addEventListener('input', (event) => {
    if (event.target.required && event.target.type !== 'checkbox') event.target.setCustomValidity('');
  });
  function validateAttachments() {
    const files = Array.from(attachmentInput.files);
    const extension = /\.(pdf|dwg|dxf|step|stp|jpe?g|png|webp|hei[cf])$/i;
    const invalid = files.some((file) => !extension.test(file.name) || file.size === 0);
    const tooLarge = files.reduce((total, file) => total + file.size, 0) > 15_000_000;
    attachmentInput.setCustomValidity(invalid
      ? 'Select non-empty files in one of the supported formats.'
      : tooLarge ? 'The total attachment size cannot exceed 15 MB.' : '');
  }
  attachmentInput.addEventListener('change', () => { validateAttachments(); attachmentInput.reportValidity(); });
  quoteForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitButton.disabled) return;
    for (const field of quoteForm.querySelectorAll('input[required]:not([type="checkbox"])')) {
      if (!field.value.trim()) {
        field.setCustomValidity('Please complete this field.');
        field.reportValidity();
        return;
      }
    }
    validateAttachments();
    if (!validateSubmission(quoteForm, status)) return;
    if (FORM_ENDPOINT.trim()) {
      await submitToEndpoint(quoteForm, submitButton, status, download, fallback);
      return;
    }
    delete status.dataset.state;
    const values = new FormData(quoteForm);
    const fields = [
      ['Full name', 'ad'], ['Company', 'sirket'], ['Email', 'eposta'],
      ['Product', 'urun'], ['Dimensions', 'olcu'], ['Quantity', 'adet'], ['Application notes', 'not'],
    ];
    if (String(values.get('telefon') || '').trim()) fields.splice(3, 0, ['Phone', 'telefon']);
    const body = fields.map(([label, key]) => `${label}: ${String(values.get(key)).trim()}`).join('\r\n');
    const mailto = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const files = Array.from(attachmentInput.files);
    status.hidden = false;
    clearDraft(download);
    if (fallback) fallback.remove();
    fallback = mailTemplate.content.firstElementChild.cloneNode(true);
    fallback.href = mailto;
    fallback.hidden = files.length === 0;
    mailTemplate.after(fallback);
    if (!files.length) {
      status.textContent = `If your email application does not open, you can send your details to ${recipient}.`;
      location.href = mailto;
      return;
    }
    submitButton.disabled = true;
    status.textContent = 'Preparing your email draft with attachments…';
    try {
      download = createDraftLink(draftTemplate, await createMailDraft(recipient, subject, body, files));
      status.textContent = 'Your email draft with attachments is ready. Download the .eml file, open it in your email application and send it.';
    } catch {
      status.textContent = 'The draft could not be prepared. Use the link below to open an email and attach the files manually.';
    } finally {
      submitButton.disabled = false;
    }
  });
}

const careerForm = document.querySelector('.career-cv');
if (careerForm) {
  const input = careerForm.elements.cv;
  const name = careerForm.elements.ad;
  const submit = careerForm.querySelector('[type="submit"]');
  const status = careerForm.querySelector('.career-cv-status');
  let download = null;
  const draftTemplate = careerForm.querySelector('.career-cv-template');
  const fallback = careerForm.querySelector('.career-cv-fallback');
  initializeSubmission(careerForm, submit, fallback);
  name.addEventListener('input', () => name.setCustomValidity(''));
  input.addEventListener('change', () => input.setCustomValidity(''));
  careerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    const applicant = name.value.trim();
    const file = input.files[0];
    const fileError = !file || !/\.(pdf|docx?)$/i.test(file.name) || file.size === 0
      ? 'Select a CV in PDF, DOC or DOCX format.'
      : file.size > 5_000_000 ? 'Your CV file cannot exceed 5 MB.' : '';
    name.setCustomValidity(applicant ? '' : 'Enter your full name.');
    input.setCustomValidity(fileError);
    if (!validateSubmission(careerForm, status)) return;
    if (FORM_ENDPOINT.trim()) {
      await submitToEndpoint(careerForm, submit, status, download, fallback);
      return;
    }
    clearDraft(download);
    submit.disabled = true;
    status.hidden = false;
    delete status.dataset.state;
    status.textContent = 'Preparing your email draft with your CV attached…';
    try {
      const body = `Hello,\r\n\r\nPlease find my CV attached for general consideration.\r\n\r\nFull name: ${applicant}`;
      const draft = await createMailDraft('info@vidmaxvida.com', 'Vidmax general job application', body, [file]);
      download = createDraftLink(draftTemplate, draft);
      status.textContent = 'Download the draft, open it in your email application and select Send.';
    } catch {
      status.textContent = 'The draft could not be prepared. Open your email application and attach your CV manually.';
    } finally {
      submit.disabled = false;
    }
  });
}

// A map is created only for this click; no iframe/preconnect or stored preference on page load.
document.querySelectorAll('[data-private-map]').forEach((container) => {
  const button = container.querySelector('[data-load-map]');
  button.disabled = false;
  button.addEventListener('click', () => {
    if (container.querySelector('iframe')) return;
    const mapUrl = new URL(container.dataset.mapSrc);
    if (mapUrl.origin !== 'https://www.google.com' || mapUrl.pathname !== '/maps') return;
    mapUrl.searchParams.set('hl', document.documentElement.lang === 'en' ? 'en' : 'tr');
    const frame = document.createElement('iframe');
    frame.title = container.getAttribute('aria-label');
    frame.width = '760'; frame.height = '420';
    frame.referrerPolicy = 'no-referrer';
    frame.src = mapUrl.href;
    container.querySelector('[data-map-preview]').hidden = true;
    const status = container.querySelector('[data-map-status]');
    status.textContent = document.documentElement.lang === 'en'
      ? 'Google Maps has been requested. If it does not appear, use Get Directions.'
      : 'Google Haritalar istendi. Açılmazsa Yol Tarifi Al bağlantısını kullanabilirsiniz.';
    status.hidden = false;
    container.append(frame);
    frame.tabIndex = 0;
    frame.focus();
  });
});


// Mobil hamburger menü.
(() => {
  const header = document.querySelector('header.top');
  const toggle = header && header.querySelector('.menu-toggle');
  if (!toggle) return;
  const setOpen = open => {
    header.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (!open) header.querySelectorAll('.menu details[open]').forEach(d => d.removeAttribute('open'));
  };
  toggle.addEventListener('click', () => setOpen(!header.classList.contains('menu-open')));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && header.classList.contains('menu-open')) { setOpen(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', event => { if (event.matches) setOpen(false); });
})();

// ---------------------------------------------------------------------------
// Product grubu sayfaları: filtre düğmeleri, arama kutusu ve katlanır kullanım alanları.
// JavaScript yoksa tüm ürünler ve kullanım alanları görünür kalır.
(() => {
  const grid = document.querySelector('.application-grid');
  if (!grid) return;
  const items = [...grid.children].filter(li => li.querySelector('.application-card'));
  const en = document.documentElement.lang === 'en';
  const fold = s => s.toLocaleLowerCase(en ? 'en' : 'tr').replace(/[çğıöşü]/g, c => ({ç:'c',ğ:'g',ı:'i',ö:'o',ş:'s',ü:'u'}[c])).replace(/[^a-z0-9]+/g, ' ');
  items.forEach((li, index) => {
    const card = li.querySelector('.application-card');
    const top = card.querySelector('.application-card-top');
    li.dataset.search = fold(top ? top.textContent : card.textContent);
    const label = card.querySelector('.application-label');
    const list = label && label.nextElementSibling;
    if (!label || !list || list.tagName !== 'UL') return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'application-toggle';
    const id = 'kullanim-' + index;
    list.id = id;
    list.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', id);
    const count = list.children.length;
    button.innerHTML = `<span>${label.textContent.trim()} (${count})</span><span class="application-toggle-icon" aria-hidden="true"></span>`;
    label.replaceWith(button);
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      list.hidden = !open;
    });
  });
  if (items.length < 6) return;
  const keywords = en
    ? ['Cross', 'Torx', 'Slotted', 'Hexagon', 'Socket', 'Countersunk', 'Pan', 'Washer', 'Tapping', 'Self-drilling', 'Chipboard', 'Plastics', 'Metric', 'Flange', 'Nut', 'Bolt', 'Anchor', 'Clamp', 'DIN']
    : ['Yıldız', 'Torx', 'Düz', 'Altıköşe', 'İmbus', 'Havşa', 'Silindir', 'Pul', 'Sac', 'Matkap', 'Sunta', 'Plastik', 'Metrik', 'Flanşlı', 'Somun', 'Cıvata', 'Dübel', 'Kelepçe', 'DIN'];
  const chips = keywords.map(word => ({word, key: fold(word).trim(), hits: items.filter(li => (' ' + li.dataset.search + ' ').includes(' ' + fold(word).trim())).length}))
    .filter(c => c.hits >= 2 && c.hits < items.length).slice(0, 10);
  // Az ürünlü ve ayırt edici özelliği olmayan gruplarda filtre gösterilmez.
  if (chips.length < 2 && items.length < 10) return;
  const bar = document.createElement('div');
  bar.className = 'group-filter';
  bar.innerHTML = `<label class="visually-hidden" for="group-filter-input">${en ? 'Search this product group' : 'Bu gruptaki ürünlerde ara'}</label>`
    + `<input id="group-filter-input" type="search" placeholder="${en ? 'Search this group, e.g. DIN 7985' : 'Bu grupta ara, ör. DIN 7985'}" autocomplete="off">`
    + (chips.length >= 2 ? `<div class="group-filter-chips" role="group" aria-label="${en ? 'Filter by feature' : 'Özelliğe göre filtrele'}">`
    + `<button type="button" aria-pressed="true" data-key="">${en ? 'All' : 'Tümü'}</button>`
    + chips.map(c => `<button type="button" aria-pressed="false" data-key="${c.key}">${c.word}</button>`).join('') + '</div>' : '')
    + `<p class="group-filter-status" aria-live="polite"></p>`;
  grid.before(bar);
  const input = bar.querySelector('input');
  const status = bar.querySelector('.group-filter-status');
  let active = '';
  const apply = () => {
    const words = fold(input.value).trim().split(' ').filter(Boolean);
    let shown = 0;
    items.forEach(li => {
      const text = ' ' + li.dataset.search + ' ';
      const ok = (!active || text.includes(' ' + active)) && words.every(w => text.includes(w));
      li.hidden = !ok;
      if (ok) shown++;
    });
    status.textContent = en ? `${shown} of ${items.length} products shown` : `${items.length} üründen ${shown} tanesi gösteriliyor`;
  };
  bar.querySelectorAll('.group-filter-chips button').forEach(b => b.addEventListener('click', () => {
    active = b.dataset.key;
    bar.querySelectorAll('.group-filter-chips button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    apply();
  }));
  input.addEventListener('input', apply);
  apply();
})();

// ---------------------------------------------------------------------------
// Üst menü araması. Dizin yalnız arama açıldığında yüklenir (assets/arama-tr.js / arama-en.js).
(() => {
  const toggle = document.querySelector('.site-search-toggle');
  const panel = document.getElementById('site-search');
  if (!toggle || !panel) return;
  const en = document.documentElement.lang === 'en';
  const input = panel.querySelector('input');
  const list = panel.querySelector('.site-search-results');
  const fold = s => s.toLocaleLowerCase(en ? 'en' : 'tr').replace(/[çğıöşü]/g, c => ({ç:'c',ğ:'g',ı:'i',ö:'o',ş:'s',ü:'u'}[c])).replace(/[^a-z0-9]+/g, ' ').trim();
  let index = null;
  // Dizin klasik betik olarak yüklenir; site sunucusuz (file://) açıldığında da çalışır.
  const base = (document.currentScript && document.currentScript.src) || document.querySelector('script[src*="site"]').src;
  const vidmaxScript = src => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL(src, base).href;
    s.onload = resolve; s.onerror = reject;
    document.head.append(s);
  });
  const load = () => index || (index = (en ? vidmaxScript('./arama-en.js') : vidmaxScript('./arama-tr.js'))
    .then(() => (en ? window.VIDMAX_ARAMA_EN : window.VIDMAX_ARAMA_TR).map(e => ({title: e[0], href: e[1], group: e[2], text: ' ' + fold(e.join(' ')) + ' '}))));
  const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const render = async () => {
    const words = fold(input.value).split(' ').filter(Boolean);
    if (!words.length) { list.innerHTML = ''; return; }
    let data;
    try { data = await load(); } catch (e) { list.innerHTML = `<li class="site-search-empty">${en ? 'Search could not be loaded.' : 'Arama yüklenemedi.'}</li>`; return; }
    const hits = data.filter(e => words.every(w => e.text.includes(w)))
      .sort((a, b) => (b.text.includes(' ' + words[0]) - a.text.includes(' ' + words[0])) || a.title.length - b.title.length).slice(0, 8);
    list.innerHTML = hits.length
      ? hits.map(e => `<li><a href="${esc(e.href)}"><strong>${esc(e.title)}</strong>${e.group ? `<small>${esc(e.group)}</small>` : ''}</a></li>`).join('')
      : `<li class="site-search-empty">${en ? 'No results. Try a DIN number or product name.' : 'Sonuç bulunamadı. DIN numarası veya ürün adı deneyin.'}</li>`;
  };
  const setOpen = open => {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) { load().catch(() => {}); input.focus(); } else { toggle.focus(); }
  };
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  input.addEventListener('input', render);
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'Enter') { const first = list.querySelector('a'); if (first) location.href = first.href; }
  });
  document.addEventListener('click', e => { if (!panel.hidden && !panel.contains(e.target) && !toggle.contains(e.target)) { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); } });
})();

// ---------------------------------------------------------------------------
// Ziyaretçi istatistiği (Google Analytics 4) — yalnız ziyaretçi "Kabul et" derse yüklenir.
// Dimensionsm kimliği (G-XXXXXXXXXX) girilene kadar hiçbir şey yüklenmez ve onay penceresi görünmez.
const ANALYTICS_ID = '';
(() => {
  if (!/^G-[A-Z0-9]+$/.test(ANALYTICS_ID)) return;
  const en = document.documentElement.lang === 'en';
  const KEY = 'vidmax-cerez-tercihi';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const save = value => { try { localStorage.setItem(KEY, JSON.stringify({analytics: value, date: new Date().toISOString()})); } catch (e) {} };
  const start = () => {
    if (window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', ANALYTICS_ID);
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ANALYTICS_ID);
    document.head.append(s);
  };
  const policy = 'cerez-politikasi.html';
  const show = () => {
    if (document.querySelector('.consent-banner')) return;
    const box = document.createElement('div');
    box.className = 'consent-banner';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', en ? 'Cookie preferences' : 'Çerez tercihleri');
    box.innerHTML = `<p>${en
      ? 'With your consent we use Google Analytics cookies to count visits and see which pages are used. Strictly necessary functions work without them.'
      : 'Onay verirseniz ziyaret sayısını ve hangi sayfaların kullanıldığını görmek için Google Analytics çerezleri kullanırız. Sitenin çalışması için zorunlu değildir.'} <a href="${policy}">${en ? 'Cookie Policy' : 'Çerez Politikası'}</a></p>`
      + `<div><button type="button" class="button secondary" data-choice="0">${en ? 'Reject' : 'Reddet'}</button><button type="button" class="button secondary" data-choice="1">${en ? 'Accept' : 'Kabul et'}</button></div>`;
    box.addEventListener('click', e => {
      const b = e.target.closest('button[data-choice]');
      if (!b) return;
      const ok = b.dataset.choice === '1';
      save(ok);
      box.remove();
      if (ok) { window['ga-disable-' + ANALYTICS_ID] = false; start(); }
      else window['ga-disable-' + ANALYTICS_ID] = true;
    });
    document.body.append(box);
  };
  const choice = read();
  if (choice && choice.analytics === true) start();
  else if (!choice) show();
  document.querySelectorAll('[data-cookie-settings]').forEach(a => { a.hidden = false; a.addEventListener('click', e => { e.preventDefault(); show(); }); });
})();
