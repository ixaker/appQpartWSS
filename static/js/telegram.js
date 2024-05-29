// telegram.js

// Объявляем переменные chatId и botToken
const chatId = "672754822";
const botToken = "5506317678:AAEst0pLX1pEIEDqTCqGZ8ZVk-DMj6nx278";

// Функция отправки сообщения (текстового или с фотографией)
function sendToTelegram(message, file = null) {
    const newMessage = `Повідомлення від WebApp клієнт:\n${message}`;
    if (file) {
        sendPhotoToTelegram(newMessage, file);
    } else {
        sendTextToTelegram(newMessage);
    }
}

function sendErrorToTelegram(jqXHR, textStatus, urlData) {
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