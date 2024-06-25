require('dotenv').config();

const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const express = require('express');

const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { exec } = require('child_process');
const url = require('url');
const axios = require('axios');

// services
const log = require('./services/loggerConfig.js');
const telegramBot = require('./services/telegramBot.js');
const faceID = require('./services/faceID.js');
const func1C = require('./services/1C.js');

exec('kill -9 $(lsof -t -i :443)');

const envFilePath = path.join(__dirname, '.env');

if (!fs.existsSync(envFilePath)) {
  const defaultEnvData = `secret=my-secret-key
  base=UTCRM_test
  API_1C_LOGIN=tele
  API_1C_PASSWORD=tele
  domian=wss.qpart.com.ua
  botToken=5963182008:AAEAaqku-cJbC6Er7GHgYtVOZuR-8QO1fps
  chatId=672754822
  version = 1.0.0`;

  fs.writeFileSync(envFilePath, defaultEnvData);
}

const secret = process.env.secret || 'my-secret-key';
const options = { expiresIn: '3h' };

const adminRoute = process.env.adminRoute || 'admin';
const domian = process.env.domian;


const test = process.env.TEST;
log.warn('test: ', test);
let version;
if (test === 'true') {
  const currentDate = new Date();
  const hours = currentDate.getHours().toString().padStart(2, '0');
  const minutes = currentDate.getMinutes().toString().padStart(2, '0');
  const seconds = currentDate.getSeconds().toString().padStart(2, '0');

  version = `${hours}${minutes}${seconds}`;
  log.info('test version: ', version);
} else {
  version = process.env.version || '1.0.0';
  log.info('production version: ', version);
}

const maxAge = 31536000;

const ssl_key = path.join("/etc/letsencrypt/live", domian, 'privkey.pem');
const ssl_cert = path.join("/etc/letsencrypt/live", domian, 'fullchain.pem');

const createPath = (page) => path.resolve(__dirname, 'views', `${page}`);

let clients = [];

// ******************************************* Web сервер *******************************************
const app = express();
app.set('view engine', 'ejs');

const httpsServer = https.createServer({ key: fs.readFileSync(ssl_key), cert: fs.readFileSync(ssl_cert) }, app);

// app.use(express.static('styles'));
// app.use(express.static('js'));
// app.use(express.static('img'));
// app.use(express.static('static'));
app.use(express.static('static', {
  setHeaders: function (res, path) {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    res.setHeader('ETag', true);
  }
}));
app.use('/foto', express.static('foto'));
app.use(cookieParser());

// + Обработчик админского обхода авторизации
app.get('/uploadPhoto', (req, res, next) => {
  log.info('get uploadPhoto');
  res.sendFile(createPath('uploadPhoto.html'));
});

// + Обработчик админского обхода авторизации
// app.get('/adminAuth', (req, res, next) => {
//   let result = { detectUser: true };
//   result.user = faceID.getUserInfoID('f9c18a95-123c-11ed-81c1-000c29006152');
//   result.token = jwt.sign(result.user, secret, options);

//   log.data('/adminAuth', result);

//   res.send(result);
// });

app.post('/saveFile', (req, res) => {
  let body = '';

  // Чтение данных из запроса
  req.on('data', chunk => {
    body += chunk.toString(); // Преобразование бинарных данных в строку
  });

  // Обработка завершения чтения данных
  req.on('end', () => {
    console.log('Received data:', body);

    // Если данные в формате JSON, можно их распарсить
    try {
      const jsonData = JSON.parse(body);
      console.log('Parsed JSON data:', jsonData);

      const base64Image = jsonData.file.split(';base64,').pop();
      const binaryData = Buffer.from(base64Image, 'base64');
      const filePath = path.join(__dirname, 'static', 'storage', 'mediaFiles', jsonData.path, jsonData.name);

      log.info('filePath', filePath);

      // Получаем путь к директории файла
      const dir = path.dirname(filePath);

      // Создаем директории, если их нет
      ensureDirectoryExistence(dir);

      fs.writeFile(filePath, binaryData, 'binary', (err) => {
        if (err) {
          log.error(err);
        } else {
          log.info(`Изображение успешно сохранено в ${filePath}`);
        }
      });
      // Отправка ответа
      res.status(200).send({ 'result': 'Data received' });
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      res.status(400).send({ 'result': 'Invalid JSON' });
    }
  });

  // Обработка ошибок чтения данных
  req.on('error', (err) => {
    console.error('Error reading request:', err);
    res.status(500).send('Internal Server Error');
  });
});

app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.json({ limit: '100mb' }));

// + Страничка - Оболочка
app.get('/', (req, res) => {
  log.info('app.get send index.html')
  // res.sendFile(createPath('index.html'));

  res.render('index', {
    version: version,
    token: '',
    test: test,
  });
});

// + Страничка - Оболочка с автоматической авторизацией
app.get('/' + adminRoute, (req, res) => {
  log.info('----------- app.get to admin part -------------');

  const user = faceID.getUserInfoID('f9c18a95-123c-11ed-81c1-000c29006152');
  const token = jwt.sign(user, secret, options);

  res.render('index', {
    version: version,
    token: token,
    test: test
  });
  // res.sendFile(createPath('admin.html'));
});





// Обработчик запросов из 1С об изменениях данных
app.post('/dataUpdated', (req, res) => {
  log.data('app.post /dataUpdated');
  res.send('NodeJS_OK');
  // log.data('body', req.body);
  // log.data('NodeJS_OK');

  // const topic = req.body.topic;
  const topic = req.body.data['Имя'];
  const uids = req.body.users;

  // log.data('/dataUpdated', req.body, req.body.users);

  // clients.forEach(client => {
  //   log.data('user', client.user);
  //   log.data('subscriptions', client.subscriptions);
  // });

  //const subscribedClients = clients.filter(c => c.subscriptions.includes(topic));

  let subscribedClients = clients.filter(function (client) {
    return client.user && client.user.uid && client.subscriptions.includes(topic) && uids.includes(client.user.uid);
  });

  let subscribedClients2 = clients.filter(function (client) {
    return client.subscriptions.includes(topic + '_all');
  });

  subscribedClients = [...subscribedClients, ...subscribedClients2];
  subscribedClients = [...new Set(subscribedClients)];

  // log.data('subscribedClients', subscribedClients.length);
  // log.data('arr ', subscribedClients);

  subscribedClients.forEach(function (client) {
    // log.data('client', Object.keys(client));
    client.socket.send(JSON.stringify(req.body));
  });

  //res.sentStatus(200);
  return;
});



app.post('/detectFace', async (req, res) => {
  let result = await faceID.findUserOnFoto(req.body);

  try {
    if (result.detectFace) {
      let message = `Similarity - ${result.similarity}, Distance - ${result.finded.distance}, Score - ${result.score}`;

      if (result.uid !== '') {
        if (result.finded.similarity > 0.72) {
          result.token = jwt.sign(result.user, secret, options);
          result.version = version;
          message += `, +++ Detected ${result.user.name} - попытка ${req.body.counter}`;
          telegramBot.sendImageAndMessage(req.body.photo, message);
        } else {

        }
      }
    }
  } catch (error) {

  }
  res.send(result);
});

// Мідлвар для перевірки авторизації
app.use((req, res, next) => {
  log.warn('app.use verify', `Request - method: ${req.method}  path: ${req.path}`);

  jwt.verify(req.cookies.token, secret, (err, user) => {
    if (err) {
      log.info('jwt.verify error');
      // res.redirect('/');
      res.status(403).send({ textError: 'jwt.verify error' });
      // res.status(404).sendFile(createPath('error.html'));

      return
    } else {
      let { iat, exp, ...userClear } = user;
      req.user = userClear;
      next();
    }
  });
});

app.use('/app', func1C.ProxyMiddleware1C);


app.use('/appPOST', async (req, res) => {
  const newTarget = new url.URL(req.path, 'http://localhost');
  newTarget.searchParams.set('uid', req.user.uid);
  const path = newTarget.toString().replace('http://localhost', '');

  log.data('path', path, req.body);
  const response = await func1C.request1C('POST', path, {}, req.body);
  console.log('appPOST', response);
  res.send(response.data);
})



// Проверка авторизации
app.post('/authentication', async (req, res) => {
  log.info('/authentication', req.user);
  let result = { detectUser: true };
  result.user = faceID.getUserInfoID(req.user.uid);
  result.token = jwt.sign(result.user, secret, options);
  result.version = version;

  res.send(result);
});

// add headers for cache
app.post('/uploadPhoto', async (req, res) => {
  log.info('post uploadPhoto', req.body);


  await func1C.request1C('POST', '/uploadPhotoNomenklatura', req.body);

  // await axios.post(`${API_1C_URL}/uploadPhotoNomenklatura`, req.body, {
  //   headers: {
  //     'Authorization': `Basic ${Buffer.from(`${API_1C_LOGIN}:${API_1C_PASSWORD}`).toString('base64')}`,
  //     'Content-Type': 'application/json'
  //   }
  // }).then((response) => {
  //   log.data('uploadPhoto response', response.data);
  // }).catch((error) => {
  //   log.error('catch uploadPhoto error', error);
  // });

  res.send("OK");
});
// *******************************************************************************************


app.post('/saveFace', async (req, res) => {
  // log.info('saveFace', req.body);

  let result = await faceID.findUserOnFoto(req.body, req.body.uid);

  res.send(result);
});

app.get('/setip', function (req, res) {
  process.env.BASE_URL = req.query.ip;
  log.info('setip', func1C.API_1C_URL);
  func1C.API_1C_URL = req.query.ip;
  func1C.setIp(req.query.ip);
  func1C.host = req.query.ip;
  func1C.initMiddleware();
  log.info('setip', func1C.API_1C_URL);
  // https://test.qpart.com.ua/setip?ip=http://10.8.0.3:23456/UTCRM_test/ru_RU/hs/app
  // https://test.qpart.com.ua/setip?ip=http://10.8.0.33:23456/UTCRM_test/ru_RU/hs/app
  res.send('ok')
});

// + Страничка - Список пользователей
app.get('/users', function (req, res) {
  let usersArray = Object.values(faceID.getUserInfo());
  res.render('users', { users: usersArray });
});

app.post('/token', function (req, res) {
  const user = faceID.getUserInfoID(req.body.user);
  const token = jwt.sign(user, secret, options);

  res.send({ token: token });
});

app.post('/deleteFaces', async (req, res) => {
  let result = {};

  try {
    faceID.deleteFotosUserAll(req.body.uid);

    result.user = faceID.getUserInfoID(req.body.uid);
  } catch (error) {
    log.error(`Failed to process message: ${error}`);
  }

  res.send(result);
});

app.get('/loadUserListFrom1C', async (req, res) => {
  let result = await func1C.GET('/getUserList');

  await faceID.updateUsersInfo(result.users);

  let usersArray = Object.values(faceID.getUserInfo());
  res.render('users', { users: usersArray });
});

app.get('/updateFaceID', async (req, res) => {
  let result = await func1C.GET('/getUserList');

  await faceID.updateFaceID(result.users);

  let usersArray = Object.values(faceID.getUserInfo());
  res.render('users', { users: usersArray });
});

app.get('/userListFoto', async function (req, res) {
  let files = faceID.getUserFotoList(req.query.UserID);
  res.send(files);
});

app.delete('/userListFoto', async function (req, res) {
  faceID.deleteUserFoto(req.body.UserID, req.body.file);
  return res.send('{"result":"OK"}');
});

// ***********************************************************************************************

app.use((req, res, next) => {
  res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
  res.setHeader('ETag', true);
  next();
});

app.get('/currentReportOperator', async function (req, res) {
  return res.render('currentReportOperator');
});

app.get('/reportsOperatorForDay', async function (req, res) {
  return res.render('reportsOperatorForDay');
});

app.get('/currentReportNaladka', async function (req, res) {
  return res.render('currentReportNaladka');
});

app.get('/currentReportOTK', async function (req, res) {
  return res.render('currentReportOTK');
});

app.get('/checkReportsOperator', async function (req, res) {
  return res.render('checkReportsOperator');
});

app.get('/settings', async function (req, res) {
  return res.render('settings');
});

app.get('/listDefect', async function (req, res) {
  return res.render('listDefect');
});

app.get('/listDefectUser', async function (req, res) {
  return res.render('listDefectUser');
});

app.get('/tabelWork', async function (req, res) {
  return res.render('tabelWork');
});

app.get('/need', async function (req, res) {
  return res.render('need');
});

app.get('/naladki', async function (req, res) {
  return res.render('naladki');
});

app.get('/12345', async function (req, res) {
  return res.render('12345');
});

app.get('/zakupka', async function (req, res) {
  return res.render('zakupka');
});

app.get('/repairList', async function (req, res) {
  return res.render('repairList');
});


// Error
app.use((req, res) => {
  log.warn('error path')
  // res.redirect('/');
  res.status(404).sendFile(createPath('error.html'));
  // res.status(404).send({ textError: 'error' })
});

app.use((err, req, res, next) => {
  res.status(500).send({ "error": "Произошла ошибка на сервере." });
});


// ******************************************* WebSocket *******************************************
const wss = new WebSocket.Server({ server: httpsServer });

wss.on('connection', (ws, request) => {
  ws.isAlive = true;
  log.info('Client connected');

  let client = {
    socket: ws,
    subscriptions: [],
    user: {}
  };

  clients.push(client);

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', async (message) => {
    //log.info('WSS Received message:', message.toString().length);
    //log.info('message str', message.toString());

    try {
      let client = clients.find(c => c.socket === ws);
      let { action, topic, payload, user } = JSON.parse(message);

      // log.data('action', action, 'topic', topic, 'payload', payload, 'user', user);

      if (action === 'subscribe') {
        client.subscriptions.push(topic);
        client.subscriptions = [...new Set(client.subscriptions)];
      } else if (action === 'unsubscribe') {
        client.subscriptions = client.subscriptions.filter(t => t !== topic);
      } else if (action === 'unsubscribeAll') {
        client.subscriptions = [];
      } else if (action === 'loaded_menu') {
        client.user = user;
      } else if (action === 'new') {
        jwt.verify(payload, secret, (err, userFromToken) => {
          if (err) {
            try {
              const decoded_token = jwt.decode(payload, secret);
              //log.info('decoded_token', decoded_token);

              if (!decoded_token) { throw new Error('Empty token'); }
              if (typeof decoded_token !== 'object') { throw new Error('Invalid token format'); }

              client.user = userFromToken;

            } catch (error) {
              log.error(error);
              ws.close();
            }
          } else {
            client.user = userFromToken;
          }
        });
      } else if (action === 'updateDataOnServer') {
        //log.info(action, topic, payload);


        const data = JSON.parse(message);
        const response = await func1C.request1C('POST', '/updateData', {}, data);

        if (response.status === 200) {
          log.data('updateData response', response.data);

          if (!response.data.result) {
            log.error("updateData error", response.data['Причина']);

            const msg = {
              topic: 'notification',
              type: 'error',           // success, error, warning, info.
              text: response.data['Причина'],
              title: ''
            }

            ws.send(JSON.stringify(msg));
          } else {
            const msg = {
              topic: 'notification',
              type: 'success',           // success, error, warning, info.
              text: 'Сохранено',
              title: ''
            }

            response.topic = 'notification'
            ws.send(JSON.stringify(msg));
          }
        } else {
          log.error("updateData error", response.data['Причина']);
        }

        // await axios.post(`${API_1C_URL}/updateData`, JSON.parse(message), {
        //   headers: {
        //     'Authorization': `Basic ${Buffer.from(`${API_1C_LOGIN}:${API_1C_PASSWORD}`).toString('base64')}`,
        //     'Content-Type': 'application/json'
        //   }
        // }).then((response) => {
        //   log.data('updateData response', response.data);

        //   if (!response.data.result) {
        //     log.error("updateData error", response.data['Причина']);

        //     const msg = {
        //       topic: 'notification',
        //       type: 'error',           // success, error, warning, info.
        //       text: response.data['Причина'],
        //       title: ''
        //     }

        //     ws.send(JSON.stringify(msg));
        //   } else {
        //     const msg = {
        //       topic: 'notification',
        //       type: 'success',           // success, error, warning, info.
        //       text: 'Сохранено',
        //       title: ''
        //     }

        //     response.topic = 'notification'
        //     ws.send(JSON.stringify(msg));
        //   }

        // }).catch((error) => {
        //   log.error('catch updateData error');
        // });
      }


    } catch (error) {
      log.error('Error wss');
    }
  });

  ws.on('close', () => {
    log.info('Client disconnected');
    clients = clients.filter(c => c.socket !== ws);
  });

  ws.on('error', (error) => {
    log.error(`WebSocket error: ${error}`);
  });
});

wss.on('error', (error) => {
  log.error(`WebSocket server error: ${error}`);
});

//********************************************* main ******************************************/

async function main() {
  await faceID.initHuman();
  func1C.init();
  // Запуск сервера
  httpsServer.listen(443, () => {
    log.info('Secure server is running on port 443');
  });
}

// Проверка соединений на "живость"
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping(null, false);
  });
}, 10000);

main();

function ensureDirectoryExistence(dirPath) {
  if (fs.existsSync(dirPath)) {
    return true;
  }
  ensureDirectoryExistence(path.dirname(dirPath));
  fs.mkdirSync(dirPath);
};