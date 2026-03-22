const VALID_GENERIC_TLDS = new Set(
  `academy app art ai biz blog club com dev edu email expert info io me mobi name net online org page pro ru shop site space store team tech top tv website xyz xn--p1ai рф`.split(' ')
);

const VALID_COUNTRY_CODE_TLDS = new Set(
  `ac ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bm bn bo bq br bs bt bv bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm do dz ec ee eg eh er es et eu fi fj fk fm fo fr ga gb gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mf mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sj sk sl sm sn so sr ss st su sv sx sy sz tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug uk um us uy უზ uz va vc ve vg vi vn vu wf ws ye yt za zm zw`.split(' ')
);

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

const isValidDomainLabel = (label: string) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label);

export const validateEmailAddress = (value: string) => {
  const normalized = normalizeEmail(value);

  if (!normalized) {
    return { isValid: false, normalized, error: 'Введите email' };
  }

  if (normalized.length > 254) {
    return { isValid: false, normalized, error: 'Email слишком длинный' };
  }

  const parts = normalized.split('@');
  if (parts.length !== 2) {
    return { isValid: false, normalized, error: 'Введите корректный email' };
  }

  const [localPart, domain] = parts;
  if (!localPart || !domain) {
    return { isValid: false, normalized, error: 'Введите корректный email' };
  }

  if (localPart.length > 64 || /\s/.test(localPart) || localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { isValid: false, normalized, error: 'Введите корректный email' };
  }

  const domainParts = domain.split('.');
  if (domainParts.length < 2 || domainParts.some((part) => !part)) {
    return { isValid: false, normalized, error: 'Введите корректный email' };
  }

  const tld = domainParts[domainParts.length - 1];
  const hasValidTld = VALID_GENERIC_TLDS.has(tld) || VALID_COUNTRY_CODE_TLDS.has(tld);

  if (!hasValidTld) {
    return { isValid: false, normalized, error: 'Проверьте домен email — такое окончание не поддерживается' };
  }

  if (!domainParts.every((part, index) => (index === domainParts.length - 1 && part === 'рф') || isValidDomainLabel(part))) {
    return { isValid: false, normalized, error: 'Введите корректный email' };
  }

  return { isValid: true, normalized, error: '' };
};
