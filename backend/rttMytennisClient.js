const axios = require('axios');

const API_ORIGIN = 'https://apirtt.mytennis.online';
const WEB_ORIGIN = 'https://rtt.mytennis.online';

/**
 * HTTP-клиент личного кабинета РТТ (apirtt.mytennis.online).
 * Авторизация через cookie после POST /api/v1/auth/login (multipart).
 */
class RttMytennisClient {
  constructor() {
    this.timeout = Number(process.env.RTT_MYTENNIS_TIMEOUT_MS || 20000);
    this.cookies = new Map();
    this.sessionReady = false;
    this.loginPromise = null;
  }

  nextRuid() {
    return String(Date.now());
  }

  storeSetCookie(headers) {
    const setCookie = headers?.['set-cookie'];
    if (!setCookie) return;

    const list = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const raw of list) {
      const part = String(raw).split(';')[0];
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const name = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (name) this.cookies.set(name, value);
    }
  }

  cookieHeader() {
    if (!this.cookies.size) return {};
    const value = [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    return { Cookie: value };
  }

  buildForm(fields = {}) {
    const form = new FormData();
    for (const [key, raw] of Object.entries(fields)) {
      if (raw === undefined || raw === null) continue;
      if (Array.isArray(raw)) {
        raw.forEach((item, index) => form.append(`${key}[${index}]`, String(item)));
      } else {
        form.append(key, String(raw));
      }
    }
    return form;
  }

  async post(endpoint, fields = {}, options = {}) {
    const url = `${API_ORIGIN}/api/v1/${endpoint.replace(/^\//, '')}`;
    const form = this.buildForm({ ...fields, ruid: fields.ruid || this.nextRuid() });
    const timeout = Number(options.timeout) > 0 ? Number(options.timeout) : this.timeout;

    const response = await axios.post(url, form, {
      timeout,
      headers: {
        Origin: WEB_ORIGIN,
        Referer: `${WEB_ORIGIN}/`,
        ...this.cookieHeader()
      },
      validateStatus: (status) => status >= 200 && status < 500
    });

    this.storeSetCookie(response.headers);

    const body = response.data;
    if (!body || typeof body !== 'object') {
      throw new Error('Пустой ответ API РТТ');
    }

    if (body.status === 'error') {
      const err = new Error(body.desc || body.code || 'Ошибка API РТТ');
      err.code = body.code;
      err.apiResponse = body;
      throw err;
    }

    return body.data || {};
  }

  async login() {
    const user = String(process.env.RTT_MYTENNIS_USER || process.env.RTT_MYTENNIS_LOGIN || '').trim();
    const password = String(process.env.RTT_MYTENNIS_PASSWORD || '').trim();

    if (!user || !password) {
      const hasKeys = 'RTT_MYTENNIS_USER' in process.env || 'RTT_MYTENNIS_PASSWORD' in process.env;
      throw new Error(
        hasKeys
          ? 'RTT_MYTENNIS_USER или RTT_MYTENNIS_PASSWORD пустые в backend/.env — сохраните файл и перезапустите сервер'
          : 'Не заданы RTT_MYTENNIS_USER и RTT_MYTENNIS_PASSWORD в backend/.env'
      );
    }

    const data = await this.post('auth/login', {
      seed: '',
      u: user,
      p: password,
      r: 1
    });

    if (data?.state !== '/auth/complete') {
      throw new Error('Не удалось авторизоваться в РТТ');
    }

    this.sessionReady = true;
    return true;
  }

  async ensureSession(force = false) {
    if (force) {
      this.sessionReady = false;
      this.cookies.clear();
    }

    if (this.sessionReady && this.cookies.size) {
      return;
    }

    if (!this.loginPromise) {
      this.loginPromise = this.login()
        .catch((error) => {
          this.sessionReady = false;
          throw error;
        })
        .finally(() => {
          this.loginPromise = null;
        });
    }

    await this.loginPromise;
  }

  async callPublic(fields = {}, options = {}) {
    const retry = options.retry !== false;
    try {
      await this.ensureSession();
      return await this.post('public', fields, options);
    } catch (error) {
      const authError = String(error.code || '').includes('/auth/');
      if (retry && authError) {
        await this.ensureSession(true);
        return this.callPublic(fields, { ...options, retry: false });
      }
      throw error;
    }
  }

  async callEntry(fields = {}, options = {}) {
    const retry = options.retry !== false;
    try {
      await this.ensureSession();
      return await this.post('entry', fields, options);
    } catch (error) {
      const authError = String(error.code || '').includes('/auth/');
      if (retry && authError) {
        await this.ensureSession(true);
        return this.callEntry(fields, { ...options, retry: false });
      }
      throw error;
    }
  }

  /** Прогрев cookie-сессии при старте сервера (не блокирует запросы при ошибке). */
  warmup() {
    return this.ensureSession().catch((error) => {
      console.warn('RTT session warmup failed:', error.message);
    });
  }

  async callMethods(endpoint, methods, fields = {}) {
    const payload = { ...fields };
    methods.forEach((method, index) => {
      payload[`method[${index}]`] = method;
    });
    return endpoint === 'entry' ? this.callEntry(payload) : this.callPublic(payload);
  }

  async ping() {
    await this.callPublic({ 'method[0]': 'time' });
    return true;
  }
}

module.exports = new RttMytennisClient();
module.exports.RttMytennisClient = RttMytennisClient;
module.exports.API_ORIGIN = API_ORIGIN;
module.exports.WEB_ORIGIN = WEB_ORIGIN;
