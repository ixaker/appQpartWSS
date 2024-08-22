const TelegramBot = require('node-telegram-bot-api');

const botToken = process.env.botToken; // токен Telegram бота
const chatId = process.env.chatId;
const bot = new TelegramBot(botToken);

// Функция для отправки только текстового сообщения
async function sendTextMessage(messageText) {
  await bot.sendMessage(chatId, messageText);
}

// Функция для отправки только изображения
async function sendImage(base64Data) {
  try {
    const base64Image = base64Data.split(';base64,').pop();
    const imageBuffer = Buffer.from(base64Image, 'base64');
    await bot.sendPhoto(chatId, imageBuffer);
  } catch (error) {

  }
}

// Функция для отправки изображения и текста
async function sendImageAndMessage(base64Data, messageText, base64Data2 = null) {
  console.log('sendImageAndMessage')
  try {
    const base64Image = base64Data.split(';base64,').pop();
    const imageBuffer = Buffer.from(base64Image, 'base64');
    console.log('begin sendImageAndMessage ---------- ')


    let mediaGroup = [
      { type: 'photo', media: imageBuffer, caption: messageText }
    ];

    if (base64Data2) {
      const base64Image2 = base64Data2.split(';base64,').pop();
      const imageBuffer2 = Buffer.from(base64Image2, 'base64');

      mediaGroup.push({
        type: 'photo',
        media: imageBuffer2
      });
    }

    console.log('before sendMediaGroup')
    const response = await bot.sendMediaGroup(chatId, mediaGroup);
    console.log('sendImageAndMessage Message sent successfully:', response);
  } catch (error) {
    console.log('sendImageAndMessage error', error);
  }
}

function isBase64(str) {
  return str.startsWith('data:image/') && str.includes(';base64,');
}

function base64ToBuffer(base64Data) {
  const base64Image = base64Data.split(';base64,').pop();
  return Buffer.from(base64Image, 'base64');
}

async function sendImageAndMessageUrl(data1, messageText, data2 = null) {
  console.log('sendImageAndMessage');

  try {
    let media1;
    if (isBase64(data1)) {
      media1 = base64ToBuffer(data1);
    } else {
      media1 = data1;
    }

    let mediaGroup = [
      { type: 'photo', media: media1, caption: messageText }
    ];

    if (data2) {
      let media2;
      if (isBase64(data2)) {
        media2 = base64ToBuffer(data2);
      } else {
        media2 = data2;
      }

      mediaGroup.push({
        type: 'photo',
        media: media2
      });
    }

    console.log('before sendMediaGroup');
    const response = await bot.sendMediaGroup(chatId, mediaGroup);
    console.log('sendImageAndMessageUrl Message sent successfully:', response);
  } catch (error) {
    console.log('sendImageAndMessageUrl error', error);
  }
}



module.exports = {
  sendImageAndMessageUrl,
  sendImageAndMessage,
  sendTextMessage,
  sendImage
};


















