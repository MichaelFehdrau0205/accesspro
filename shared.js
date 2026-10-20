/* Access Pro shared core: profile storage, languages, request + card generation,
   and the check-in channel used by the phone app, QR scan page, kiosk and staff screen.
   Everything runs in the browser. No accounts, no server. */
(function (global) {
  'use strict';

  var LANGS = {
    en: { name: 'English', speech: 'en-US' },
    es: { name: 'Español', speech: 'es-US' },
    zh: { name: '中文', speech: 'zh-CN' },
    ru: { name: 'Русский', speech: 'ru-RU' }
  };

  var NEED_IDS = ['asl', 'written', 'langInterp', 'wheelchair', 'visual', 'quiet', 'plain', 'pregnant'];

  var T = {
    en: {
      cardTitle: 'I need accessibility accommodations.',
      please: 'Please provide:',
      here: "I'm here for:",
      intro: function (sit, needs) { return 'I am requesting the following accommodations for my visit (' + sit + '): ' + needs + '.'; },
      pref: function (x) { return 'My preference: ' + x + '.'; },
      arrange: 'If possible, please arrange this before I arrive.',
      thanks: 'Thank you.',
      notBooking: 'This is a request, not a booking.',
      needs: {
        asl: 'ASL interpreter', written: 'Written communication (notes or text)',
        langInterp: 'Interpreter in my language', wheelchair: 'Wheelchair access',
        visual: 'Visual alerts', quiet: 'Quiet space', plain: 'Plain language',
        pregnant: 'I am pregnant: priority help or a seat'
      },
      sits: { clinic: 'Doctor / hospital', interview: 'Job interview', housing: 'Housing office', court: 'Court', transit: 'MTA / transit', airport: 'Airport' }
    },
    es: {
      cardTitle: 'Necesito adaptaciones de accesibilidad.',
      please: 'Por favor, proporcione:',
      here: 'Estoy aquí para:',
      intro: function (sit, needs) { return 'Solicito las siguientes adaptaciones para mi visita (' + sit + '): ' + needs + '.'; },
      pref: function (x) { return 'Mi preferencia: ' + x + '.'; },
      arrange: 'Si es posible, organícelo antes de mi llegada.',
      thanks: 'Gracias.',
      notBooking: 'Esto es una solicitud, no una reserva.',
      needs: {
        asl: 'Intérprete de lengua de señas (ASL)', written: 'Comunicación escrita (notas o texto)',
        langInterp: 'Intérprete en mi idioma', wheelchair: 'Acceso para silla de ruedas',
        visual: 'Alertas visuales', quiet: 'Espacio tranquilo', plain: 'Lenguaje sencillo',
        pregnant: 'Estoy embarazada: ayuda prioritaria o un asiento'
      },
      sits: { clinic: 'Médico / hospital', interview: 'Entrevista de trabajo', housing: 'Oficina de vivienda', court: 'Tribunal', transit: 'MTA / transporte', airport: 'Aeropuerto' }
    },
    zh: {
      cardTitle: '我需要无障碍协助。',
      please: '请提供：',
      here: '我来这里是为了：',
      intro: function (sit, needs) { return '我需要以下协助（' + sit + '）：' + needs + '。'; },
      pref: function (x) { return '我的偏好：' + x + '。'; },
      arrange: '如有可能，请在我到达前安排好。',
      thanks: '谢谢。',
      notBooking: '这是一份请求，不是预约。',
      needs: {
        asl: '美式手语（ASL）翻译', written: '书面沟通（便条或文字）',
        langInterp: '我的语言的口译员', wheelchair: '无障碍轮椅通道',
        visual: '视觉提示', quiet: '安静的空间', plain: '通俗易懂的语言',
        pregnant: '我怀孕了：需要优先协助或座位'
      },
      sits: { clinic: '医生 / 医院', interview: '工作面试', housing: '住房办公室', court: '法院', transit: 'MTA / 交通', airport: '机场' }
    },
    ru: {
      cardTitle: 'Мне нужна помощь с доступностью.',
      please: 'Пожалуйста, обеспечьте:',
      here: 'Я здесь по поводу:',
      intro: function (sit, needs) { return 'Прошу обеспечить следующее для моего визита (' + sit + '): ' + needs + '.'; },
      pref: function (x) { return 'Мои предпочтения: ' + x + '.'; },
      arrange: 'Если возможно, организуйте это до моего прибытия.',
      thanks: 'Спасибо.',
      notBooking: 'Это просьба, а не бронирование.',
      needs: {
        asl: 'Переводчик ASL (жестовый язык)', written: 'Письменное общение (записки или текст)',
        langInterp: 'Переводчик на мой язык', wheelchair: 'Доступ для инвалидной коляски',
        visual: 'Визуальные оповещения', quiet: 'Тихое место', plain: 'Простой язык',
        pregnant: 'Я беременна: нужна приоритетная помощь или место'
      },
      sits: { clinic: 'Врач / больница', interview: 'Собеседование', housing: 'Жилищный офис', court: 'Суд', transit: 'MTA / транспорт', airport: 'Аэропорт' }
    }
  };

  var SIT_IDS = ['clinic', 'interview', 'housing', 'court', 'transit', 'airport'];

  /* --- Safe storage: never throws, falls back to memory --- */
  var mem = {};
  function load(key, fallback) {
    try { var v = global.localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return key in mem ? mem[key] : fallback; }
  }
  function save(key, value) {
    mem[key] = value;
    try { global.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  var PROFILE_KEY = 'accesspro.profile.v1';
  function defaultProfile() {
    return { needs: [], lang: 'en', preferred: '', notes: '' };
  }
  function getProfile() {
    var p = load(PROFILE_KEY, null);
    var d = defaultProfile();
    if (!p) return d;
    return { needs: p.needs || d.needs, lang: LANGS[p.lang] ? p.lang : d.lang, preferred: p.preferred || '', notes: p.notes || '' };
  }
  function saveProfile(p) { save(PROFILE_KEY, p); }

  /* --- Language guess from what the person says or types.
     Browsers only give us text from speech, so we guess from the characters.
     This is a simple demo heuristic; the AI call is the real detector. --- */
  function detectLang(text) {
    if (!text) return null;
    if (/[一-鿿]/.test(text)) return 'zh';
    if (/[Ѐ-ӿ]/.test(text)) return 'ru';
    if (/[¿¡ñáéíóú]|\b(hola|necesito|ayuda|gracias|por favor|estoy|embarazada|intérprete|interprete)\b/i.test(text)) return 'es';
    if (/[a-z]/i.test(text)) return 'en';
    return null;
  }

  /* --- Request + access card, templated. Works offline. --- */
  function buildLocal(profile, sitId, lang) {
    var L = T[lang] || T.en;
    var needs = (profile.needs || []).filter(function (n) { return L.needs[n]; });
    var needText = needs.map(function (n) { return L.needs[n]; });
    var sit = L.sits[sitId] || sitId;
    var list = needText.length ? needText.join(', ') : '—';
    var parts = [L.intro(sit, list)];
    if (profile.preferred) parts.push(L.pref(profile.preferred));
    if (profile.notes) parts.push(profile.notes);
    parts.push(L.arrange, L.thanks);
    return {
      lang: lang,
      request: parts.join(' '),
      card: { title: L.cardTitle, pleaseLabel: L.please, needs: needText, hereLabel: L.here, situation: sit, preferred: profile.preferred || '', disclaimer: L.notBooking }
    };
  }

  /* --- Optional AI generation. Set window.ACCESSPRO_AI_URL to an endpoint that accepts
     POST {profile, situation, lang} and returns {request, card}. If it is unset or fails,
     the templated version above is used, so the demo never breaks on stage. --- */
  function generate(profile, sitId, lang) {
    var url = global.ACCESSPRO_AI_URL;
    var local = buildLocal(profile, sitId, lang);
    if (!url || typeof fetch !== 'function') return Promise.resolve(Object.assign({ source: 'template' }, local));
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: profile, situation: sitId, lang: lang }) })
      .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
      .then(function (j) {
        if (!j || !j.request || !j.card) throw new Error('bad shape');
        return { source: 'ai', lang: lang, request: j.request, card: j.card };
      })
      .catch(function () { return Object.assign({ source: 'template' }, local); });
  }

  /* --- Check-in channel. Same browser (phone/kiosk/staff in tabs) via localStorage + BroadcastChannel. --- */
  var CHECKINS_KEY = 'accesspro.checkins.v1';
  var chan = null;
  try { chan = new BroadcastChannel('accesspro'); } catch (e) { chan = null; }

  function getCheckins() { return load(CHECKINS_KEY, []); }
  function addCheckin(entry) {
    var list = getCheckins();
    entry.id = 'c' + Date.now() + Math.floor(Math.random() * 1000);
    entry.ts = Date.now();
    entry.status = 'waiting';
    list.unshift(entry);
    save(CHECKINS_KEY, list.slice(0, 50));
    if (chan) { try { chan.postMessage({ type: 'checkin', id: entry.id }); } catch (e) { /* ignore */ } }
    return entry;
  }
  function setCheckinStatus(id, status) {
    var list = getCheckins().map(function (c) { if (c.id === id) c.status = status; return c; });
    save(CHECKINS_KEY, list);
    if (chan) { try { chan.postMessage({ type: 'update', id: id }); } catch (e) { /* ignore */ } }
  }
  function onCheckinChange(fn) {
    if (chan) chan.onmessage = function () { fn(getCheckins()); };
    global.addEventListener('storage', function (e) { if (e.key === CHECKINS_KEY) fn(getCheckins()); });
  }

  /* --- Transport: use the local server when it is running (works across devices),
     otherwise fall back to this browser only. --- */
  var serverMode = null, serverInfo = {};
  function ping() {
    if (serverMode !== null) return Promise.resolve(serverMode);
    if (typeof fetch !== 'function' || !global.location || global.location.protocol === 'file:') { serverMode = false; return Promise.resolve(false); }
    return fetch('/api/ping').then(function (r) { if (!r.ok) throw new Error('no'); return r.json(); })
      .then(function (j) { serverInfo = j || {}; serverMode = true; return true; })
      .catch(function () { serverMode = false; return false; });
  }
  function serverInfoGet() { return serverInfo; }
  function listCheckins() {
    return ping().then(function (s) {
      if (!s) return getCheckins();
      return fetch('/api/checkins').then(function (r) { return r.json(); }).catch(function () { return getCheckins(); });
    });
  }
  function sendCheckin(entry) {
    return ping().then(function (s) {
      if (!s) return addCheckin(entry);
      return fetch('/api/checkins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) })
        .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
        .catch(function () { return addCheckin(entry); });
    });
  }
  function updateCheckin(id, status) {
    return ping().then(function (s) {
      if (!s) { setCheckinStatus(id, status); return; }
      return fetch('/api/checkins/' + encodeURIComponent(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: status }) })
        .catch(function () { setCheckinStatus(id, status); });
    });
  }
  function watchCheckins(fn) {
    var run = function () { listCheckins().then(fn); };
    run();
    onCheckinChange(fn);
    return setInterval(run, 2000);
  }

  /* Short staff-facing line, always English so staff can read it. */
  function staffLine(profile, sitId) {
    var L = T.en;
    var needs = (profile.needs || []).map(function (n) { return L.needs[n]; }).filter(Boolean);
    var bits = needs.slice();
    if (profile.lang && profile.lang !== 'en') bits.push('speaks ' + LANGS[profile.lang].name);
    return bits.length ? bits.join('; ') : 'Needs help (no details given)';
  }

  /* Escape for safe insertion as HTML text. */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  global.AccessPro = {
    LANGS: LANGS, NEED_IDS: NEED_IDS, SIT_IDS: SIT_IDS, T: T,
    getProfile: getProfile, saveProfile: saveProfile, detectLang: detectLang,
    buildLocal: buildLocal, generate: generate, staffLine: staffLine, esc: esc,
    getCheckins: getCheckins, addCheckin: addCheckin, setCheckinStatus: setCheckinStatus, onCheckinChange: onCheckinChange,
    ping: ping, serverInfo: serverInfoGet, listCheckins: listCheckins, sendCheckin: sendCheckin, updateCheckin: updateCheckin, watchCheckins: watchCheckins
  };
})(typeof window !== 'undefined' ? window : globalThis);
