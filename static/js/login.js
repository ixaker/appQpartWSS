const video = document.getElementById('video');
const canvas = document.createElement('canvas');
let oldPageUID = localStorage.getItem('PageUID') || false;
const hasDeviceCamera = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
console.log('hasDeviceCamera', hasDeviceCamera);


let loadedDataListeners = true;

var couterRequest = 0;

function startCamera() {
    console.log("start startCamera");
    if (hasDeviceCamera) {
        navigator.mediaDevices.getUserMedia({ video: true }).then(function (stream) {
            video.srcObject = stream;

            $('#ovalMask').css('display', 'flex');

            couterRequest = 0;

            $('#btnStartVideo').hide();
            $('#login').hide();
            $('#video').show();

            // setTimeout(function () {
            //     stopTimeoutCamera()
            // }, 7000);

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
                toastr.error('Ошибка доступа к веб-камере');
            });
    } else {
        console.error('Браузер не поддерживает API доступа к медиа-устройствам');
        toastr.error('Браузер не поддерживает API доступа к медиа-устройствам');
    }
}

function stopTimeoutCamera() {
    if ($('#video').is(':visible')) {
        $('#btnStartVideo').show();
        $('#video').hide();
        $('#ovalMask').hide();
        NProgress.done();
    }
}

function exit() {
    auth = false;
    disconectWebSocket();

    $('#menu').html('');
    $.cookie("token", '');
    $('#group-navbar').hide();
    $('#login').show();
    $('#btnStartVideo').show();
    $('#video').hide();
    $('#formZakupka').hide();
    //$('#exit').hide();
    //$('#navbar_text').hide();
    //$('#btnBurger').hide();
    $('#content').html('');
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
                console.log('couterRequest', couterRequest);
                $.post('/detectFace', { photo: reader.result, counter: couterRequest }, function (response) {
                    console.log('/detectFace', response);
                    if (response.detectFace) {
                        toastr.success(`${response.similarity * 100}%`);
                    } else {
                        toastr.error("0%");
                    }

                    if (response.detectUser) {
                        loadMenu(response.user, response.token, response.version);
                        return;
                    }
                }, 'json').fail(function (jqXHR, textStatus, errorThrown) {


                }).always(function () {
                    NProgress.done();
                    if (couterRequest < 8) {
                        setTimeout(() => {
                            uploadPhoto();
                        }, 500);
                    } else {
                        console.log("error - /detectFace");
                        toastr.error("Обличчя не розпізнано");
                        let file = null;
                        try {
                            file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
                            console.log('file', file);
                        } catch (error) {
                            console.error('Помилка при створенні файлу:', error);

                        }
                        sendToTelegram('Обличчя не розпізнано', file)
                        stopTimeoutCamera();
                        exit();
                    }
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
        $.cookie("token", response.token, { expires: 365 });
    }, 'json').fail(function (jqXHR, textStatus, errorThrown) {
        console.log("error - '/authentication'");
        exit();
    });
}

$(function () {
    $('#btnStartVideo').on("click", function (event) {
        console.log("click - #btnStartVideo");
        clickAnimate(this);
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
    console.log('auth = ', auth);
    // if (auth === true) { userInfo.isAdmin = true }
    user = userInfo;
    auth = true;

    if (!WebSocketConnected) {
        connectWebSocket();
    }

    $.cookie("token", token, { expires: 36500 });

    const versionFromLocalStorage = $.cookie("version");

    if (version !== versionFromLocalStorage) {
        console.log('update version because version in cookie is not actual')
        $.cookie("version", version);
        location.reload(true);
    }


    $('#navbar-brand-text').text(userInfo.name + ' - ' + user.profa);

    $('#group-navbar').show();
    $('#navbar_text').text('');
    $('#login').hide();
    $('#btnStartVideo').hide();
    $('#video').hide();
    $('#ovalMask').hide();

    $('#content').show();

    //reconectWebSocket();
    // alert('display width: ' + window.innerWidth + ', display height: ' + window.innerHeight);
    $.ajax({
        url: '/app/getUserMenu',
        method: 'GET',
        success: function (response) {
            $('#menu').html(response.menu);
            $('#menu').data('userInfo', userInfo);
            $('#menu').data('response', response);
            $('#menu').data('userRight', response.userRights || {});
            // $('#menu').data('notifications', response.notifications || []);

            // const testNotifications = [
            //     {
            //         id: 1,
            //         active: true,
            //         text: "Вітаємо! Ваш акаунт успішно створено."
            //     },
            //     {
            //         id: 2,
            //         active: false,
            //         text: "Увага: Ваше підключення до сервера нестабільне."
            //     },
            //     {
            //         id: 3,
            //         active: true,
            //         text: "Нове повідомлення від адміністратора: Будь ласка, оновіть ваш профіль."
            //     },
            //     {
            //         id: 4,
            //         active: true,
            //         text: "Важливо: Зміни у політиці конфіденційності."
            //     },
            //     {
            //         id: 5,
            //         active: false,
            //         text: "Нагадування: Перевірте вашу електронну пошту для підтвердження."
            //     }
            // ];

            // $('#menu').data('notifications', testNotifications || []);

            handleNotification();

            $('.nav-item a').each((index, element) => {
                // console.log('element old url', element);
                const newUrl = $(element).attr("url") + '?v=' + version;
                // console.log(newUrl);
                $(element).attr("url", newUrl);
                // console.log('element new url', element);
            });

            $('.nav-item a').on('click', function () {
                abortAllRequests();
                $('.navbar-collapse').collapse('hide');
                PageUID = $(this).attr("uid");
                PageURL = $(this).attr("url");


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
        },
        // error: function (jqXHR, textStatus, errorThrown) {
        // const urlData = {
        //     url: this.url,
        //     method: this.method
        // };
        // if (textStatus === 'timeout') {
        //     console.error('Request timed out');
        //     toastr.error("Немає зв'язку з сервером 1С");
        //     sendErrorToTelegram(jqXHR, textStatus, urlData)
        //     exit();
        // } else {
        //     console.error('Error: ' + textStatus, errorThrown);
        // }
        // },
    });

    // $.get('/app/getUserMenu', function (response) {
    //     console.log('/app/getUserMenu', response);

    //     console.log('getUserMenu response ---- ', response)

    //     $('#menu').html(response.menu);   // загружаем меню
    //     $('#menu').data('userInfo', userInfo);

    //     $('.nav-item a').each((index, element) => {
    //         // console.log('element old url', element);
    //         const newUrl = $(element).attr("url") + '?v=' + version;
    //         // console.log(newUrl);
    //         $(element).attr("url", newUrl);
    //         // console.log('element new url', element);
    //     });

    //     $('.nav-item a').on('click', function () {    //обработчик кликов меню
    //         abortAllRequests();
    //         $('.navbar-collapse').collapse('hide');    // скрываем меню
    //         PageUID = $(this).attr("uid");
    //         PageURL = $(this).attr("url");
    //         //console.log('PageURL', PageURL);

    //         localStorage.setItem('PageUID', PageUID);
    //         sendWSS('unsubscribeAll');

    //         $.get(PageURL, function (response) {
    //             $('#content').html(response);
    //         }).fail(function (jqXHR, textStatus, errorThrown) {
    //             exit();
    //         });
    //     });

    //     $(document).on('click', function (event) {
    //         if (!$(event.target).closest('.navbar-collapse').length && !$(event.target).is('.navbar-collapse')) {
    //             $('.navbar-collapse').collapse('hide');
    //         }
    //     });

    //     if (!oldPageUID) {
    //         $('#menu .nav-item:nth-child(1) a').click();     // кликаем по первому пункту меню
    //     } else {
    //         if ($('.nav-item a[uid="' + oldPageUID + '"]').length > 0) {
    //             $('.nav-item a[uid="' + oldPageUID + '"]').click();
    //         } else {
    //             $('#menu .nav-item:nth-child(1) a').click();
    //         }
    //     }
    // }, 'json').fail(function (jqXHR, textStatus, errorThrown) {
    //     exit();
    // });

}

function makeNavbarTextMove() {
    console.log('makeNavbarTextMove')
    const navbarBrand = document.querySelector(".navbar-brand");
    const navbarBrandText = document.querySelector("#navbar-brand-text");

    let navbarBrandWidth = navbarBrand.offsetWidth;
    let navbarBrandHeight = navbarBrand.offsetHeight;
    let navbarBrandTextWidth = navbarBrandText.offsetWidth;

    function isOverflowing() {
        return navbarBrandText.scrollWidth > navbarBrandWidth;
    }

    if (isOverflowing()) {
        navbarBrandText.classList.add("text-animation");
    } else {
        navbarBrandText.classList.remove("text-animation");
    }
}

function handleNotification() {
    const notifications = $('#menu').data('notifications');

    if (notifications && notifications.length > 0) {
        let currentNotificationIndex = 0;

        function showNextNotification() {
            if (currentNotificationIndex < notifications.length) {
                const notification = notifications[currentNotificationIndex];

                if (notification.active) {
                    showNotification(notification.text, function () {
                        currentNotificationIndex++;
                        showNextNotification();
                    });
                } else {
                    currentNotificationIndex++;
                    showNextNotification();
                }
            }
        }

        showNextNotification();
    }
}

function showNotification(text, callback) {
    console.log('notification text', text);
    const notificationModal = $('#notificationModal');
    const notificationText = $('#notificationText');
    const okButton = $('#okButton');

    notificationText.text(text);
    notificationModal.show();

    okButton.off('click');

    okButton.on('click', function () {
        notificationModal.hide();
        if (callback) {
            callback();
        }
    });
}


