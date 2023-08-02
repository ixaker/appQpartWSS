let user = {};
let subscriptions = [];
let stanok = {};
let currentMenu = '';
let auth = false;


$(function() { 
    toastr.options.timeOut = 2000;
    toastr.options.positionClass = 'toast-top-left';
    NProgress.configure({ showSpinner: false });

    stanok = JSON.parse($.cookie("stanok")||'{"value":"","uid":"","fullName":""}');
    $.cookie("stanok", JSON.stringify(stanok), { expires: 365 });
    $('#navbar_text_stanok').text(stanok.fullName);

    if (stanok.fullName === "") {
        $('#navbar_text_stanok').hide();
    }
});

function GetInfo1C(url, param = '', callback, elem=false, type='GET') { 
    console.log('start GetInfo1C', url, param, type);

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
        async:true,
        error: function( jqXHR , textStatus, errorThrown ){ 
            console.log(jqXHR);

            if(jqXHR.status == 530){ 
                toastr["error"](jqXHR.responseText); 
            }else{
                toastr["error"](errorThrown);
            }
        }
    });
}

function setValid(elem, valid){             // подсветка неправильно заполненых полей красным
    console.log('setValid', valid, elem);

    if ($(elem).is(':input')) {
        if(valid){
            $(elem).removeClass('invalid');
        }else{
            $(elem).addClass('invalid');
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

function convertToTime(decimalHours) {
    var hours = Math.floor(decimalHours);
    var minutes = Math.round((decimalHours - hours) * 60);
  
    var hoursString = (hours < 10) ? '0' + hours : hours;
    var minutesString = (minutes < 10) ? '0' + minutes : minutes;
  
    return hoursString + ':' + minutesString;
}

async function logToServer(msg, data = {}) {
    $.ajax({url: '/app/log', method: 'POST', contentType: 'application/json',
        data: JSON.stringify({msg:msg, user:user, stanok:stanok, currentMenu:currentMenu, data:data}), 
        success: function(data, status) { console.log('logToServer', status); }
    });
}