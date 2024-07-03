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
    const templateHTML = $(idTemplate).html();
    const template = Handlebars.compile(templateHTML);
    const html = template(data);
    $(idParent).html(html);
}


// example of usage function
// universalRequest(
//     '/app/someEndpoint', // URL
//     'POST',              // Метод
//     { key: 'value' },    // Тело запроса
//     { param1: 'value1', param2: 'value2' }, // Параметры
//     function onSuccess(response) {
//         console.log('Success callback:', response);
//     },
//     function onError(error) {
//         console.log('Error callback:', error);
//     },
//     function onComplete() {
//         console.log('Request completed');
//     }
// );

function universalRequest(url, method = 'GET', payload = {}, params = {}, onSuccess, onError, onComplete) {
    console.log('universalRequest', url, method, payload, params);

    let queryString = '';
    if (params && typeof params === 'object') {
        queryString = '?' + $.param(params);
    }

    try {
        $.ajax({
            url: url + queryString,
            type: method,
            contentType: 'application/json',
            data: JSON.stringify(payload),
            success: function (response) {
                try {
                    if (typeof onSuccess === 'function') { onSuccess(response); }
                } catch (callbackError) {
                    console.error('Callback Error:', callbackError);
                    if (typeof onError === 'function') { onError(callbackError); }
                }
            },
            error: function (error) {
                try {
                    if (typeof onError === 'function') { onError(error); }
                } catch (callbackError) {
                    console.error('Callback Error:', callbackError);
                    if (typeof onError === 'function') { onError(callbackError); }
                }
            },
        }).always(function () {
            try {
                if (typeof onComplete === 'function') { onComplete(); }
            } catch (callbackError) {
                console.error('Callback Error:', callbackError);
                if (typeof onError === 'function') { onError(callbackError); }
            }
        });
    } catch (ajaxError) {
        console.error('AJAX Error:', ajaxError);
        if (typeof onError === 'function') { onError(ajaxError); }
    }
}
