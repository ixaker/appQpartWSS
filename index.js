require('dotenv').config();

const http = require('http');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const express = require('express');
const proxy = require('express-http-proxy');

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
const { updateAvatar } = require('./services/updateAvatar.js');

const base = process.env.base;

// exec('kill -9 $(lsof -t -i :443)');

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
const options = { expiresIn: '1w' };

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
  // log.info('production version: ', version);
}

const renderParams = {
  version: version,
  token: '',
  test: test,
};

const maxAge = 31536000;

// const ssl_key = path.join("/etc/letsencrypt/live", domian, 'privkey.pem');
// const ssl_cert = path.join("/etc/letsencrypt/live", domian, 'fullchain.pem');
// const ssl_key = path.join("/etc/letsencrypt/live", domian + '-0001', 'privkey.pem');
// const ssl_cert = path.join("/etc/letsencrypt/live", domian + '-0001', 'fullchain.pem');

const createPath = page => path.resolve(__dirname, 'views', `${page}`);

let clients = [];

// ******************************************* Web сервер *******************************************
const app = express();
app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));

const httpServer = http.createServer(app);
// const httpsServer = https.createServer({ key: fs.readFileSync(ssl_key), cert: fs.readFileSync(ssl_cert) }, app);

app.use((req, res, next) => {
  // log.info(`Запит на бекенд прийшов: ${req.method} ${req.url}`);
  next();
});

app.post('/getUserByEmpCode', (req, res) => {
  log.info('getUserByEmpCode', req.query.empCode);
  try {
    const empCode = req.query.empCode;
    const user = faceID.getUserInfoByEmpCode(empCode);
    res.send(user);
  } catch (error) {
    res.status(500);
  }
});

// app.use((req, res, next) => {
//   if (req.secure) {
//     return next();
//   }
//   res.redirect('https://' + req.headers.host + req.url);
// });

// app.use(express.static('styles'));
// app.use(express.static('js'));
// app.use(express.static('img'));
app.use('/foto', express.static('foto'));
app.use('/storage', express.static(path.join(__dirname, 'static/storage/mediaFiles')));
app.use(
  express.static('static', {
    setHeaders: function (res, path) {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      res.setHeader('ETag', true);
    },
  })
);

// Прокси для всех запросов к /auth_files/photo/*
app.use(
  '/auth_files/photo/*',
  proxy('http://10.8.0.4', {
    proxyReqPathResolver: req => {
      return req.originalUrl;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      userRes.setHeader('Content-Type', 'image/jpeg');

      const maxAge = 60 * 60 * 24 * 30;
      userRes.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      userRes.setHeader('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
      userRes.setHeader('ETag', true);

      userRes.removeHeader('pragma');

      return proxyResData;
    },
  })
);

app.use(
  '/auth_files/*',
  proxy('http://10.8.0.4', {
    proxyReqPathResolver: req => {
      return req.originalUrl;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      userRes.setHeader('Content-Type', 'image/jpeg');

      const maxAge = 60 * 60 * 24 * 30;
      userRes.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      userRes.setHeader('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
      userRes.setHeader('ETag', true);

      userRes.removeHeader('pragma');

      return proxyResData;
    },
  })
);

app.use(cookieParser());

app.get('/uploadPhoto', (req, res, next) => {
  // log.info('get uploadPhoto');
  res.sendFile(createPath('uploadPhoto.html'));
});

app.get('/version', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.json({ version: process.env.version });
});

function ensureDirectoryExistence(dirPath) {
  if (fs.existsSync(dirPath)) {
    return true;
  }
  ensureDirectoryExistence(path.dirname(dirPath));
  fs.mkdirSync(dirPath);
}

app.post('/saveFile', (req, res) => {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    console.log('Received data:');

    try {
      const jsonData = JSON.parse(body);
      const base64Image = jsonData.file.split(';base64,').pop();
      const binaryData = Buffer.from(base64Image, 'base64');
      const filePath = path.join(__dirname, 'static', 'storage', 'mediaFiles', jsonData.path, jsonData.name);

      // log.info('filePath', filePath);

      const dir = path.dirname(filePath);

      ensureDirectoryExistence(dir);

      fs.writeFile(filePath, binaryData, 'binary', err => {
        if (err) {
          log.error(err);
          res.status(400).send({ result: 'error write file to storage' + jsonData.name });
        } else {
          log.info(`Изображение успешно сохранено в ${filePath}`);
          res.status(200).send({ result: 'Data received' });
        }
      });
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      res.status(400).send({ result: 'Invalid JSON' });
    }
  });

  // Обработка ошибок чтения данных
  req.on('error', err => {
    console.error('Error reading request:', err);
    res.status(500).send('Internal Server Error');
  });
});

app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.json({ limit: '100mb' }));

// + Страничка - Оболочка с автоматической авторизацией
app.get('/' + adminRoute, (req, res) => {
  log.info('----------- app.get to admin part -------------');

  const user = faceID.getUserInfoID('f9c18a95-123c-11ed-81c1-000c29006152');
  const token = jwt.sign(user, secret, options);

  res.cookie('token', token);

  res.render('index', {
    version: version,
    token: token,
    test: test,
  });
  // res.sendFile(createPath('admin.html'));
});

// + Страничка - Оболочка
app.get('/', (req, res) => {
  // log.info('app.get send index.html');
  // res.sendFile(createPath('index.html'));

  res.render('index', {
    version: version,
    token: '',
    test: test,
  });
});

app.post('/userUpdated', (req, res) => {
  // log.info('userUpdate', req.body);
  const data = req.body;
  faceID.updateUser(data);
  res.send('all ok');

  notifyClient(data);

  return;
});

function notifyClient(user) {
  log.info('notifyClient user', user);
  let subscribedClients = clients.filter(function (client) {
    return client.subscriptions.includes('users_all');
  });
  subscribedClients.forEach(function (client) {
    log.data('client', Object.keys(client));
    client.socket.send(JSON.stringify(user));
  });
}

// Обработчик запросов из 1С об изменениях данных
app.post('/dataUpdated', (req, res) => {
  log.data('app.post /dataUpdated');
  res.send('NodeJS_OK');
  // log.data('body', req.body);
  // log.data('NodeJS_OK');

  // const topic = req.body.topic;
  const topic = req.body.data['Имя'];
  const uids = req.body.users;

  // log.data('/dataUpdated', req.body.data['Имя'], req.body.users, topic);

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

app.post('/authorizationByPassword', async (req, res) => {
  try {
    // log.info('authorizationByPassword req.body', req.body);
    const { username, password } = req.body;
    const baseUrl = process.env.BASE_URL.replace(/^http?:\/\//, '');
    const Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    authHeaders = {
      Authorization: Authorization,
    };

    const url = `http://${baseUrl}/${base}/hs/client/authentication`;
    // const url = `http://${username}:${password}@ http://Holub:1@10.8.0.3:23456/UTCRM_test/hs/client/authentication/${base}/hs/client/authentication`

    // log.info('url before axios');

    const response = await axios({
      method: 'GET',
      url: url,
      headers: authHeaders,
    });

    // log.info('url', url, response.status);

    if (response.status === 200) {
      let result = { detectUser: true };
      result.user = faceID.getUserInfoID(response.data.uid);

      if (result.user === undefined) {
        res.status(500).send('Користувача не знайдено в локальной базі бекенду.');
      }
      result.token = jwt.sign(result.user, secret, options);

      const expiresIn = 365 * 24 * 60 * 60 * 1000;
      const expiresDate = new Date(Date.now() + expiresIn);

      res.cookie('token', result.token, {
        expires: expiresDate,
      });

      const decodedToken = jwt.decode(result.token);
      // log.info(`authorizationByPassword Token will expire at: ${new Date(decodedToken.exp * 1000).toISOString()}`);

      result.version = version;
      res.send(result);
    } else {
      res.status(res.status).send('Помилка сервера. Спробуйте пізніше.', res.status);
    }
  } catch (error) {
    // log.error('Помилка під час обробки запиту:', error);
    if (error.response) {
      log.error('Server response error:', error.response.status, error.response.data);
      res.status(error.response.status).send(error.response.data);
    } else {
      log.error('Error in request setup:', error.message, error);
      res.status(500).send({
        message: 'Внутрішня помилка сервера.',
        error,
      });
    }
  }
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
          const origin = test ? 'Тестова база' : 'Робоча база';
          message += `, +++ Detected ${result.user.name} - попытка ${req.body.counter}, Оригінальне фото: ${result.originalPhotoName}. ${origin}`;
          telegramBot.sendImageAndMessage(req.body.photo, message, result.originalPhoto);
        } else {
        }
      }
    }
  } catch (error) {}
  res.send(result);
});

// Мідлвар для перевірки авторизації
app.use((req, res, next) => {
  log.warn('app.use verify', `Request - method: ${req.method}  path: ${req.path}`);
  // log.info('req.cookies.token');

  if (!req.cookies.token) {
    log.warn('Token is missing');
    return res.status(403).send({ textError: 'Token is missing' });
  }

  const decodedToken = jwt.decode(req.cookies.token);
  if (decodedToken && decodedToken.exp) {
    const expirationTime = new Date(decodedToken.exp * 1000).toISOString();
    // log.info(`verify token Token expiration time: ${expirationTime}`);
  } else {
    log.warn('verify token Unable to decode token or missing expiration time');
  }

  jwt.verify(req.cookies.token, secret, (err, user) => {
    if (err) {
      log.info('jwt.verify error');
      res.status(403).send({ textError: 'jwt.verify error' });
      return;
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

  // log.data('path', path, req.body);
  const response = await func1C.request1C('POST', path, {}, req.body);
  // console.log('appPOST', response);
  res.send(response.data);
});

// Проверка авторизации
app.post('/authentication', async (req, res) => {
  log.info('/authentication');
  let result = { detectUser: true };
  result.user = faceID.getUserInfoID(req.user.uid);
  result.token = jwt.sign(result.user, secret, options);
  result.version = version;

  res.send(result);
});

// add headers for cache
app.post('/uploadPhoto', async (req, res) => {
  // log.info('post uploadPhoto', req.body);

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

  res.send('OK');
});
// *******************************************************************************************

app.post('/saveFace', async (req, res) => {
  // log.info('saveFace', req.body);

  let result = await faceID.findUserOnFoto(req.body, req.body.uid);

  res.send(result);
});

app.post('/savePhotoOnly', async (req, res) => {
  log.info('savePhotoOnly');
  let result = await faceID.savePhotoOnly(req.body, req.body.uid);

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
  res.send('ok');
});

app.get('/reportMaster', function (req, res) {
  res.render('reportMaster/reportMaster', renderParams, function (err, html) {
    if (err) {
      log.error('Render error:', err);
      res.status(500).send('Server Error');
    } else {
      res.send(html);
    }
  });
});

app.get('/machines', function (req, res) {
  log.info('machines start');

  res.render('machines', renderParams, function (err, html) {
    if (err) {
      log.error('Render error:', err);
      res.status(500).send('Server Error');
    } else {
      res.send(html);
    }
  });
});

// + Страничка - Список пользователей
app.get('/users', function (req, res) {
  log.info('users start');
  let usersArray = Object.values(faceID.getUserInfo());

  res.render('users', renderParams, function (err, html) {
    if (err) {
      log.error('Render error:', err);
      res.status(500).send('Server Error');
    } else {
      res.send(html);
    }
  });
});

app.get('/user/api', function (req, res) {
  log.info('/user/api');
  let usersArray = Object.values(faceID.getUserInfo());
  res.json({ list: usersArray });
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

app.post('/updateAvatar', async (req, res) => {
  log.info('updataAvatar index.js uid');
  try {
    if (!req.body.photo) {
      log.error('there is no file');
      return res.status(400).send({ error: 'No file uploaded' });
    }

    const file = req.body.photo;
    const uid = req.body.uid;
    const empCode = req.body.empCode;
    log.info('updateAvatar from index.js file, uid', file.toString('base64').slice(0, 50), uid, empCode);

    const updateAvatarResult = await updateAvatar(file, empCode);

    if (!updateAvatarResult || updateAvatarResult.error) {
      log.error('Error updating avatar:', updateAvatarResult.error || 'Unknown error');
      return res.status(500).json({ error: 'Error updating avatar' });
    }

    const photoUrl = `auth_files/biophoto/${empCode}.jpg`;
    const photoBioTimeResponse = await axios.get(photoUrl, { responseType: 'arraybuffer' });
    const photoBioTime = Buffer.from(photoBioTimeResponse.data, 'binary');
    const base64Image = photoBioTime.toString('base64');

    const body = {
      photo: base64Image,
    };
    const addUserPhotoResult = await faceID.findUserOnFoto(body, uid);
    log.info('addUserPhotoResult', addUserPhotoResult);

    const addedPhotoUrl = addUserPhotoResult.photoPath;
    const addedPhotoUrlResponse = await axios.get(addedPhotoUrl, { responseType: 'arraybuffer' });
    const addedPhotoBinary = Buffer.from(addedPhotoUrlResponse.data, 'binary');
    const addedPhoto = addedPhotoBinary.toString('base64');
    const origin = test ? 'Тестова база' : 'Робоча база';
    const userName = addUserPhotoResult.forUser.name || '';
    const similarity = addUserPhotoResult.similarity || '';
    const pathToPhoto = addUserPhotoResult.photoPath;
    let message = `${origin}. Додано фото користувача ${userName}, similarity: ${similarity}.`;
    log.info('message for telegram', message);
    // telegramBot.sendImageAndMessage(base64Image, message, addedPhoto);
    const imgUrl = `https://test.qpart.com.ua/${addedPhotoUrl}`;
    log.info('imgUrl for telegram', imgUrl);
    telegramBot.sendImageAndMessageUrl(file, message, imgUrl);

    if (addUserPhotoResult && addUserPhotoResult.user) {
      try {
        notifyClient(addUserPhotoResult.user);
      } catch (userUpdateError) {
        log.error('Error in notifyClient:', userUpdateError.message);
      }
    } else {
      log.warn('No user found in findUserResult', addUserPhotoResult);
    }

    res.status(200).json({
      message: 'Avatar updated successfully',
      data: {
        updateResult: updateAvatarResult,
        addUserPhotoResult,
      },
    });
  } catch (error) {
    log.error(`Error: ${error.message}`);
    res.status(500).json({ error: error.message || 'Помилка при завантаженні аватара' });
  }
});

app.post('/checkPhoto', async (req, res) => {
  try {
    let result = await faceID.checkPhoto(req.body);
    res.status(200).json({ result });
  } catch (err) {
    console.error('Error processing photo:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/loadUserListFrom1C', async (req, res) => {
  log.info('lr');
  let result = await func1C.GET('/getUserList');

  log.info('result.users', result.users);
  if (result.error) {
    log.error('Error Причина', result.Причина);
  }

  await faceID.updateUsersInfo(result.users);

  let usersArray = Object.values(faceID.getUserInfo());
  log.info('loadUserListFrom1C');
  log.info(usersArray);
  // res.render('users', { users: usersArray });
});

app.get('/updateFaceID', async (req, res) => {
  let result = await func1C.GET('/getUserList');
  log.info('updateFaceID', result);

  await faceID.updateFaceID(result.users);

  let usersArray = Object.values(faceID.getUserInfo());
  // res.render('users', { users: usersArray });
});

app.get('/userListFoto', async function (req, res) {
  let files = faceID.getUserFotoList(req.query.UserID);
  res.json(files);
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
  res.render('zakupka', renderParams);
});

app.get('/shipmentDEMZ', async function (req, res) {
  res.render('shipmentDEMZ', renderParams);
});

app.get('/repairList', async function (req, res) {
  res.render('repairList', renderParams);
});

app.get('/tabel', async function (req, res) {
  res.render('tabel', renderParams);
});

app.get('/QPART_DEMZ', async function (req, res) {
  res.render('QPART_DEMZ', renderParams);
});

app.get('/QPART_DEMZ_OLD', async function (req, res) {
  res.render('QPART_DEMZ_OLD', renderParams);
});

app.get('/ratingOperators', async function (req, res) {
  res.render('ratingOperators', renderParams);
});

// Error
app.use((req, res) => {
  log.warn('error path');
  // res.redirect('/');
  res.status(404).sendFile(createPath('error.html'));
  // res.status(404).send({ textError: 'error' })
});

app.use((err, req, res, next) => {
  res.status(500).send({ error: 'Произошла ошибка на сервере.' });
});

// ******************************************* WebSocket *******************************************
const wss = new WebSocket.Server({ server: httpServer });

wss.on('connection', (ws, request) => {
  ws.isAlive = true;
  // log.info('Client connected');

  let client = {
    socket: ws,
    subscriptions: [],
    user: {},
  };

  clients.push(client);

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', async message => {
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
              log.info('decoded_token', decoded_token);

              if (!decoded_token) {
                throw new Error('Empty token');
              }
              if (typeof decoded_token !== 'object') {
                throw new Error('Invalid token format');
              }

              client.user = userFromToken;
            } catch (error) {
              // log.error(error);
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
          // log.data('updateData response', response.data);

          if (!response.data.result) {
            // log.error("updateData error", response.data['Причина']);

            const msg = {
              topic: 'notification',
              type: 'error', // success, error, warning, info.
              text: response.data['Причина'],
              title: '',
            };

            ws.send(JSON.stringify(msg));
          } else {
            const msg = {
              topic: 'notification',
              type: 'success', // success, error, warning, info.
              text: 'Сохранено',
              title: '',
            };

            response.topic = 'notification';
            ws.send(JSON.stringify(msg));
          }
        } else {
          // log.error("updateData error", response.data['Причина']);
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
    // log.info('Client disconnected');
    clients = clients.filter(c => c.socket !== ws);
  });

  ws.on('error', error => {
    log.error(`WebSocket error: ${error}`);
  });
});

wss.on('error', error => {
  log.error(`WebSocket server error: ${error}`);
});

//********************************************* main ******************************************/
async function main() {
  await faceID.initHuman();
  func1C.init();
  // httpsServer.listen(443, () => {
  //   log.info('Secure server is running on port 443');
  // });
  httpServer.listen(5000, () => {
    // log.info(`HTTP сервер запущений на порту 80`);
  });
}

// Проверка соединений на "живость"
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) {
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping(null, false);
  });
}, 10000);

main();
