const CACHE_NAME = 'nakorte-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/favicon.ico',
  '/manifest.json',
  '/news/',
  '/pro/',
];

// Установка — кэшируем статику
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Активация — удаляем старый кэш
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // API запросы — только сеть, никогда не кэшируем
  if (request.url.includes('/api/')) {
    return;
  }

  // Навигационные запросы — отдаём index.html из кэша если нет сети
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Только GET — кэшируем; POST/PUT/DELETE — только сеть
  if (request.method !== 'GET') {
    return;
  }

  // Внешние ресурсы (CDN, fonts) — только сеть, не кэшируем
  const url = new URL(request.url);
  if (!url.origin.includes('localhost') && !url.origin.includes('onthecourt.ru')) {
    return;
  }

  // Остальное — network first, fallback cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
