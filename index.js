require('dotenv').config();

const https = require('https');
const url = require('url');
const fs = require('fs');
const WebSocket = require('ws');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const { exec } = require('child_process');

// services
const log         = require('./services/loggerConfig.js');
const telegramBot = require('./services/telegramBot.js');
const faceID      = require('./services/faceID.js');

exec('kill -9 $(lsof -t -i :443)');

const envFilePath = path.join(__dirname, '.env');

if (!fs.existsSync(envFilePath)) {
  const defaultEnvData = `secret=my-secret-key
  base=UTCRM_test
  API_1C_LOGIN=tele
  API_1C_PASSWORD=tele
  domian=wss.qpart.com.ua
  botToken=5963182008:AAEAaqku-cJbC6Er7GHgYtVOZuR-8QO1fps
  chatId=672754822`;

  fs.writeFileSync(envFilePath, defaultEnvData);
}

const secret = 'my-secret-key';
const options = { expiresIn: '1h' };

const base = process.env.base;
const API_1C_URL = 'http://10.8.0.3/' + base + '/hs';
const API_1C_LOGIN = process.env.API_1C_LOGIN;
const API_1C_PASSWORD = process.env.API_1C_PASSWORD;

const adminRoute = process.env.adminRoute||'admin';
const autoAuthorizationHolub = false;
const domian = process.env.domian;

const ssl_key = path.join("/etc/letsencrypt/live", domian, 'privkey.pem');
const ssl_cert = path.join("/etc/letsencrypt/live", domian, 'fullchain.pem');

const createPath = (page) => path.resolve(__dirname, 'views', `${page}`);

let clients = [];

// ******************************************* Web сервер *******************************************
const app = express();
app.set('view engine', 'ejs');
//app.set('etag', false);

const httpsServer = https.createServer({ key: fs.readFileSync(ssl_key), cert: fs.readFileSync(ssl_cert)}, app);

app.use((req, res, next) => {
  // Если протокол запроса https, продолжаем дальше
  if (req.secure) {
    next();
  } else {
    // Если протокол запроса http, перенаправляем на https
    res.redirect('https://' + req.headers.host + req.url);
  }
});

app.use(express.static('styles'));
app.use(express.static('js'));
app.use(express.static('img'));
app.use(express.static('static'));
app.use('/foto', express.static('foto'));

app.use(cookieParser());

// Отключаем кэширование
/* app.use(function(req, res, next) {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
}); */

// + Обработчик админского обхода авторизации
app.get('/uploadPhoto', (req, res, next) => {
  log.info('get uploadPhoto');
  res.sendFile(createPath('uploadPhoto.html'));  
});



// + Обработчик админского обхода авторизации
app.get('/adminAuth', (req, res, next) => {
  let result = {detectUser: true};
  result.user = faceID.getUserInfoID('f9c18a95-123c-11ed-81c1-000c29006152');
  result.token = jwt.sign(result.user, secret, options);

  log.data('/adminAuth', result);

  res.send(result);
});

function authenticateToken(req, res, next) {
  log.info('authenticateToken', 'req', req.user);



  if (autoAuthorizationHolub) {
    req.user = faceID.userInfo['f9c18a95-123c-11ed-81c1-000c29006152'];
    next();
    return;
  } else {
    const token = req.cookies.token;
    log.data('authenticateToken', token);
    log.data('authenticateToken', req.user);
    log.data('authenticateToken', req.cookies);

    if (token == null) {
      //req.user = userInfo['f9c18a95-123c-11ed-81c1-000c29006152'];
      //next();
      //log.info('authenticateToken', 'token == null');
      return res.sendStatus(401);
    }

    jwt.verify(token, secret, (err, user) => {
      if (err) {
        //req.user = userInfo['f9c18a95-123c-11ed-81c1-000c29006152'];
        //next();
        //return;
        return res.sendStatus(403);
      }

      //log.data('authenticateToken user', user);
      
      let {iat, exp, ...userClear} = user;
      //log.data('authenticateToken user', user, userClear);
      req.user = userClear;
      next();
    });
  }
}

// Обработчик ошибок разбора JSON
app.use((err, req, res, next) => {
	if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
		console.log("Invalid JSON");  
	}
	next();
});



app.use((req, res, next) => {
  log.warn('app.use Info', `Request - method: ${req.method}  path: ${req.path}`);
  //log.data('cookies', req.cookies);

  //log.data('app.use Info', 'req.cookies.token', req.cookies.token.substring(0, 30));
  //log.data('app.use Info', 'req.cookies.token', req.cookies);

  jwt.verify(req.cookies.token, secret, (err, user) => {
    if (err) {
      //log.error('app.use Info', 'token ERROR');
    }else{
      let {iat, exp, ...userClear} = user;
      req.user = userClear;
      //log.data('app.use Info', 'user', req.user);
    }
  });

  //req.body = {};
  //log.data('app.use body', req.body);

  next();
});

// Middleware для переадресации запросов с базовой авторизацией /app
app.use('/app', (req, res, next) => {
  //log.info('/app', req.path);
  next();  
});

app.use('/app', authenticateToken, createProxyMiddleware({
  target: API_1C_URL, // здесь ваше целевое значение
  changeOrigin: true,
  onProxyReq: function (proxyReq, req, res) {
    proxyReq.setHeader('Authorization', `Basic ${Buffer.from(`${API_1C_LOGIN}:${API_1C_PASSWORD}`).toString('base64')}`);

    const newTarget = new url.URL(proxyReq.path, 'http://localhost');
    newTarget.searchParams.set('uid', req.user.uid); // добавляем новый параметр
    proxyReq.path = newTarget.toString().replace('http://localhost', '');

    log.warn('proxyReq.path', API_1C_URL, proxyReq.path);
  }
}));

app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(express.json({ limit: '10mb' }));

// + Страничка - Оболочка
app.get('/', (req, res) => {
  res.sendFile(createPath('index.html'));
});

// + Страничка - Оболочка с автоматической авторизацией
app.get('/' + adminRoute, (req, res) => {
  res.sendFile(createPath('admin.html'));
});

app.post('/uploadPhoto', async (req, res) => {
  log.info('post uploadPhoto', req.body);

  await axios.post(`${API_1C_URL}/app/uploadPhotoNomenklatura`, req.body, {
    headers: {
      'Authorization': `Basic ${Buffer.from(`${API_1C_LOGIN}:${API_1C_PASSWORD}`).toString('base64')}`,
      'Content-Type': 'application/json'
    }
  }).then((response) => {
    log.data('uploadPhoto response', response.data);
  }).catch((error) => {
    log.error('catch uploadPhoto error', error);
  });

  res.send("OK");  
});
// *******************************************************************************************

app.post('/detectFace', async (req, res) => {
  let result = await faceID.findUserOnFoto(req.body);

  try {
    if (result.detectFace) {
      let message = `Similarity - ${result.similarity}, Distance - ${result.finded.distance}, Score - ${result.score}`;

      if (result.uid !== '') {
        if (result.finded.similarity > 0.72) {
          result.token = jwt.sign(result.user, secret, options);

          message += `, +++ Detected ${result.user.name} - попытка ${req.body.counter}`;
          telegramBot.sendImageAndMessage(req.body.photo, message);
        }
      }
    } 
  } catch (error) {
      
  }
  res.send(result);
});


app.post('/saveFace', async (req, res) => {
  log.info('saveFace', req.body);
  
  let result = await faceID.findUserOnFoto(req.body, req.body.uid);

  res.send(result);
});

// Проверка авторизации
app.post('/authentication', authenticateToken, async (req, res) => {
  log.info('/authentication', req.user);
  let result = {detectUser: true};
  result.user = faceID.getUserInfoID(req.user.uid);
  result.token = jwt.sign(result.user, secret, options);

  res.send(result);
});

// + Страничка - Список пользователей
app.get('/users', authenticateToken, function(req, res) {
  let usersArray = Object.values(faceID.getUserInfo());
  res.render('users', { users: usersArray });
});

app.post('/token', authenticateToken, function(req, res) {  
  const user = faceID.getUserInfoID(req.body.user);
  const token = jwt.sign(user, secret, options);

  res.send({token:token});
});

app.post('/deleteFaces', authenticateToken, async (req, res) => {
  let result = {};

  try {
    faceID.deleteFotosUserAll(req.body.uid);

    result.user = faceID.getUserInfoID(req.body.uid);
  } catch (error) {
    log.error(`Failed to process message: ${error}`);
  }

  res.send(result);
});

app.get('/loadUserListFrom1C', authenticateToken, async (req, res) => {
  let result = await GET_1C('getUserList');  

  await faceID.updateUsersInfo(result.users);

  let usersArray = Object.values(faceID.getUserInfo());
  res.render('users', { users: usersArray });
});

app.get('/updateFaceID', authenticateToken, async (req, res) => {
  let result = await GET_1C('getUserList');  

  await faceID.updateFaceID(result.users);

  let usersArray = Object.values(faceID.getUserInfo());
  res.render('users', { users: usersArray });
});

app.get('/userListFoto', authenticateToken, async function(req, res){
  let files = faceID.getUserFotoList(req.query.UserID);
  res.send(files);
});

app.delete('/userListFoto', authenticateToken, async function(req, res){
  faceID.deleteUserFoto(req.body.UserID, req.body.file);
  return res.send('{result:"OK"}');
});

// ***********************************************************************************************

app.get('/tabel', (req, res) => {
  res.sendFile(createPath('tabel.html'));
});

// Обработчик запросов из 1С об изменениях данных
app.post('/dataUpdated', (req, res) => {
  log.data('NodeJS_OK');
  res.send('NodeJS_OK');
  //log.data('body', req.body);
  log.data('NodeJS_OK');

  const topic = req.body.topic;
  const uids = req.body.users;

  log.data('/dataUpdated', req.body.topic, req.body.users);

  //const subscribedClients = clients.filter(c => c.subscriptions.includes(topic));

  let subscribedClients = clients.filter(function(client) {
    return client.user && client.user.uid && client.subscriptions.includes(topic) && uids.includes(client.user.uid);
  });

  let subscribedClients2 = clients.filter(function(client) {
    return client.subscriptions.includes(topic + '_all');
  });

  subscribedClients = [...subscribedClients, ...subscribedClients2];
  subscribedClients = [...new Set(subscribedClients)];

  log.data('subscribedClients', subscribedClients.length);
  //log.data('arr ', subscribedClients);

  subscribedClients.forEach(function(client) {
    log.data('client', Object.keys(client));
    client.socket.send(JSON.stringify(req.body));
  });

});

app.get('/currentReportOperator', authenticateToken, async function(req, res){
  return res.render('currentReportOperator');
});

app.get('/currentReportNaladka', authenticateToken, async function(req, res){
  return res.render('currentReportNaladka');
});

app.get('/currentReportOTK', authenticateToken, async function(req, res){
  return res.render('currentReportOTK');
});

app.get('/checkReportsOperator', authenticateToken, async function(req, res){
  return res.render('checkReportsOperator');
});

app.get('/settings', authenticateToken, async function(req, res){
  return res.render('settings');
});

app.get('/listDefect', authenticateToken, async function(req, res){
  return res.render('listDefect');
});

app.get('/listDefectUser', authenticateToken, async function(req, res){
  return res.render('listDefectUser');
});

app.get('/tabelWork', authenticateToken, async function(req, res){
  return res.render('tabelWork');
});

app.get('/need', authenticateToken, async function(req, res){
  return res.render('need');
});

app.get('/naladki', authenticateToken, async function(req, res){
  return res.render('naladki');
});

app.get('/12345', authenticateToken, async function(req, res){
  return res.render('12345');
});

// Error
app.use((req, res) => {
  res.status(404).sendFile(createPath('error.html'));
});

app.use((err, req, res, next) => {
  res.status(500).send("Произошла ошибка на сервере.");
});


// ******************************************* WebSocket *******************************************
const wss = new WebSocket.Server({ server: httpsServer });

wss.on('connection', (ws, request) => {
  ws.isAlive = true;
  log.info('Client connected');

  let client = {
    socket: ws,
    subscriptions: [],
    user:{}
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

      log.data('action', action, 'topic', topic, 'payload', payload, 'user', user);

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

              if (!decoded_token) { throw new Error('Empty token');}
              if (typeof decoded_token !== 'object') { throw new Error('Invalid token format'); }

              client.user = userFromToken;
              
            } catch (error) {
              log.error(error);
              ws.close();
            }
          }else{
            client.user = userFromToken;
          }
        });
      } else if (action === 'updateDataOnServer') {
        //log.info(action, topic, payload);

        await axios.post(`${API_1C_URL}/app/updateData`, JSON.parse(message), {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${API_1C_LOGIN}:${API_1C_PASSWORD}`).toString('base64')}`,
            'Content-Type': 'application/json'
          }
        }).then((response) => {
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
          }else{
            const msg = {
              topic: 'notification',
              type: 'success',           // success, error, warning, info.
              text: 'Сохранено',
              title: ''
            }

            response.topic = 'notification'
            ws.send(JSON.stringify(msg));
          }

        }).catch((error) => {
          log.error('catch updateData error');
        });
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

async function GET_1C(path) {
  try {
    const response = await axios.get(`${API_1C_URL}/app/${path}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${API_1C_LOGIN}:${API_1C_PASSWORD}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data; // Возвращаем данные ответа
  } catch (error) {
    console.error('Ошибка при выполнении GET_1C:', error); // Логирование ошибки
    return {}; // Возвращаем пустой объект в случае ошибки
  }
}

async function main() {
  await faceID.initHuman();

  // Запуск сервера
  httpsServer.listen(443, () => {
    log.info('Secure server is running on port 443');
  });
}


// Проверка соединений на "живость"
setInterval(() => {
  let clientsForLog = clients.map(c => {
    let clientCopy = {...c};
    delete clientCopy.socket;
    return clientCopy;
  });

  wss.clients.forEach((ws) => {
    if (!ws.isAlive){
      return ws.terminate();
    } 

    ws.isAlive = false;
    ws.ping(null, false);
  });
}, 10000);


main();
