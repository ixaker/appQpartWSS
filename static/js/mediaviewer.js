function mediaviewer(element, canDelete = false, onDeleteCallback = null) {
    console.log('mediaviewer start', element)
    let $currentElement = $(element);
    const $img = $currentElement.find('.src-source');

    const srcSource = $img.attr('src-source');

    const $attachedImgs = $currentElement.closest('.attachedImgContainer').find('.attachedImg');
    let currentIndex = $attachedImgs.index($currentElement);
    let visibleImgs = $attachedImgs;

    console.log('$currentElement, $img, srcSource, $attachedImgs, currentIndex', $currentElement, $img, srcSource, $attachedImgs, currentIndex);

    const $overlay = $('<div class="media-viewer-overlay"></div>');

    const $closeBtn = $('<i class="bi bi-x-lg media-viewer-close"></i>');
    const $prevBtn = $('<i class="bi bi-chevron-left media-viewer-prev"></i>');
    const $nextBtn = $('<i class="bi bi-chevron-right media-viewer-next"></i>');
    const $delete = $('<i class="bi bi-trash media-viewer-delete"></i>');

    $overlay.append($closeBtn, $prevBtn, $nextBtn);

    if (canDelete) {
        $overlay.append($delete);
    }

    const $imageContainer = $('<div class="media-viewer-image-container"></div>');
    $overlay.append($imageContainer);

    function updateOverlayContent(src, $element) {
        console.log('updateOverlayContent', src, typeof (src));
        $currentElement = $element.closest('.attachedImg');
        $overlay.find('img, video').remove();
        $overlay.find('.play-icon').remove();

        $imageContainer.css('transform', 'scale(1)');

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
            $imageContainer.append($mediaElement);
        } else if (startWord === 'blob') {
            const newElem = $element.clone().removeClass('source');
            $overlay.append(newElem);

            console.log('nodeName', newElem.prop('tagName'));

            if (newElem.prop('tagName') === 'VIDEO') {
                newElem.attr('autoplay', '');

                const $playIcon = $('<i class="bi bi-play media-viewer-play-icon play-icon"></i>');
                $overlay.append($playIcon);
            }
        } else {
            const newElem = $element.clone().removeClass('source');
            $imageContainer.append(newElem);

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
        $overlay.find('img, video').remove();
        $overlay.find('.play-icon').remove();
        $overlay.remove();
        history.replaceState(null, '', window.location.pathname);
    }

    $closeBtn.on('click', function () {
        $(document).off('keydown');
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
        currentIndex = (currentIndex < $attachedImgs.length - 1) ? currentIndex + 1 : 0;
        const nextImg = $attachedImgs.eq(currentIndex).find('.src-source');
        const blob = nextImg.attr('src-source');
        console.log('nextBtn', nextImg, blob);
        updateOverlayContent(blob, nextImg);
    });

    const overlayElement = $overlay.get(0);
    const hammer = new Hammer(overlayElement);

    hammer.get('pinch').set({ enable: true });
    hammer.on('pinch', function (event) {
        console.log('pinch', event.scale);
        $imageContainer.css('transform', `scale(${event.scale})`);
    });

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

    $delete.on('click', function () {
        clickAnimate(this);
        const $currentFotoElement = $currentElement.find('.userFotoContent');
        console.log('$currentFotoElement, visibleImgs', $currentFotoElement, visibleImgs);

        const confirmation = confirm('Ви впевнені, що хочете видалити це фото?');
        if (!confirmation) return;

        const photoData = getPhotoData($currentFotoElement);

        if (!photoData) {
            console.error('Не вдалося отримати дані фото для видалення');
            return;
        }

        deleteUserPhoto($currentFotoElement, photoData)
            .then(() => {
                let visibleImgsArray = visibleImgs.toArray();
                visibleImgsArray = visibleImgsArray.filter((_, idx) => idx !== currentIndex);
                visibleImgs = $(visibleImgsArray);
                let newImg;
                if (visibleImgs.length > 0) {
                    currentIndex = (currentIndex >= visibleImgs.length) ? visibleImgs.length - 1 : currentIndex;
                    newImg = visibleImgs.eq(currentIndex).find('.src-source');
                    const blob = newImg.attr('src-source');
                    updateOverlayContent(blob, newImg);
                } else {
                    closeViewer();
                }
                if (typeof onDeleteCallback === 'function') {
                    onDeleteCallback(newImg);
                }
            })
            .catch(error => {
                console.error('Помилка під час видалення фото:', error);
            });
    });

    $(document).on('keydown', function (event) {
        switch (event.key) {
            case 'ArrowLeft': // Вліво
                $prevBtn.trigger('click');
                console.log('prevButton');
                break;
            case 'ArrowRight': // Вправо
                $nextBtn.trigger('click');
                break;
            case 'Escape': // ESC
                $closeBtn.trigger('click');
                break;
            case 'Delete': // Del
                if (canDelete) {
                    $delete.trigger('click');
                }
                break;
            default:
                break;
        }
    });

    history.pushState({ page: 'mediaViewer' }, '', '');
    window.addEventListener('popstate', function (event) {
        if (event.state && event.state.page === 'mediaViewer') {
            console.log('Back to media viewer');
        } else {
            closeViewer();
        }
    });


    hammer.on('panmove', function (event) {
        console.log('event.center.x', event.center.x);

    })

    function deleteUserPhoto($element, data) {
        return new Promise((resolve, reject) => {
            NProgress.start();

            universalRequest(
                '/userListFoto',
                'DELETE',
                data,
                {},
                () => {
                    $element.closest('.attachedImg').remove();  // Видаляємо фото з DOM
                    NProgress.done();
                    resolve();
                },
                error => {
                    NProgress.done();
                    reject(error);
                }
            );
        });
    }

    // Функція для отримання даних фото
    function getPhotoData($element) {
        const file = $element.attr('alt');  // або інший атрибут
        const UserID = $element.closest('.plateListItem').attr('id');

        if (!file || !UserID) return null;

        return { UserID, file };
    }


}
