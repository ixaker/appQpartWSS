function mediaviewer(element) {
    console.log('mediaviewer start')
    const $currentElement = $(element);
    const $img = $currentElement.find('.src-source');
    console.log('$img', $img);
    const srcSource = $img.attr('src-source');
    const $attachedImgs = $('.attachedImg');
    let currentIndex = $attachedImgs.index($currentElement);

    const styles = `
        .media-viewer-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }
        .media-viewer-overlay img,
        .media-viewer-overlay video {
            width: 100%;
        }
        .media-viewer-close,
        .media-viewer-prev,
        .media-viewer-next {
            position: fixed;
            top: 50%;
            font-size: xxx-large;
            color: darkgreen;
            cursor: pointer;
            z-index: 10000;
            background-color: lightgrey;
            opacity: 0.8;
            border-radius: 50%;
            width: 70px;
            height: 70px;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .media-viewer-close {
            top: 10px;
            right: 20px;
            transform: none;
        }
        .media-viewer-prev {
            left: 20px;
        }
        .media-viewer-next {
            right: 20px;
        }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    const $overlay = $('<div class="media-viewer-overlay"></div>');

    const $closeBtn = $('<i class="bi bi-x-lg media-viewer-close"></i>');
    const $prevBtn = $('<i class="bi bi-chevron-left media-viewer-prev"></i>');
    const $nextBtn = $('<i class="bi bi-chevron-right media-viewer-next"></i>');

    $overlay.append($closeBtn, $prevBtn, $nextBtn);

    function updateOverlayContent(src, $element) {
        console.log('updateOverlayContent', src, typeof (src));
        $overlay.find('img, video').remove();

        const startWord = src.slice(0, 4);
        console.log('startWord', startWord);

        let elementName = 'img';

        if (startWord === 'http') {
            if (src.match(/\.(mp4|webm|ogg)$/) != null) {
                elementName = 'video';
            }

            $overlay.append(`<${elementName} src="${src}">`);

        } else if (startWord === 'blob') {
            const newElem = $element.clone().removeClass('source');
            $overlay.append(newElem);

            console.log('nodeName', newElem.prop('tagName'));

            if (newElem.prop('tagName') === 'VIDEO') {
                newElem.attr('autoplay', '');
            }
        }
    }

    updateOverlayContent(srcSource, $img);

    $('body').append($overlay);

    $closeBtn.on('click', function () {
        clickAnimate(this);
        $overlay.remove();
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
    // const hammer = new Hammer(overlayElement);

    // hammer.on('swipeleft', function () {
    //     clickAnimate(overlayElement);
    //     console.log('swipe left');

    //     currentIndex = (currentIndex < $attachedImgs.length - 1) ? currentIndex + 1 : 0;
    //     const nextImg = $attachedImgs.eq(currentIndex).find('.src-source');
    //     const blob = nextImg.attr('src-source');
    //     console.log('nextBtn', nextImg, blob);
    //     updateOverlayContent(blob, nextImg);
    // });

    // hammer.on('swiperight', function () {
    //     clickAnimate(overlayElement);
    //     console.log('swipe right');
    //     console.log(this);
    //     currentIndex = (currentIndex > 0) ? currentIndex - 1 : $attachedImgs.length - 1;
    //     const prevImg = $attachedImgs.eq(currentIndex).find('.src-source');
    //     const blob = prevImg.attr('src-source');
    //     console.log('nextBtn', prevImg, blob);
    //     updateOverlayContent(blob, prevImg);
    // });

    // let nextEvent = '';
    // hammer.on('panstart', function (event) {
    //     console.log('event.center.x', event.center.x);
    //     const end = event.center.x;
    //     const screenWidth = window.innerWidth;
    //     console.log('panstart screenWidth', screenWidth);
    //     if (end < 50 || end > (screenWidth - 50)) {
    //         console.log('overlay close');
    //         nextEvent = 'close';
    //     }
    // })

    // hammer.on('panend', function (event) {
    //     if (nextEvent === 'close') $overlay.remove();
    // })

}
