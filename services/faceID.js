// faceID.js
const Human = require('@vladmandic/human');
const path  = require('path');
const fs    = require('fs');
const log   = require('./loggerConfig.js');

const projectRoot = path.join(__dirname, '..'); // Подняться на один уровень вверх от текущего каталога

var embeddings = {};
let human = null;
var userInfo = {};
let db = {};

const embeddingsDataPath = path.join(projectRoot, 'embeddings.json');
const userInfoDataPath = path.join(projectRoot, 'userInfoData.json');
const usersFolderPath = path.join(projectRoot, 'foto');

const humanConfig = { // user configuration for human, used to fine-tune behavior
    cacheSensitivity: 0,
    modelBasePath: 'file://services/models/',
    filter: { 
      enabled: true, 
      equalization: true,
      return: false
    },
    debug: false,
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

async function initHuman() {
    human = new Human.Human(humanConfig); // create instance of human
  
    await human.tf.ready();
    await human.load();
    await human.warmup();
  
    await initDB();
  
    //log.info('human.config', human.config);
}

async function detectFaceFromBase64(img) {
    log.info('start detectFaceFromBase64');
  
    try {
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
    let result = { detectFace: false, error: false, exception: false, detectUser: false, uid: '', addedFoto: false, forUserUID:forUserUID };
  
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
  
            //log.info(db[result.index]);
          }
          
          if (forUserUID !== '') {
            result.forUser = userInfo[forUserUID];
            //result.uid = forUserUID;
            result.uid = '';
  
            log.info('forUserUID !==', result.uid, forUserUID)
  
            if (result.uid === '') {
              result.uid = forUserUID;
              result.addedFoto = true;
            }else{
              if (result.uid !== forUserUID && result.finded.similarity < 0.6) {
                result.userError = userInfo[result.uid];
                result.uid = forUserUID;
                result.comment = 'result.uid !== forUserUID';
  
                result.addedFoto = true;
              }
            }
          }
  
          if (result.uid === '') {
            
          }else{
            if (result.finded.similarity > 0.72) {
              result.user = userInfo[result.uid];
              result.detectUser = true
  
              if(result.finded.similarity < 0.98){
                if (result.user.count < 40) {
                  result.addedFoto = true;
                }
              }
            }
          }
          
          if (result.addedFoto) {
            const file = `${Date.now()}.png`;
            const newEmbedding = {uid: result.uid, embedding: embedding, file:file};
            db.push(newEmbedding)
            embeddings = db.map((rec) => rec.embedding);
            saveDB();
            saveUserFoto(result.uid, body.photo, file);
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
  
    log.data(result);
    return result;
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
        db = db.filter(obj => 'uid' in obj);
  
        embeddings = db.map((rec) => rec.embedding);
    } catch (error) {
        log.error(error);
        db = [];
        embeddings = [];
    }
  
    try {
        log.info('userInfoDataPath', userInfoDataPath)

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

function saveUserFoto(uid, base64Data, name) {
    const folderRootPath = path.join(projectRoot, 'foto');
    if (!fs.existsSync(folderRootPath)) {fs.mkdirSync(folderRootPath);}
    
    const folderUserPath = path.join(folderRootPath, uid);
    if (!fs.existsSync(folderUserPath)) {fs.mkdirSync(folderUserPath);}
  
    const filePath = path.join(folderUserPath, name);
  
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

function getUserInfo() {
    return userInfo;
}

function getUserInfoID(id) {
    return userInfo[id];
}

async function updateUsersInfo(users) {
    userInfo = users.reduce((acc, cur) => { acc[cur.uid] = { ...cur}; return acc; }, {});
    saveDB();
}

async function updateFaceID(users) {
  userInfo = users.reduce((acc, cur) => { acc[cur.uid] = { ...cur}; return acc; }, {});
  db = [];

  for (const user of users) {
      let folderPath = path.join(usersFolderPath, user.uid);
      if (!fs.existsSync(folderPath)) {fs.mkdirSync(folderPath);}

      log.info(user.name, folderPath);

      try {
          const files = fs.readdirSync(folderPath);
          
          for (const file of files) {
              const filePath = path.join(folderPath, file);
              const buffer = loadImageSync(filePath);

              if (buffer) {
                  const detection = await detectFaceFromBuffer(buffer);
                  
                  if(detection.face.length == 1){
                      const face = detection.face[0];
                      const embedding = face.embedding;
                      const newEmbedding = {uid: user.uid, embedding: embedding, file:file};
                      db.push(newEmbedding);
                  }else{
                      log.error('лицо на фото не обнаружено или несколько лиц то удалим фото');
                  }
              }
          }
      } catch (error) {
          console.error('Ошибка при чтении папки:', folderPath);    
      }
  }

  embeddings = db.map((rec) => rec.embedding);
  saveDB();
}

function loadImageSync(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    return buffer;
  } catch (error) {
    console.error('Ошибка при чтении файла:', filePath);
    return null;
  }
}

function deleteFotosUserAll(uid) {
    db = db.filter((obj) => obj.uid !== uid);
    embeddings = db.map((rec) => rec.embedding);
    saveDB();

    let folderPath = path.join(usersFolderPath, uid);
    if (!fs.existsSync(folderPath)) {fs.mkdirSync(folderPath);}

    try {
        const files = fs.readdirSync(folderPath);
        
        for (const file of files) {
            const filePath = path.join(folderPath, file);

            fs.unlink(filePath, err => { 
                if (err) log.error('Error deleting file', err); 
            });
        }
    } catch (error) {
        log.error('deleteFotosUserAll', error);
    }
}

function getUserFotoList(uid) {
    const userEmb = db.filter(user => user.uid === uid);   
    const files = userEmb.map(user => (user.file ? user.file : "notFound.png"));

    return files;
}

function deleteUserFoto(uid, file) {
  try {
    db = db.filter(item => !(item.uid === uid && item.file === file));
    embeddings = db.map((rec) => rec.embedding);
    saveDB();

    const userFolderPath = path.join(usersFolderPath, uid);
    const userFotoPath = path.join(userFolderPath, file);

    fs.unlink(userFotoPath, err => { 
        if (err) log.error('Error deleting file', err); 
    });
  } catch (error) {
    log.error('deleteUserFoto', uid, file, error);
  }
}

module.exports = {
    initHuman,
    findUserOnFoto,
    saveDB,
    getUserInfo,
    getUserInfoID,
    updateUsersInfo,
    deleteFotosUserAll,
    getUserFotoList,
    deleteUserFoto,
    updateFaceID
};
  