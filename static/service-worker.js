const CACHE_NAME = 'my-app-cache-v13';
const urlsToCache = [
    '/',
    '/lib/bootstrap.min.css',
    '/lib/nprogress.min.css',
    '/lib/jquery-ui.css',
    // '/lib/jquery.mobile.min.css', // закоментований, якщо не потрібен
    'https://code.jquery.com/ui/1.12.1/themes/smoothness/jquery-ui.css',
    '/lib/toastr.min.css',
    '/lib/bootstrap-icons.css',
    '/styles/basic.css',
    '/styles/tables.css',
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
    '/js/config.js',
    '/js/wss.js',
    '/js/login.js',
    '/js/tables.js',
    '/js/listplate.js',
    '/js/telegram.js',
    '/js/mediaviewer.js',
    '/js/storage.js',
    '/js/camera.js',
    '/js/swipe.js',
    '/js/slider.js',
    'https://unpkg.com/tabulator-tables@5.2.2/dist/js/tabulator.min.js',
    '/js/sw-register.js',
];


// Інсталяція Service Worker і кешування ресурсів
self.addEventListener('install', (event) => {
    console.log('Service Worker installed')
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

// Обробка запитів (перехоплення і відповідь з кешу)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// Очищення старого кешу при оновленні Service Worker
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
