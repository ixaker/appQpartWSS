$(document).ready(function () {

    const container = document.getElementById('container');
    const hammerGlobal = new Hammer(container, {
        passive: false
    });
    const edgeSwipe = new CustomEvent('edgeSwipe');

    let nextEvent = '';
    hammerGlobal.on('panstart', function (event) {
        const end = event.center.x;
        const screenWidth = window.innerWidth;
        if (end < 50 || end > (screenWidth - 50)) {
            nextEvent = 'close';
        }
        event.srcEvent.preventDefault();
        event.srcEvent.stopPropagation();
    });

    hammerGlobal.on('panend', function (event) {
        if (nextEvent === 'close') {
            window.dispatchEvent(edgeSwipe);

            event.srcEvent.preventDefault();
            event.srcEvent.stopPropagation();
            console.log('event.srcEvent', event.srcEvent);
        }
    });
})