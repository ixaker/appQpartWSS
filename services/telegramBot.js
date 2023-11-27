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
async function sendImageAndMessage(base64Data, messageText) {
    try {
      const base64Image = base64Data.split(';base64,').pop();
      const imageBuffer = Buffer.from(base64Image, 'base64');
      await bot.sendPhoto(chatId, imageBuffer, { caption: messageText });
    } catch (error) {
      
    }
}

module.exports = {
  sendImageAndMessage,
  sendTextMessage,
  sendImage
};


















