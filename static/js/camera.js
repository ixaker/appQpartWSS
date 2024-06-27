let attachedPhotoVideo = [];
let busyCamera = false;
let allMediaFiles = [];

function startAttachPhotoVideo(btnAttach) {
    console.log('startAttachPhotoVideo', btnAttach);
    const idElementForAttach = $(btnAttach).attr('elementForAttach');
    const elementForAttach = $(`#${idElementForAttach}`);

    console.log('elementForAttach', elementForAttach);
    document.body.style.overflow = "hidden";
    $('#formMainCamera').show();

    attachedPhotoVideo = [];

    $('#closeCamera').click(function () {
        $('#capturePhoto').off('click');
        $('#captureVideo').off('click');
        $('#stop-video').off('click');
        document.body.style.overflow = "";

        clickAnimate(this);
        $('#formMainCamera').hide();
        stopMainCamera();
    });

    $('#capturePhoto').click(function () {
        console.log('capture photo');
        if (busyCamera) {
            return;
        }

        busyCamera = true;
        const video = document.getElementById('mainCamera');
        const canvas = document.createElement('canvas');
        const flash = document.getElementById('flash');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
            const dataUrl = URL.createObjectURL(blob);

            const attachedImg = $('<div>')
            attachedImg.addClass('attachedImg');

            const img = $('<img>');
            img.attr('src', dataUrl).addClass('source').addClass("src-source");
            img.attr('src-source', dataUrl);
            img.appendTo(attachedImg);
            img.data('blob', blob);

            const btn = $('<i class="bi bi-trash deleteBtn" onclick="deleteMeParent(this)"></i>');
            btn.addClass('attachedImgBtn');
            btn.appendTo(attachedImg);

            const preview = getPreview(attachedImg);
            attachedImg.appendTo(`#${idElementForAttach}`);
        }, 'image/jpeg')

        flash.classList.add('flash-effect');
        setTimeout(() => {
            flash.classList.remove('flash-effect');
            busyCamera = false;
        }, 200);
    });

    $('#captureVideo').click(function () {
        const video = document.getElementById('mainCamera');
        mediaRecorder = new MediaRecorder(video.srcObject);
        chunks = [];

        $('#captureVideo').hide();
        $('#stopVideo').show();
        $('#videoTimer').text('00:00').show();

        let startTime = Date.now();
        timerInterval = setInterval(function () {
            let elapsedTime = Date.now() - startTime;
            let seconds = Math.floor((elapsedTime / 1000) % 60);
            let minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);
            let formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            $('#videoTimer').text(formattedTime);
        }, 1000);

        mediaRecorder.ondataavailable = function (e) {
            chunks.push(e.data);
        };

        mediaRecorder.onstop = function () {
            clearInterval(timerInterval);
            $('#videoTimer').hide().text('00:00');

            const blob = new Blob(chunks, { type: 'video/mp4' });
            const videoUrl = URL.createObjectURL(blob);
            console.log('allMediaFiles', allMediaFiles);

            const attachedImg = $('<div>')
            attachedImg.addClass('attachedImg');

            const video = $('<video controls="" controlsList="nodownload noremoteplayback nofullscreen" class="src-source">').attr({
                src: videoUrl,
            }).addClass('source');
            video.data('blob', blob);
            video.attr('src-source', videoUrl);

            video.appendTo(attachedImg);

            const btn = $('<i class="bi bi-trash deleteBtn" onclick="deleteMeParent(this)"></i>');
            btn.addClass('attachedImgBtn');
            btn.appendTo(attachedImg);

            video.on('loadeddata', function () {
                getPreview(attachedImg);
            });

            attachedImg.appendTo(`#${idElementForAttach}`);
            console.log(attachedImg, videoUrl);
        };

        $('#stop-video').click(function () {
            mediaRecorder.stop();
            $('#captureVideo').show();
            $('#stopVideo').hide();
        });

        mediaRecorder.start();
    });

    $('#stopVideo').click(function () {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();

            setTimeout(() => {
                console.log('setInterval')
                $('#captureVideo').show();
                $('#stopVideo').hide();

                $('#formMainCamera').hide();
                stopMainCamera();
            }, 1000)
        } else {
            console.warn('MediaRecorder is already inactive');
        }
    });

    startMainCamera(function (data) {
        console.log('Callback startMainCamera:', data);
    });
}

async function startMainCamera(callback) {
    navigator.mediaDevices
        .getUserMedia({
            video: {
                facingMode: { exact: 'environment' },
            },
            audio: false,
        })
        .then(function (mediaStream) {
            stream = mediaStream;
            const video = document.getElementById('mainCamera');
            video.srcObject = stream;
            var playPromise = video.play();
        })
        .catch(function (error) {
            console.error('Error accessing media devices.', error);
        });
}

function stopMainCamera() {
    const video = document.getElementById('mainCamera');
    video.pause();
    video.srcObject = null;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}

function deleteMeParent(deleteBtn) {
    clickAnimate(deleteBtn);
    console.log('deleteMeParent', deleteBtn);
    $(deleteBtn).parent().remove();
}

$('.attachedImg2').on('click', function () {
    console.log('click attachedImg2');
    $('.attachedImg2').addClass('fullScreenVideo')
})

function getPreview(parentElement) {
    console.log('getPreview');
    const video = document.getElementById('mainCamera');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Установите размер canvas для превью изображения
    const previewWidth = 103; // Ширина превью
    const previewHeight = 135; // Высота превью

    canvas.width = previewWidth;
    canvas.height = previewHeight;

    // Нарисуйте текущий кадр видео на canvas с изменением размера
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, previewWidth, previewHeight);
    canvas.toBlob(blob => {
        const dataUrl = URL.createObjectURL(blob);
        const img = $('<img>');
        img.attr('src', dataUrl).addClass('preview');
        img.data('blob', blob);
        img.appendTo(parentElement);
    }, 'image/jpeg');
}

function getExtensionFromMimeType(mimeType) {
    const mimeTypes = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
        'video/webm': 'webm',
        'video/mp4': 'mp4',
        'image/gif': 'gif'
    };

    return mimeTypes[mimeType] || '';
}