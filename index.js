const https = require('https');
const http = require('http');
const url = require('url');
const fs = require('fs');
const WebSocket = require('ws');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const Human = require('@vladmandic/human');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const log = require('./loggerConfig');
const { exec } = require('child_process');
const envFilePath = path.join(__dirname, '.env');
const sharp = require('sharp');

exec('kill -9 $(lsof -t -i :443)');

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


require('dotenv').config();

const botToken = process.env.botToken; // токен Telegram бота
const chatId = process.env.chatId;

const secret = 'my-secret-key';
const options = { expiresIn: '1h' };

//const base = 'UTCRM_test';
const base = process.env.base;
const API_1C_URL = 'http://10.8.0.3/' + base + '/hs';
const API_1C_LOGIN = process.env.API_1C_LOGIN;
const API_1C_PASSWORD = process.env.API_1C_PASSWORD;

const adminRoute = process.env.adminRoute||'admin';

const autoAuthorizationHolub = false;

const domian = process.env.domian;
const app = express();

app.set('view engine', 'ejs');

const ssl_key = path.join(__dirname, "certificat", 'key.pem');
const ssl_cert = path.join(__dirname, "certificat", 'cert.pem');

const createPath = (page) => path.resolve(__dirname, 'views', `${page}`);

const embeddingsDataPath = path.join(__dirname, 'embeddings.json');
const userInfoDataPath = path.join(__dirname, 'userInfoData.json');

let embeddings = null;
let userInfo = null;
let human = null;
let db = null;

let clients = [];

const humanConfig = { // user configuration for human, used to fine-tune behavior
  cacheSensitivity: 0,
  modelBasePath: 'file://models/',
  filter: { 
    enabled: true, 
    equalization: true,
    return: false
  },
  debug: true,
  face: {
    enabled: true,
    detector: { 
      rotation: true, 
      return: false, 
      mask: false,
      minConfidence: 0.82
     }, // return tensor is used to get detected face image
    description: { enabled: true }, // default model for face descriptor extraction is faceres
    // mobilefacenet: { enabled: true, modelPath: 'https://vladmandic.github.io/human-models/models/mobilefacenet.json' }, // alternative model
    // insightface: { enabled: true, modelPath: 'https://vladmandic.github.io/insightface/models/insightface-mobilenet-swish.json' }, // alternative model
    iris: { enabled: false }, // needed to determine gaze direction
    emotion: { enabled: false }, // not needed
    mesh: { enabled: false },   // not needed
    antispoof: { enabled: false }, // enable optional antispoof module
    liveness: { enabled: false }, // enable optional liveness module
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false }, // parses face and iris gestures
};

// ******************************************* Web сервер *******************************************
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

app.use(cookieParser());


async function getDataFromMe(path, req, callback) {
  log.info('getDataFromMe', `https://${domian}${path}`);
  try {
    const response = await axios.get(`https://${domian}${path}`, { 
      headers: { Cookie: 'token=' + req.cookies.token } 
    });
    callback(response.data);
  } catch (error) {
    log.error('getDataFromMe - error', error);
  }
}

// Обработчик запроса главной страницы
app.get('/adminAuth', (req, res, next) => {
  //console.log('admin', userInfo['f9c18a95-123c-11ed-81c1-000c29006152']);
  req.user = userInfo['f9c18a95-123c-11ed-81c1-000c29006152'];
  
  let result = {};
  result.detectUser = true;
  result.user = userInfo[req.user.uid];
  result.token = jwt.sign(result.user, secret, options);
  //log.info(result);
  res.send(result);
});

function authenticateToken(req, res, next) {
  //log.info('authenticateToken', 'req', req);



  if (autoAuthorizationHolub) {
    req.user = userInfo['f9c18a95-123c-11ed-81c1-000c29006152'];
    next();
    return;
  } else {
    const token = req.cookies.token;
/*     log.data('authenticateToken', token);
    log.data('authenticateToken', req.user);
    log.data('authenticateToken', req.cookies); */

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
  //log.warn('app.use Info', `Request - method: ${req.method}  path: ${req.path}`);
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

app.use(express.urlencoded({  limit: '1mb', extended: true }));
app.use(express.json());

// Обработчик запроса главной страницы
app.get('/', (req, res) => {
  res.sendFile(createPath('index.html'));
});

app.get('/' + adminRoute, (req, res) => {
  res.sendFile(createPath('admin.html'));
});

app.post('/detectFace', async (req, res) => {
  let result = await findUserOnFoto(req.body);
  let message = 'no face';
  
  log.data('saveFace', result);

  if (result.detectFace) {
    message = `Similarity - ${result.similarity}, Distance - ${result.finded.distance}, Score - ${result.score}`;

    if (result.uid !== '') {
      if (result.finded.similarity > 0.72) {
        result.token = jwt.sign(result.user, secret, options);

        message += `, +++ Detected ${result.user.name}`;
      }else{
        const uid = db[result.finded.index].uid;
        const user = userInfo[uid];
        message += `, --- Detected ${user.name} - ${result.similarity} `;
      }
    }
  }

  sendTextMessageToTelegramBot(message);

  res.send(result);
});

// Обработчик запросов из 1С об изменениях данных
app.post('/dataUpdated', (req, res) => {
  res.send('NodeJS_OK');
  //log.data('body', req.body);

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

// Проверка авторизации
app.post('/authentication', authenticateToken, async (req, res) => {
  let result = {};
  result.detectUser = true;
  result.user = userInfo[req.user.uid];
  result.token = jwt.sign(result.user, secret, options);
  res.send(result);
});

app.get('/users', authenticateToken, function(req, res) {
  let usersArray = Object.values(userInfo);
  res.render('users', { users: usersArray });
});

app.post('/token', authenticateToken, function(req, res) {
  log.data('body', req.body);

  const uid = req.body.user;
  
  const user = userInfo[uid];
  const token = jwt.sign(user, secret, options);

  res.send({token:token});
});

app.post('/saveFace', authenticateToken, async (req, res) => {
  let result = await findUserOnFoto(req.body, req.body.uid);
  let message = 'no face';
  try {
    log.data('saveFace', result);
    result.user = userInfo[req.body.uid];
    if (result.detectFace) {
      message = `Similarity - ${result.similarity}, Distance - ${result.finded.distance}, Score - ${result.score}`;

      if (result.finded.similarity > 0.72) {
        message += `, ${result.user.name}`;
      }
    }else{
      result.user = userInfo[req.body.uid];
    }
  } catch (error) {
      log.error(`Failed to process message: ${error}`);
  }
  sendTextMessageToTelegramBot(message);

  res.send(result);
});

app.post('/deleteFaces', authenticateToken, async (req, res) => {
  let result = {};

  try {

    db = db.filter((obj) => obj.uid !== req.body.uid);
    embeddings = db.map((rec) => rec.embedding);
    saveDB();

    result.user = userInfo[req.body.uid];

  } catch (error) {
    log.error(`Failed to process message: ${error}`);
  }

  res.send(result);
});

app.get('/loadUserListFrom1C', authenticateToken, async (req, res) => {
  await getDataFromMe('/app/getUserList', req, (data) => {
    log.data('getUserList', data);
    userInfo = data.users.reduce((acc, cur) => { acc[cur.uid] = { ...cur}; return acc; }, {});
    saveDB();
  });

  let usersArray = Object.values(userInfo);
  res.render('users', { users: usersArray });
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

app.use((req, res) => {
  res.status(404).sendFile(createPath('error.html'));
});

app.use((err, req, res, next) => {
  // Обработка ошибки
  console.error(err);

  // Отправка клиенту сообщения об ошибке
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

      //log.data('action', action, 'topic', topic, 'payload', payload, 'user', user);

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
        log.info(action, topic, payload);

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
  // Пример отправки сообщения клиенту
  //ws.send('Welcome to the WSS server!');
});

wss.on('error', (error) => {
  log.error(`WebSocket server error: ${error}`);
});

//********************************************* human **********************************/

async function detectFaceFromBase64(img) {
  try {
      //saveBase64Image(img);
      sendImageToTelegramBot(img);
      const base64Image = img.replace(/^data:image\/jpeg;base64,/, '');
      const buffer = Buffer.from(base64Image, 'base64');
      const result = await detectFaceFromBuffer(buffer);

      return result;
  } catch (error) {
      log.error(error);
  }
  
  return {};
}

async function detectFaceFromBuffer(buffer) {
  const tensor = human.tf.node.decodeImage(buffer);
  const result = await human.detect(tensor, humanConfig);
  human.tf.dispose(tensor);

  return result;
}

async function findUserOnFoto(body, forUserUID = '') {
  let result = { detectFace: false, error: false, exception: false, detectUser: false, uid: '', addedFoto: false };

  try {
    if ('photo' in body) {
      const detection = await detectFaceFromBase64(body.photo);

      if(detection.face.length == 1){
        const embedding = detection.face[0].embedding;
        result.finded = await human.match.find(embedding, embeddings);
        result.similarity = result.finded.similarity.toFixed(2);
        result.score = detection.face[0].score;
        result.detectFace = true;
        result.index = result.finded.index;

        if (result.index > -1) {
          result.uid = db[result.index].uid||'';
        }
        
        if (forUserUID !== '') {
          if (result.uid === '') {
            result.uid = forUserUID;
            result.addedFoto = true;
          }else{
            if (result.uid !== forUserUID) {
              result.uid = '';  
            }
          }
        }

        if (result.uid === '') {
          
        }else{
          if (result.finded.similarity > 0.72) {
            if(result.finded.similarity < 0.98){
              result.addedFoto = true;
            }

            result.user = userInfo[result.uid];
            result.detectUser = true
          }
        }
        
        if (result.addedFoto) {
          const newEmbedding = {uid: result.uid, embedding: embedding};
          db.push(newEmbedding)
          embeddings = db.map((rec) => rec.embedding);
          saveDB();
        }
      }else{
        result.error = true;
      }
    }else{
      result.error = true;
    }
  } catch (error) {
    log.error(`Failed to process findUserOnFoto: ${error}`, result);
    result.exception = true;
  }

  return result;
}

//********************************************* main ******************************************/

async function main() {
  human = new Human.Human(humanConfig); // create instance of human

  await human.tf.ready();
  await human.load();
  await human.warmup();

  await initDB();
  
  // Запуск сервера
  httpsServer.listen(443, () => {
    log.info('Secure server is running on port 443');
  });

  log.info('human.config', human.config);
}

async function calcCount() {
  for (let key in userInfo) {
    userInfo[key].count = 0;

    db.forEach((info) => {
      if (info.uid == key) {
        userInfo[key].count += 1;
      }
    });
  }
}

async function initDB() {
  try {
      if (!fs.existsSync(embeddingsDataPath)) {
        const DataDB = JSON.stringify([], null, 2);
        fs.writeFileSync(embeddingsDataPath, DataDB);
      }


      const loadedEmbeddingsData = fs.readFileSync(embeddingsDataPath);
      db = JSON.parse(loadedEmbeddingsData);
      embeddings = db.map((rec) => rec.embedding);
  } catch (error) {
      log.error(error);
      db = [];
      embeddings = [];
  }

  try {
      if (!fs.existsSync(userInfoDataPath)) {
        const DataUserInfo = JSON.stringify([], null, 2);
        fs.writeFileSync(userInfoDataPath, DataUserInfo);
      }

      const loadedUserInfoData = fs.readFileSync(userInfoDataPath); // Чтение данных из файла
      userInfo = JSON.parse(loadedUserInfoData);
  } catch (error) {
      log.error(error);
      userInfo = {};
  }


  if (Object.keys(userInfo).length == 0) {
    userInfo['f9c18a95-123c-11ed-81c1-000c29006152'] = {
      "name": "Голуб Виталий",
      "uid": "f9c18a95-123c-11ed-81c1-000c29006152",
      "count": 0,
      "isAdmin": false,
      "profa": "Программист",
      "menu": ""
    };
  }

  calcCount();

  log.data(`Loaded from file :`, 'userInfo:', Object.keys(userInfo).length, 'embeddings:', embeddings.length);
}

async function saveDB() {
  log.info('start - saveDB()');
  try {
      calcCount();

      const DataDB = JSON.stringify(db, null, 2);
      fs.writeFileSync(embeddingsDataPath, DataDB);

      const userInfoData = JSON.stringify(userInfo, null, 2);
      fs.writeFileSync(userInfoDataPath, userInfoData);

      log.data(`Saved to file`, 'userInfo:', Object.keys(userInfo).length, 'embeddings:', embeddings.length);
  } catch (error) {
      log.error(error);
  }
}

main();

// Проверка соединений на "живость"
setInterval(() => {
  let clientsForLog = clients.map(c => {
    // Создаем новый объект с теми же свойствами, что и c
    let clientCopy = {...c};
  
    // Удаляем свойство socket
    delete clientCopy.socket;
  
    return clientCopy;
  });

  //log.data('clients', clientsForLog);
  //log.info('Check wss connections', wss.clients.size);

  wss.clients.forEach((ws) => {
    if (!ws.isAlive){
      return ws.terminate();
    } 

    ws.isAlive = false;
    ws.ping(null, false);
  });
}, 10000);

function saveBase64Image(base64Data) {
  const folderPath = path.join(__dirname, 'foto');
  if (!fs.existsSync(folderPath)) {fs.mkdirSync(folderPath);}
  
  const fileName = `image_${Date.now()}.png`;
  const filePath = path.join(folderPath, fileName);

  const base64Image = base64Data.split(';base64,').pop();
  const binaryData = Buffer.from(base64Image, 'base64');

  fs.writeFile(filePath, binaryData, 'binary', (err) => {
    if (err) {
      log.error(err);
    } else {
      log.info(`Изображение успешно сохранено в ${filePath}`);
    }
  });
}

//******************************************* Telegram *****************************************

function sendImageToTelegramBot(base64Data) {
  try {
    // Удаляем префикс base64 из данных
    const base64Image = base64Data.split(';base64,').pop();

    // Преобразуем base64 данные в бинарный формат
    const binaryData = Buffer.from(base64Image, 'base64');

    // Создаем заголовок Content-Type для multipart/form-data
    const boundary = '-----FormDataBoundary';
    const contentType = `multipart/form-data; boundary=${boundary}`;

    // Создаем тело запроса в формате multipart/form-data
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="image.png"\r\nContent-Type: image/png\r\n\r\n`),
      binaryData,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    // Опции запроса
    const options = {
      method: 'POST',
      url: `https://api.telegram.org/bot${botToken}/sendPhoto`,
      headers: {
        'Content-Type': contentType,
        'Content-Length': body.length,
      },
      data: body,
    };

    // Отправляем запрос POST с данными картинки
    axios(options)
      .then((response) => {
        //console.log('Картинка успешно отправлена в Telegram бота');
      })
      .catch((error) => {
        console.error('Ошибка при отправке картинки в Telegram бота:');
      });
  } catch (error) {
    
  }
}

function sendTextMessageToTelegramBot(message) {
  const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const options = {
      method: 'POST',
      url: apiUrl,
      data: {
        chat_id: chatId,
        text: message,
      },
    };
  
    axios(options)
      .then((response) => {
        //console.log('Сообщение успешно отправлено в Telegram бота');
      })
      .catch((error) => {
        console.error('Ошибка при отправке сообщения в Telegram бота:');
      });
  } catch (error) {
    
  }
  
}

// *********************************************************************************************




