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

log.configure(options);

module.exports = log;
