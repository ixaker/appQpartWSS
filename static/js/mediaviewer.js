function mediaviewer(element) {
    console.log('mediaviewer start')
    const $currentElement = $(element);
    const $img = $currentElement.find('.src-source');
    console.log('$img', $img);
    const srcSource = $img.attr('src-source');
    const $attachedImgs = $('.attachedImg');
    let currentIndex = $attachedImgs.index($currentElement);

    const $overlay = $('<div class="media-viewer-overlay"></div>');

    const $closeBtn = $('<i class="bi bi-x-lg media-viewer-close"></i>');
    const $prevBtn = $('<i class="bi bi-chevron-left media-viewer-prev"></i>');
    const $nextBtn = $('<i class="bi bi-chevron-right media-viewer-next"></i>');

    $overlay.append($closeBtn, $prevBtn, $nextBtn);

    function updateOverlayContent(src, $element) {
        console.log('updateOverlayContent', src, typeof (src));
        $overlay.find('img, video').remove();
        $overlay.find('.play-icon').remove();


        const startWord = src.slice(0, 4);
        console.log('startWord', startWord);

        let elementName = 'img';

        if (startWord === 'http') {
            if (src.match(/\.(mp4|webm|ogg)$/) != null) {
                elementName = 'video';
            }

            const $mediaElement = $(`<${elementName} src="${src}"></${elementName}>`);
            if (elementName === 'video') {
                console.log('element is video');

                // Add play icon
                const $playIcon = $('<i class="bi bi-play media-viewer-play-icon play-icon"></i>');
                $overlay.append($playIcon);

                // Play/pause video on clicking video element
                $mediaElement.on('click', function () {
                    console.log('click on video');
                    if (this.paused) {
                        this.play();
                    } else {
                        this.pause();
                    }
                });

                // Play/pause video on clicking play icon
                $playIcon.on('click', function () {
                    console.log('click on play icon');
                    clickAnimate(this);
                    if ($mediaElement[0].paused) {
                        $mediaElement[0].play();
                    } else {
                        $mediaElement[0].pause();
                    }
                });

                $mediaElement.on('play', function () {
                    console.log('video started playing');
                    $playIcon.removeClass('bi-play').addClass('bi-pause');
                });

                $mediaElement.on('pause', function () {
                    console.log('video paused');
                    $playIcon.removeClass('bi-pause').addClass('bi-play');
                });

                // Add play icon after video has loaded
                $mediaElement.on('loadeddata', function () {
                    // Play icon already appended
                });
            }
            $overlay.append($mediaElement);
        } else if (startWord === 'blob') {
            const newElem = $element.clone().removeClass('source');
            $overlay.append(newElem);

            console.log('nodeName', newElem.prop('tagName'));

            if (newElem.prop('tagName') === 'VIDEO') {
                newElem.attr('autoplay', '');

                const $playIcon = $('<i class="bi bi-play media-viewer-play-icon play-icon"></i>');
                $overlay.append($playIcon);
            }
        }
    }

    updateOverlayContent(srcSource, $img);

    $('body').append($overlay);

    function closeViewer() {
        $overlay.remove();
        history.replaceState(null, '', window.location.pathname);
    }

    $closeBtn.on('click', function () {
        clickAnimate(this);
        closeViewer();
    });

    $prevBtn.on('click', function () {
        clickAnimate(this);
        console.log('prevButton', this);
        currentIndex = (currentIndex > 0) ? currentIndex - 1 : $attachedImgs.length - 1;
        const prevImg = $attachedImgs.eq(currentIndex).find('.src-source');
        const blob = prevImg.attr('src-source');
        console.log('nextBtn', prevImg, blob);
        updateOverlayContent(blob, prevImg);
    });

    $nextBtn.on('click', function () {
        clickAnimate(this);
        console.log('nextButton');
        currentIndex = (currentIndex < $attachedImgs.length - 1) ? currentIndex + 1 : 0;
        const nextImg = $attachedImgs.eq(currentIndex).find('.src-source');
        const blob = nextImg.attr('src-source');
        console.log('nextBtn', nextImg, blob);
        updateOverlayContent(blob, nextImg);
    });

    const overlayElement = $overlay.get(0);
    const hammer = new Hammer(overlayElement);

    hammer.on('swipeleft', function () {
        clickAnimate(overlayElement);
        console.log('swipe left');

        currentIndex = (currentIndex < $attachedImgs.length - 1) ? currentIndex + 1 : 0;
        const nextImg = $attachedImgs.eq(currentIndex).find('.src-source');
        const blob = nextImg.attr('src-source');
        console.log('nextBtn', nextImg, blob);
        updateOverlayContent(blob, nextImg);
    });

    hammer.on('swiperight', function () {
        clickAnimate(overlayElement);
        console.log('swipe right');
        console.log(this);
        currentIndex = (currentIndex > 0) ? currentIndex - 1 : $attachedImgs.length - 1;
        const prevImg = $attachedImgs.eq(currentIndex).find('.src-source');
        const blob = prevImg.attr('src-source');
        console.log('nextBtn', prevImg, blob);
        updateOverlayContent(blob, prevImg);
    });

    history.pushState({ page: 'mediaViewer' }, '', '');
    window.addEventListener('popstate', function (event) {
        if (event.state && event.state.page === 'mediaViewer') {
            console.log('Back to media viewer');
        } else {
            closeViewer();
        }
    });

    // let nextEvent = '';
    hammer.on('panmove', function (event) {
        console.log('event.center.x', event.center.x);
        //     const end = event.center.x;
        //     const screenWidth = window.innerWidth;
        //     console.log('panstart screenWidth', screenWidth);
        //     if (end < 50 || end > (screenWidth - 50)) {
        //         console.log('overlay close');
        //         nextEvent = 'close';
        //     }
    })

    // hammer.on('panend', function (event) {
    //     if (nextEvent === 'close') $overlay.remove();
    // })

}
