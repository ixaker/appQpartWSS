// if ('serviceWorker' in navigator) {
//     window.addEventListener('load', function () {
//         navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).then(function (registration) {
//             console.log('Service Worker registered with scope: ', registration.scope);
//         }, function (err) {
//             console.log('Service Worker registration failed: ', err);
//         });
//     });
// } else {
//     console.log('Sevice worker none in navigator');
// }

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async function () {
    try {
      // Получаем актуальную версию с сервера
      const versionResponse = await fetch('/version', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const { version } = await versionResponse.json();

      // Регистрируем Service Worker с версией
      const registration = await navigator.serviceWorker.register(`/service-worker.js?version=${version}`, {
        scope: '/',
      });

      console.log('SW registered, version:', version);

      // Принудительное обновление при новой версии
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            console.log('New SW activated. Reloading...');
            window.location.reload(); // Перезагрузка страницы
          }
        });
      });
    } catch (err) {
      console.error('SW registration failed:', err);
    }
  });
}
