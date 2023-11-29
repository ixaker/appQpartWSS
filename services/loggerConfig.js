const path = require('path');
const fs = require('fs');

// loggerConfig.js
const log = require('@vladmandic/pilogger');

const options = {
  dateFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
  ringLength: 100,
  logFile: './log/application.log',
  accessFile: './log/accesss.log',
  clientFile: './log/client.log',
  inspect: {
    showHidden: true,
    depth: 5,
    colors: true,
    showProxy: true,
    maxArrayLength: 1024,
    maxStringLength: 10240,
    breakLength: 200,
    compact: 64,
    sorted: false,
    getters: true,
  }
};


const folderName = 'log';

// Получаем путь к папке проекта
const projectDir = path.resolve(__dirname);

// Получаем полный путь к папке, которую нужно создать
const folderPath = path.join(projectDir, folderName);

// Проверяем, существует ли папка
if (!fs.existsSync(folderPath)) {
  // Если папки не существует, создаем её
  fs.mkdirSync(folderPath);

}



log.configure(options);

module.exports = log;
