const version = new URL(self.location.href).searchParams.get('version') || '1.0.0';
const CACHE_NAME = `my-app-cache-${version}`;
const urlsToCache = [
  '/',
  '/lib/bootstrap.min.css',
  '/lib/nprogress.min.css',
  '/lib/jquery-ui.css',
  // '/lib/jquery.mobile.min.css', // закоментований, якщо не потрібен
  'https://code.jquery.com/ui/1.12.1/themes/smoothness/jquery-ui.css',
  '/lib/toastr.min.css',
  '/lib/bootstrap-icons.css',
  '/styles/mediaviewer.css',
  '/styles/slider.css',
  'https://unpkg.com/tabulator-tables@5.2.2/dist/css/tabulator.min.css',
  // JavaScript файли
  '/lib/jquery-3.6.0.min.js',
  '/lib/nprogress.min.js',
  '/lib/bootstrap.bundle.min.js',
  '/lib/jquery-ui.min.js',
  '/lib/toastr.min.js',
  '/lib/jquery.cookie.js',
  '/lib/jquery.mask.js',
  '/lib/moment.js',
  '/lib/jquery.tablesorter.min.js',
  '/lib/jquery.tablesorter.widgets.min.js',
  '/lib/handlebars.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js',
  '/lib/jquery.touchSwipe.min.js',
  '/js/listplate.js',
  '/js/telegram.js',
  '/js/mediaviewer.js',
  '/js/storage.js',
  '/js/camera.js',
  '/js/swipe.js',
  '/js/slider.js',
  'https://unpkg.com/tabulator-tables@5.2.2/dist/js/tabulator.min.js',
  '/js/sw-register.js',
].map(url => `${url}?v=${version}`); // Додаємо версію як параметр до URL

/* '/js/config.js',
'/js/wss.js',
'/js/login.js',
'/js/tables.js', */
/* '/styles/basic.css',
'/styles/tables.css', */

// Інсталяція Service Worker і кешування ресурсів
self.addEventListener('install', event => {
  self.skipWaiting(); // Активируем сразу
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

// Обробка запитів (перехоплення і відповідь з кешу)
self.addEventListener('fetch', event => {
  // Для /version всегда идём в сеть
  if (event.request.url.includes('/version')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Для остального - сначала кеш
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});

// Очищення старого кешу з перевіркою версії при оновленні Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(name => {
            if (name !== CACHE_NAME) {
              return caches.delete(name); // Чистим старые версии
            }
          })
        );
      })
      .then(() => self.clients.claim()) // Контроль над всеми вкладками
  );
});
