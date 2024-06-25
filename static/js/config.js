let user = {};
let subscriptions = [];
let stanok = {};
let currentMenu = '';
let auth = false;

// Глобальный объект для хранения активных запросов
var activeRequests = {};

// Функция для отмены всех активных запросов
function abortAllRequests() {
    console.log('********************** abortAllRequests *************************');

    for (var requestId in activeRequests) {
        if (activeRequests.hasOwnProperty(requestId)) {
            console.log('abort', requestId);
            activeRequests[requestId].abort();
        }
    }
    activeRequests = {}; // Очищаем объект после отмены всех запросов

    console.log('********************** abortAllRequests *************************');
}

$(function () {
    toastr.options.timeOut = 10000;
    toastr.options.positionClass = 'toast-top-left';
    NProgress.configure({ showSpinner: false });

    let timeout = 20000;
    if (testEnvironment) timeout = 70000;
    console.log('timeout', timeout);
    $.ajaxSetup({
        timeout: timeout,
        error: function (jqXHR, textStatus, errorThrown) {
            try {
                const urlData = {
                    url: this.url,
                    method: this.method || this.type
                };
                console.log('handle error in ajaxSetup')

                if (urlData.url === '/authentication') {
                    console.log('error from config authentication')
                    return;
                }

                if (textStatus === 'timeout' && jqXHR.responseText !== "Структура") {
                    toastr["error"]("Немає зв'язку з сервером 1С");
                }

                if (jqXHR.responseText === "Структура") {
                    console.error("Помилка СТРУКТУРА від 1С");
                    toastr["error"]("Помилка СТРУКТУРА від 1С");
                }

                if (jqXHR.status === 530) {
                    console.error("Помилка авторизації", jqXHR.responseText);
                    toastr["error"]("Помилка авторизації");
                    return
                }

                toastr["error"]("Помилка зв'язку");
                console.error('Error from ajax request: ', textStatus || '', errorThrown || '', jqXHR || '');
                sendErrorToTelegram(jqXHR || '', textStatus || '', urlData || '');
            } catch (error) {
                console.error('Error whith code in config.js: ', error);
            }
        }
    });

    stanok = JSON.parse($.cookie("stanok") || '{"value":"","uid":"","fullName":""}');
    $.cookie("stanok", JSON.stringify(stanok), { expires: 365 });
    $('#navbar_text_stanok').text(stanok.fullName);

    if (stanok.fullName === "") {
        $('#navbar_text_stanok').hide();
    }

    $.jMaskGlobals = {
        //maskElements: 'input,td,span,div',
        //dataMaskAttr: '*[data-mask]',
        //dataMask: true,
        //watchInterval: 300,
        //watchInputs: true,
        //watchDataMask: false,
        //byPassKeys: [9, 16, 17, 18, 36, 37, 38, 39, 40, 91],
        translation: {
            'A': { pattern: /[0-5]/ },
            '9': { pattern: /\d/, optional: true },
            'B': { pattern: /[0-2]/ }
        }
    };

    function showOverlay() {
        $('#overlay').fadeIn();
    }

    function hideOverlay() {
        $('#overlay').fadeOut();
    }
});

function GetInfo1C(url, param = '', callback, elem = false, type = 'GET') {
    $.ajax({
        type: type,
        contentType: "application/json; charset=utf-8",
        url: window.location.origin + '/app/' + url,
        data: param,
        success: function (result) {
            NProgress.done();
            const obj = JSON.parse(result);
            callback(obj);

        },
        dataType: "text",
        async: true,
        error: function (jqXHR, textStatus, errorThrown) {
            //console.log(jqXHR);

            if (jqXHR.status == 530) {
                toastr["error"](jqXHR.responseText);
            } else {
                toastr["error"](errorThrown);
            }
        }
    });
}

function setValid(elem, valid) {             // подсветка неправильно заполненых полей красным
    //console.log('setValid', valid, elem);

    if ($(elem).is(':input')) {
        if (valid) {
            $(elem).removeClass('invalid');
        } else {
            $(elem).addClass('invalid');
        }
    }
};

function setValidFast(element, valid) {             // подсветка неправильно заполненых полей красным
    //console.log('setValid', valid, elem);

    // if ($(elem).is(':input')) {
    //     if(valid){
    //         $(elem).removeClass('invalid');
    //     }else{
    //         $(elem).addClass('invalid');
    //     } 
    // }

    if (element.nodeName === 'input') {
        if (valid) {
            element.classList.remove('invalid'); // Видаляємо клас 'invalid', якщо valid === true
        } else {
            element.classList.add('invalid'); // Додаємо клас 'invalid', якщо valid === false
        }
    }
};

async function getHash(obj) {
    const msgUint8 = new TextEncoder().encode(JSON.stringify(obj));                           // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);                       // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer));                                 // convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');            // convert bytes to hex string
    return hashHex;
}

function clickAnimate(btnElement) {
    $(btnElement).addClass('clicked');

    setTimeout(() => {
        $(btnElement).removeClass('clicked');
    }, 300); // время анимации в миллисекундах
}

function clickAnimateColor(btnElement) {
    $(btnElement).addClass('clickedColor');

    setTimeout(() => {
        $(btnElement).removeClass('clickedColor');
    }, 300);
}

function convertToTime(decimalHours) {
    var hours = Math.floor(decimalHours);
    var minutes = Math.round((decimalHours - hours) * 60);

    var hoursString = (hours < 10) ? '0' + hours : hours;
    var minutesString = (minutes < 10) ? '0' + minutes : minutes;

    return hoursString + ':' + minutesString;
}

async function logToServer(msg, data = {}) {
    // $.ajax({url: '/app/log', method: 'POST', contentType: 'application/json',
    //     data: JSON.stringify({msg:msg, user:user, stanok:stanok, currentMenu:currentMenu, data:data}), 
    //     success: function(data, status) { //console.log('logToServer', status); 
    //     }
    // });
}

function initInputAutocomplete(element) {
    try {
        const url = $(element).attr('url');

        $(element).autocomplete({
            source: function (req, res) {
                const data = { term: req.term };

                $.ajax({
                    method: 'POST', url: url,
                    dataType: "json",
                    data: JSON.stringify(data),
                    contentType: 'application/json',
                    success: function (data) {
                        console.log('Отримані дані:', data);
                        res(data);
                    }
                });
            },
            select: function (event, ui) {
                $(this).attr('uid', ui.item.uid);
                console.log('ui.item.uid', ui.item.uid)
                setValid(this, true);
                $(this).blur();
                callbackFromAttr(this, 'callbackSelect', ui.item)
            },
            position: { my: "left bottom", at: "left top", collision: "flip" },

            minLength: 1
        }).on("input", function () {
            console.log('Подія input');
            $(element).attr('uid', '');
            setValid(element, false);
        }).on("blur", function () {
            if (($(element).attr('uid') || '') === '') {
                $(element).val('');
            }
        });
    } catch (error) {
        toastr["error"]('Ошибка при initInputAutocomplete');
    }
}

function initInputTimeMask(element) {
    try {
        var dataMask = $(element).attr('data-mask') || '00:A0';

        $(element).mask(dataMask, {
            selectOnFocus: true,
            clearIfNotMatch: true,
            onComplete: function (cep) {
                console.log('onComplete cep', cep);

                if (cep != '00:00') {
                    setValid(element, true);
                }
            },
            onChange: function (cep) {
                setValid(element, false);

                let parts = cep.split(':');
                let hours = parseInt('0' + parts[0]);
                let limitHourse = parseInt($(element).attr('limitHourse')) || 999;

                if (hours > limitHourse) {
                    let newCep = cep.slice(0, -1);
                    $(element).val(newCep);
                }

                console.log(cep, parts, hours);
            }
        });
    } catch (error) {
        toastr["error"]('Ошибка при initInputTimeMask');
    }
}

setInterval(() => {
    try {
        let func = window['callbackFuncSecondInterval'];
        return func();
    } catch (error) { }
}, 1000);

function requestTo1C(patch, method, payload, callback) {
    console.log('requestTo1C', patch, method, payload)

    $.ajax({
        url: `/app${patch}`,
        type: method,
        contentType: 'application/json',
        data: JSON.stringify(payload),
        success: function (response) {
            console.log('Response:', response);
            if (response.error) {
                toastr.error('Ошибка', response['Причина']);
            } else {
                toastr.success('Cохранено');

                if (typeof callback === 'function') {
                    callback(response);
                }
            }
        },
        error: function (error) {
            console.log('Error:', error);
            toastr.error('Error', error);
        },
    }).always(function () {
        NProgress.done();
        highlight = true;
    });
}

function generateFromTemplate(idTemplate, data, idParent) {
    console.log('generateFromTemplate', idTemplate, idParent, data);
    const templateHTML = $(idTemplate).html();
    const template = Handlebars.compile(templateHTML);
    const html = template(data);
    $(idParent).html(html);
}

let attachedPhotoVideo = [];
let busyCamera = false;
let allMediaFiles = [];

function startAttachPhotoVideo(btnAttach) {
    console.log('startAttachPhotoVideo', btnAttach);
    const idElementForAttach = $(btnAttach).attr('elementForAttach');
    const elementForAttach = $(`#${idElementForAttach}`);

    console.log('elementForAttach', elementForAttach);

    $('#formMainCamera').show();

    attachedPhotoVideo = [];

    $('#closeCamera').click(function () {
        $('#capturePhoto').off('click');
        $('#captureVideo').off('click');
        $('#stop-video').off('click');

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

            // stopTimer();
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
        mediaRecorder.stop();

        setTimeout(() => {
            console.log('setInterval')
            $('#captureVideo').show();
            $('#stopVideo').hide();

            $('#formMainCamera').hide();
            stopMainCamera();
        }, 1000)

    });

    startMainCamera();

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
        // Добавьте другие MIME-типы и расширения по мере необходимости
    };

    return mimeTypes[mimeType] || '';
}
