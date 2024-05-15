const video = document.getElementById('video');
const canvas = document.createElement('canvas');
let oldPageUID = localStorage.getItem('PageUID') || false;

let loadedDataListeners = true;

var couterRequest = 0;

function startCamera() {
    console.log("start startCamera");

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true }).then(function (stream) {
            video.srcObject = stream;

            couterRequest = 0;

            $('#btnStartVideo').hide();
            $('#video').show();

            setTimeout(function () {
                stopTimeoutCamera()
            }, 7000);

            if (loadedDataListeners) {
                video.addEventListener('loadeddata', () => {
                    loadedDataListeners = false;
                    console.log("event loadeddata");
                    uploadPhoto();
                });
            }
        })
            .catch(function (error) {
                console.error('Ошибка доступа к веб-камере: ', error);
                toastr["error"]('Ошибка доступа к веб-камере');
            });
    } else {
        console.error('Браузер не поддерживает API доступа к медиа-устройствам');
        toastr["error"]('Браузер не поддерживает API доступа к медиа-устройствам');
    }
}

function stopTimeoutCamera() {
    if ($('#video').is(':visible')) {
        $('#btnStartVideo').show();
        $('#video').hide();
        NProgress.done();
    }
}

function exit() {
    auth = false;
    disconectWebSocket();

    $.cookie("token", '');
    $('#group-navbar').hide();
    $('#login').show();
    $('#btnStartVideo').show();
    $('#video').hide();
    //$('#exit').hide();
    //$('#navbar_text').hide();
    //$('#btnBurger').hide();
    $('#content').hide();
    NProgress.done();
    $('.navbar-collapse').collapse('hide');
    $('#navbar-brand-text').text('Qpart');
}

function uploadPhoto() {
    console.log("start uploadPhoto");

    if ($('#video').is(':visible')) {
        NProgress.start();

        const context = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(function (blob) {
            const reader = new FileReader();
            reader.onloadend = function () {
                couterRequest += 1;
                $.post('/detectFace', { photo: reader.result, counter: couterRequest }, function (response) {
                    console.log('/detectFace', response);
                    console.log('response.version', response.version);

                    toastr.success(response.similarity);

                    if (response.detectUser) {
                        loadMenu(response.user, response.token, response.version);

                    }
                }, 'json').fail(function (jqXHR, textStatus, errorThrown) {
                    console.log("error - /detectFace");
                    toastr.error(textStatus);
                }).always(function () {
                    NProgress.done();


                    setTimeout(() => {
                        uploadPhoto();
                    }, 500);

                });
            }
            reader.readAsDataURL(blob);
        }, 'image/jpeg');
    }
}

function authentication() {
    console.log("--- start authentication --- ");

    $.post('/authentication', {}, function (response) {
        console.log('/authentication', response);
        loadMenu(response.user, response.token, response.version);
        makeNavbarTextMove();
        $.cookie("token", response.token);
    }, 'json').fail(function (jqXHR, textStatus, errorThrown) {
        console.log("error - /authentication");
        exit();
    });
}

$(function () {
    $('#btnStartVideo').on("click", function (event) {
        console.log("click - #btnStartVideo");
        startCamera();
    });

    $('#exit').on("click", function (event) {
        console.log("click - #exit");
        $.cookie("token", '');
        exit();
    });

    authentication();

});

function loadMenu(userInfo, token, version) {
    console.log('start loadMenu userInfo', userInfo);

    user = userInfo;
    auth = true;

    $.cookie("token", token, { expires: 36500 });

    const versionFromLocalStorage = $.cookie("version");

    if (version !== versionFromLocalStorage) {
        console.log('update version because version in cookie is not actual')
        $.cookie("version", version);
        location.reload();
    }


    $('#navbar-brand-text').text(userInfo.name + ' - ' + user.profa);

    $('#group-navbar').show();
    $('#navbar_text').text('');
    $('#login').hide();
    $('#btnStartVideo').hide();
    $('#video').hide();
    $('#content').show();

    reconectWebSocket();
    // alert('display width: ' + window.innerWidth + ', display height: ' + window.innerHeight);
    $.get('/app/getUserMenu', function (response) {
        console.log('/app/getUserMenu', response);

        console.log('getUserMenu response ---- ', response)

        $('#menu').html(response.menu);   // загружаем меню
        $('#menu').data('userInfo', userInfo);

        $('.nav-item a').each((index, element) => {
            // console.log('element old url', element);
            const newUrl = $(element).attr("url") + '?v=' + version;
            // console.log(newUrl);
            $(element).attr("url", newUrl);
            // console.log('element new url', element);
        });

        $('.nav-item a').on('click', function () {    //обработчик кликов меню
            abortAllRequests();
            $('.navbar-collapse').collapse('hide');    // скрываем меню
            PageUID = $(this).attr("uid");
            PageURL = $(this).attr("url");
            //console.log('PageURL', PageURL);

            localStorage.setItem('PageUID', PageUID);
            sendWSS('unsubscribeAll');

            $.get(PageURL, function (response) {
                $('#content').html(response);
            }).fail(function (jqXHR, textStatus, errorThrown) {
                exit();
            });
        });

        $(document).on('click', function (event) {
            if (!$(event.target).closest('.navbar-collapse').length && !$(event.target).is('.navbar-collapse')) {
                $('.navbar-collapse').collapse('hide');
            }
        });

        if (!oldPageUID) {
            $('#menu .nav-item:nth-child(1) a').click();     // кликаем по первому пункту меню
        } else {
            if ($('.nav-item a[uid="' + oldPageUID + '"]').length > 0) {
                $('.nav-item a[uid="' + oldPageUID + '"]').click();
            } else {
                $('#menu .nav-item:nth-child(1) a').click();
            }
        }
    }, 'json').fail(function (jqXHR, textStatus, errorThrown) {
        exit();
    });

}

function makeNavbarTextMove() {
    console.log('makeNavbarTextMove')
    const navbarBrand = document.querySelector(".navbar-brand");
    const navbarBrandText = document.querySelector("#navbar-brand-text");

    let navbarBrandWidth = navbarBrand.offsetWidth;
    let navbarBrandTextWidth = navbarBrandText.offsetWidth;

    console.log("Ширина блоку .navbar-brand:", navbarBrandWidth);
    console.log("Ширина блоку #navbar-brand-text:", navbarBrandTextWidth);

    function isOverflowing() {
        return navbarBrandText.scrollWidth > navbarBrandWidth;
    }

    console.log("isOverflowing", isOverflowing());

    // Перевірити наявність переповнення і застосувати анімацію

    if (isOverflowing()) {
        navbarBrandText.classList.add("text-animation");
    } else {
        navbarBrandText.classList.remove("text-animation");
    }
}