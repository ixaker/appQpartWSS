if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/js/service-worker.js', { scope: '/' }).then(function (registration) {
            console.log('Service Worker registered with scope: ', registration.scope);
        }, function (err) {
            console.log('Service Worker registration failed: ', err);
        });
    });
} else {
    console.log('Sevice worker none in navigator');
}
