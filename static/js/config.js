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

                if (textStatus === 'abort') {
                    console.log('Request was aborted by the user');
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
                        res(data);
                    }
                });
            },
            select: function (event, ui) {
                $(this).attr('uid', ui.item.uid);
                setValid(this, true);
                $(this).blur();
                callbackFromAttr(this, 'callbackSelect', ui.item)
            },
            position: { my: "left bottom", at: "left top", collision: "flip" },

            minLength: 1
        }).on("input", function () {
            $(element).attr('uid', '');
            setValid(element, false);
        }).on("blur", function () {
            if (($(element).attr('uid') || '') === '') {
                $(element).val('');
                callbackFromAttr(this, 'callbackBlurIfNone', element)
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



function sortHandler1(selector, sortValue, defaultSortDirection, tableID) {
    $(selector).on('click', function () {
        console.log('sortHandler', this);

        const sort = $(tableID).attr('sort') || '0';
        let sortDirection = $(tableID).attr('sortDirection') || defaultSortDirection;
        if (sort === sortValue) {
            sortDirection = sortDirection === '0' ? '1' : '0';
        } else {
            sortDirection = defaultSortDirection;
        }

        $(tableID).attr('sort', sortValue);
        $(tableID).attr('sortDirection', sortDirection);

        $(tableID).trigger('sorton', [[[parseInt(sortValue), parseInt(sortDirection)]]]);
        // $(`th.${sortClass}`).click();
        $('#sortList').hide();
        $('#sortList').toggleClass('active');

    });
}

function formatSecondToStringTime(seconds) {
    const isNegative = seconds < 0;
    seconds = Math.abs(seconds);

    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const sec = Math.floor(seconds % 60);

    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(sec).padStart(2, '0');

    const formattedTime = `${days} д ${hoursStr}:${minutesStr}:${secondsStr}`;
    return isNegative ? `-${formattedTime}` : formattedTime;
}


function formattedTimeToSeconds(formattedTime) {
    const regex = /(-?)\s*(\d+) д (\d{2}):(\d{2}):(\d{2})/;
    const matches = formattedTime.match(regex);

    if (matches) {
        const isNegative = matches[1] === '-';
        const days = parseInt(matches[2], 10);
        const hours = parseInt(matches[3], 10);
        const minutes = parseInt(matches[4], 10);
        const seconds = parseInt(matches[5], 10);

        const totalSeconds = days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds;
        return isNegative ? -totalSeconds : totalSeconds;
    }

    console.error('Invalid time format:', formattedTime);
    return 0;
}

let formatter = new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

function formatDateInDateTime(date) {
    const optionsDate = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    };

    const optionsTime = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };

    const formatterDate = new Intl.DateTimeFormat('uk-UA', optionsDate);
    const formatterTime = new Intl.DateTimeFormat('uk-UA', optionsTime);

    const datePart = formatterDate.format(date);
    const timePart = formatterTime.format(date);

    return `${datePart.replace('/', '.')} ${timePart}`;
}

const getMediaFromElement = (child, index) => {
    const blob = $(child).children('.source').data('blob');
    const blobPreview = $(child).children('.preview').data('blob');

    const getFileDetails = (blob, prefix) => {
        let file = { data: blob };
        switch (blob.type) {
            case 'image/jpeg':
                file.name = `${prefix}${index}.png`;
                break;
            case 'video/mp4':
                file.name = `${prefix}${index}.mp4`;
                break;
            default:
                file.name = `${prefix}${index}.none`;
                console.log('unknown type of blob', blob.type, file.name);
        }
        return file;
    };

    return {
        file: getFileDetails(blob, ''),
        filePreview: getFileDetails(blobPreview, 'p'),
    };
};

const processMediaElements = selector => {
    let media = [];
    let names = [];

    $(selector)
        .children()
        .each((index, child) => {
            const { file, filePreview } = getMediaFromElement(child, index);

            media.push(file);
            media.push(filePreview);
            names.push(file.name);
        });

    return { media, names };
};

const getMedia = (selector) => {
    const { media } = processMediaElements(selector);
    return media;
};

const getNames = (selector) => {
    const { names } = processMediaElements(selector);
    return names;
};

const timerManager = (() => {
    const decreaseValue = value => value - 1;

    const updateElementText = (element, value) => {
        formattedValue = formatSecondToStringTime(value);
        $(element).text(formatSecondToStringTime(value));
    };

    const getElementValue = element => {
        const text = $(element).text();
        // console.log('text from getElementValue', element, text);
        // console.log('text, formattedTimeToSeconds(text)', text, formattedTimeToSeconds(text));
        return formattedTimeToSeconds(text);
    };

    const processTimer = element => {
        const currentValue = getElementValue(element);
        // console.log('currentValue', currentValue);
        const newValue = decreaseValue(currentValue);
        // console.log('newValue', newValue);

        updateElementText(element, newValue);
        // highlightTimer(element, newValue);
    };

    const highlightTimer = (element, value) => {
        // console.log('highliter ', value, 60 * 60);

        if (value <= 60 * 60) {
            $(element).css('color', 'red');
        } else {
            $(element).css('color', '');
        }
    };

    const updateTimers = (containerClass, elementClass) => {
        // console.log('updateTimers run for', containerClass, elementClass);

        $(`${containerClass} ${elementClass}`).each(function () {
            // console.log('one element updateTimers', this);

            processTimer($(this));
        });
    };

    return {
        updateTimers,
    };
})();

function isElementVisible(el) {
    var rect = el.getBoundingClientRect(),
        vWidth = window.innerWidth || document.documentElement.clientWidth,
        vHeight = window.innerHeight || document.documentElement.clientHeight,
        efp = function (x, y) { return document.elementFromPoint(x, y) };

    // Return false if it's not in the viewport
    if (rect.right < 0 || rect.bottom < 0
        || rect.left > vWidth || rect.top > vHeight)
        return false;

    // Return true if any of its four corners are visible
    return (
        el.contains(efp(rect.left, rect.top))
        || el.contains(efp(rect.right, rect.top))
        || el.contains(efp(rect.right, rect.bottom))
        || el.contains(efp(rect.left, rect.bottom))
    );
}

const isEmpty = (value) => {
    if (Array.isArray(value)) {
        return value.length === 0;
    } else if (value && typeof value === 'object') {
        return Object.keys(value).length === 0 && value.constructor === Object;
    }
    return false;
};

function getDataRow() {
    console.log('start getDataRow');
    $('#ЗаявкаНаЗакупку tr.rowData').each(function () {
        const tileText = $(this).find('.tileText').text();
        console.log('getDataRow tr tr.data', $(this), $(this).data('data'), tileText);
    });
}

function getLengthOfDataRow(place) {
    console.log(`getLengthOfDataRow ${place} length = `, $('#ЗаявкаНаЗакупку tr.rowData').length);
}

window.getDataRow = getDataRow;