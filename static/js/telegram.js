// telegram.js

// Объявляем переменные chatId и botToken
const chatId = "672754822";
const botToken = "5506317678:AAEst0pLX1pEIEDqTCqGZ8ZVk-DMj6nx278";
const botTokenForPhoto = "5963182008:AAEAaqku-cJbC6Er7GHgYtVOZuR-8QO1fps";


// Функция отправки сообщения (текстового или с фотографией)
function sendToTelegram(message, file = null) {
    const deployment = testEnvironment === "true" ? `Test\n` : `Production: ${version}\n`;
    message = deployment + message
    if (file) {
        console.log(file);
        sendPhotoToTelegram(message, file);
    } else {
        sendTextToTelegram(message);
    }
}

function sendErrorToTelegram(jqXHR, textStatus, urlData) {
    let errorMessage = 'Request failed\n';
    errorMessage += urlData.method ? `Method: ${urlData.method}\n` : '';
    errorMessage += urlData.url ? `URL: ${urlData.url}\n` : '';
    errorMessage += jqXHR ? `Status: ${jqXHR.status}\n` : '';
    errorMessage += jqXHR ? `Ready State: ${jqXHR.readyState}\n` : '';
    errorMessage += jqXHR && jqXHR.responseText ? `Request body: ${jqXHR.responseText.slice(0, 100)}\n` : '';
    errorMessage += textStatus ? `Text Status: ${textStatus}\n` : '';
    errorMessage += user ? `User: ${JSON.stringify(user, null, " ")}\n` : '';
    console.log('errorMessage', errorMessage);
    sendToTelegram(errorMessage);
}

// Функция отправки текстового сообщения
function sendTextToTelegram(message) {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const data = {
        chat_id: chatId,
        text: message
    };

    $.ajax({
        url: url,
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: function (response) {
            console.log('Текстовое сообщение отправлено успешно:', response);
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.log('Произошла ошибка при отправке текстового сообщения:', textStatus, errorThrown);
        }
    });
}

// Функция отправки фотографии
function sendPhotoToTelegram(message, file) {
    const url = `https://api.telegram.org/bot${botTokenForPhoto}/sendPhoto`;
    const formData = new FormData();
    message = '‼️' + message;
    console.log('message', message);
    formData.append('chat_id', chatId);
    formData.append('caption', message);
    formData.append('photo', file);

    $.ajax({
        url: url,
        type: 'POST',
        data: formData,
        contentType: false,
        processData: false,
        success: function (response) {
            console.log('Фотография отправлена успешно:', response);
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.log('Произошла ошибка при отправке фотографии:', textStatus, errorThrown);
        }
    });
}