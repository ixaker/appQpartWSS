// telegram.js

// Объявляем переменные chatId и botToken
const chatId = "672754822";
const botToken = "5506317678:AAEst0pLX1pEIEDqTCqGZ8ZVk-DMj6nx278";

// Функция отправки сообщения (текстового или с фотографией)
function sendToTelegram(message, file = null) {
    const deployment = testEnvironment === "true" ? `Test\n` : `Production: ${version}\n`;
    message = deployment + message
    console.log('file', file)
    if (file) {
        console.log(file);
        sendPhotoToTelegram(message, file);
    } else {
        sendTextToTelegram(message);
    }
}

function sendErrorToTelegram(jqXHR, textStatus, urlData) {
    console.log(urlData)
    let errorMessage = 'Request failed\n';
    errorMessage += `Method: ${urlData.method}\n`;
    errorMessage += `URL: ${urlData.url}\n`;
    errorMessage += `Status: ${jqXHR.status}\n`;
    errorMessage += `Response Text: ${jqXHR.responseText}\n`;
    errorMessage += `Ready State: ${jqXHR.readyState}\n`;
    errorMessage += `Text Status: ${textStatus}\n`;
    errorMessage += `User: ${JSON.stringify(user, null, " ")}\n`;
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
    const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
    const formData = new FormData();
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