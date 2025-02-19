// faceID.js
const Human = require('@vladmandic/human');
const path = require('path');
const fs = require('fs');
const log = require('./loggerConfig.js');

const projectRoot = path.join(__dirname, '..'); // Подняться на один уровень вверх от текущего каталога

var embeddings = {};
let human = null;
var userInfo = {};
let db = {};

const embeddingsDataPath = path.join(projectRoot, 'embeddings.json');
const userInfoDataPath = path.join(projectRoot, 'userInfoData.json');
const usersFolderPath = path.join(projectRoot, 'foto');

const humanConfig = {
  // user configuration for human, used to fine-tune behavior
  cacheSensitivity: 0,
  modelBasePath: 'file://services/models/',
  filter: {
    enabled: true,
    equalization: true,
    return: false,
  },
  debug: false,
  face: {
    enabled: true,
    detector: {
      rotation: true,
      return: false,
      mask: false,
      minConfidence: 0.82,
    }, // return tensor is used to get detected face image
    description: { enabled: true }, // default model for face descriptor extraction is faceres
    // mobilefacenet: { enabled: true, modelPath: 'https://vladmandic.github.io/human-models/models/mobilefacenet.json' }, // alternative model
    // insightface: { enabled: true, modelPath: 'https://vladmandic.github.io/insightface/models/insightface-mobilenet-swish.json' }, // alternative model
    iris: { enabled: false }, // needed to determine gaze direction
    emotion: { enabled: true }, // not needed
    mesh: { enabled: false }, // not needed
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
    const base64Image = img.replace(/^data:image\/[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');
    const result = await detectFaceFromBuffer(buffer);
    // log.info('detectFaceFromBase64 Object.keys(result), result.face', Object.keys(result));

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
  // log.info('detectFaceFromBuffer result', result)
  return result;
}

async function getEmbeddingFromPhoto(photo) {
  log.info('start getEmbeddingFromPhoto');

  try {
    const detection = await detectFaceFromBase64(photo);
    if (detection && detection.face && detection.face.length === 1) {
      const embedding = detection.face[0].embedding;
      return embedding;
    }
  } catch (error) {
    log.error('Failed to get embedding from photo:', error);
    return null;
  }
}

async function savePhotoOnly(body, userUID) {
  console.log('savePhotoOnly');

  const result = { success: false, error: false, exception: false };

  try {
    if ('photo' in body) {
      const photo = body.photo;
      const file = `${Date.now()}.png`;

      console.log('Received photo for userUID:', userUID, photo.substring(0, 50) + '...');

      const embedding = await getEmbeddingFromPhoto(photo);
      console.log('Obtained embedding:', embedding);

      if (!embedding) {
        console.log('Error: No embedding obtained.');
        result.error = true;
        return result;
      }

      await saveUserFoto(userUID, photo, file);
      console.log('Photo saved successfully. File path:');

      const newEmbedding = { uid: userUID, embedding: embedding, file: file, countFileUse: 0 };
      db.push(newEmbedding);
      embeddings = db.map(rec => rec.embedding);
      saveDB();

      console.log('Database updated. New embedding added:');

      result.success = true;
    } else {
      console.log('Error: No photo found in body.');
      result.error = true;
    }
  } catch (error) {
    console.error(`Failed to save photo only: ${error}`);
    result.exception = true;
  }

  console.log('Function result:', result);
  return result;
}

async function addPhotoWhithoutVerify(photo, uid) {
  console.log('addPhotoWhithoutVerify uid', uid);
  let result = {};
  try {
    const detection = await detectFaceFromBase64(photo);

    if (detection && detection.face && detection.face.length === 1) {
      log.info('addPhotoWhithoutVerify detection', detection);
      const embedding = detection.face[0].embedding;
      const file = `${Date.now()}.png`;
      const newEmbedding = { uid: uid, embedding: embedding, file: file, countFileUse: 0 };

      userInfo[uid].isNewFoto = true;
      db.push(newEmbedding);
      embeddings = db.map(rec => rec.embedding);
      saveDB();
      saveUserFoto(uid, photo, file);
      result.message = 'фото успішно збережено';
      result.success = true;
      result.user = userInfo[uid];
      log.info('result from addPhotoWhithoutVerify', result);
    }
  } catch (error) {
    result.exception = true;
    result.success = false;
    log.error(`Failed to process addPhotoWhithoutVerify: ${error}`, result);
  }

  return result;
}

async function findSeveralMatches(embedding, embeddings) {
  const countSimilarity = 5;

  try {
    const results = embeddings.map((descriptor, index) => {
      return {
        index: index,
        similarity: human.match.similarity(embedding, descriptor, {
          order: 2,
          multiplier: 20,
          min: 0.5,
          max: 1,
        }),
      };
    });

    results.sort((a, b) => b.similarity - a.similarity);

    const topResults = results.slice(0, countSimilarity);
    log.info('findSeveralMatches', topResults);

    return topResults.map(result => {
      log.info('result', result);
      const file = db[result.index]?.file || 'Unknown file';
      const uid = db[result.index]?.uid || 'Unknown UID';
      const userName = userInfo[uid]?.name || 'Unknown name';

      return {
        similarity: result.similarity,
        file: file,
        uid: uid,
        userName: userName,
      };
    });
  } catch (error) {
    log.error('Error in findSeveralMatches:', error.message);
    throw error;
  }
}

async function checkPhoto(body) {
  let result = { detectFace: false, error: false, detectUser: false, uid: '' };
  try {
    if ('photo' in body) {
      const detection = await detectFaceFromBase64(body.photo);

      if (detection && detection.face) {
        const embedding = detection.face[0].embedding;
        result.finded = await human.match.find(embedding, embeddings);
        result.similarity = result.finded.similarity.toFixed(2);
        result.score = detection.face[0].score;
        result.detectFace = true;
        result.index = result.finded.index;

        if (result.index > -1) {
          result.uid = db[result.index].uid || '';
          result.user = userInfo[result.uid];
          result.originalPhotoName = db[result.index].file;
          result.detectUser = true;
        }
      }
    }
  } catch (error) {}
  return result;
}

async function findUserOnFoto(body, forUserUID = '') {
  console.log('findUserOnFoto forUserUID', forUserUID);
  let result = {
    detectFace: false,
    error: false,
    exception: false,
    detectUser: false,
    uid: '',
    addedFoto: false,
    forUserUID: forUserUID,
    photoPath: '',
  };
  result.originalPhoto = body.photo;

  try {
    if ('photo' in body) {
      const detection = await detectFaceFromBase64(body.photo);
      log.info('findUserOnFoto detection', detection);

      if (detection && detection.face && detection.face.length === 1) {
        // console.log('detection.face.length', detection.face.length);
        const embedding = detection.face[0].embedding;
        result.finded = await human.match.find(embedding, embeddings);
        // result.finded2 = await findSeveralMatches(embedding, embeddings);
        result.similarity = result.finded.similarity.toFixed(2);
        result.score = detection.face[0].score;
        result.detectFace = true;
        result.index = result.finded.index;
        log.info('findUserOnFoto result.index, result.finded', result.index, result.finded);

        if (result.index > -1) {
          result.uid = db[result.index].uid || '';
          // successPhotoFileName = db[result.index].file;

          if (forUserUID === '') {
            if (db[result.index].countFileUse === undefined) {
              db[result.index].countFileUse = 0;
            }

            if (result.finded.similarity > 0.72) {
              db[result.index].countFileUse += 1;
              db[result.index].dateLastFinded = new Date();
            }

            let folderPath = path.join(usersFolderPath, result.uid);
            const filePath = path.join(folderPath, db[result.index].file);

            buffer = loadImageSync(filePath);
            result.originalPhoto = buffer.toString('base64');
            result.originalPhotoName = db[result.index].file;

            saveDB();
          }
        }

        if (forUserUID !== '') {
          result.forUser = userInfo[forUserUID];
          //result.uid = forUserUID;
          result.uid = '';

          log.info('forUserUID !==', result.uid, forUserUID);

          if (result.uid === '') {
            result.uid = forUserUID;
            result.addedFoto = true;
          } else {
            if (result.uid !== forUserUID && result.finded.similarity < 0.6) {
              result.userError = userInfo[result.uid];
              result.uid = forUserUID;
              result.comment = 'result.uid !== forUserUID';
              result.addedFoto = true;
            }
          }
        }

        if (result.uid === '') {
        } else {
          if (result.finded.similarity > 0.72) {
            result.user = userInfo[result.uid];
            result.detectUser = true;

            if (result.finded.similarity < 0.98) {
              if (result.user.count < 40) {
                //result.addedFoto = true;
              }
            }
          } else {
            result.user = userInfo[result.uid];
          }
        }

        if (result.addedFoto) {
          const file = `${Date.now()}.png`;
          const newEmbedding = { uid: result.uid, embedding: embedding, file: file, countFileUse: 0 };
          userInfo[result.uid].isNewFoto = true;
          db.push(newEmbedding);
          embeddings = db.map(rec => rec.embedding);
          saveDB();
          saveUserFoto(result.uid, body.photo, file);

          result.photoPath = path.join('foto', result.uid, file);
        }
      } else {
        result.error = true;
      }
    } else {
      result.error = true;
    }
  } catch (error) {
    log.error(`Failed to process findUserOnFoto: ${error}`, result);
    result.exception = true;
  }

  // log.data(result);
  return result;
}

async function calcCount() {
  for (let key in userInfo) {
    userInfo[key].count = 0;

    db.forEach(info => {
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

    embeddings = db.map(rec => rec.embedding);
  } catch (error) {
    log.error(error);
    db = [];
    embeddings = [];
  }

  try {
    log.info('userInfoDataPath', userInfoDataPath);

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
      name: 'Голуб Виталий',
      uid: 'f9c18a95-123c-11ed-81c1-000c29006152',
      count: 0,
      isAdmin: false,
      profa: 'Программист',
      menu: '',
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
  if (!fs.existsSync(folderRootPath)) {
    fs.mkdirSync(folderRootPath);
  }

  const folderUserPath = path.join(folderRootPath, uid);
  if (!fs.existsSync(folderUserPath)) {
    fs.mkdirSync(folderUserPath);
  }

  const filePath = path.join(folderUserPath, name);

  const base64Image = base64Data.split(';base64,').pop();
  const binaryData = Buffer.from(base64Image, 'base64');

  fs.writeFile(filePath, binaryData, 'binary', err => {
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
  log.info('getUserInfoID ()');
  return userInfo[id];
}

function getUserInfoByEmpCode(empCode) {
  log.info('getUserInfoEmpCode ()', empCode);
  const users = Object.values(userInfo);
  const user = users.find(user => user.emp_code === empCode);
  // log.info('user', user);
  return user;
}

async function updateUser(user) {
  log.info('updateUser user=', user);
  if (user.fired) {
    delete userInfo[user.uid];
    db = db.filter(emb => emb.uid !== user.uid);
  } else {
    userInfo[user.uid] = user;
  }

  saveDB();
}

async function updateUsersInfo(users) {
  userInfo = users.reduce((acc, cur) => {
    acc[cur.uid] = { ...cur };
    return acc;
  }, {});
  saveDB();
}

async function updateFaceID(users) {
  userInfo = users.reduce((acc, cur) => {
    acc[cur.uid] = { ...cur };
    return acc;
  }, {});
  // log.info('updateFaceID userInfo', userInfo);
  db = [];

  for (const user of users) {
    let folderPath = path.join(usersFolderPath, user.uid);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    log.info(user.name, folderPath);

    try {
      const files = fs.readdirSync(folderPath);

      for (const file of files) {
        const filePath = path.join(folderPath, file);
        const buffer = loadImageSync(filePath);

        if (buffer) {
          const detection = await detectFaceFromBuffer(buffer);

          if (detection.face.length == 1) {
            const face = detection.face[0];
            const embedding = face.embedding;
            const newEmbedding = { uid: user.uid, embedding: embedding, file: file };
            db.push(newEmbedding);
          } else {
            log.error('лицо на фото не обнаружено или несколько лиц то удалим фото');
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при чтении папки:', folderPath);
    }
  }

  embeddings = db.map(rec => rec.embedding);
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
  db = db.filter(obj => obj.uid !== uid);
  embeddings = db.map(rec => rec.embedding);
  saveDB();

  let folderPath = path.join(usersFolderPath, uid);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }

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
  if (!userInfo[uid]) return [];
  userInfo[uid].isNewFoto = false;
  log.info('isNewFoto delete from user', userInfo[uid], userInfo[uid].isNewFoto);
  saveDB();
  const fotoUse = userEmb.reduce((acc, user) => {
    if (user.file) {
      const countFileUse = user.countFileUse || 0;
      acc[user.file] = (acc[user.file] || 0) + countFileUse;
    }
    return acc;
  }, {});

  const fotoUseArray = Object.keys(fotoUse).map(fileName => ({
    fileName: fileName,
    countFileUse: fotoUse[fileName],
    userId: uid,
    dateLastFinded: userEmb.find(user => user.file === fileName)?.dateLastFinded || null,
  }));

  log.info('fotoUseArray', fotoUseArray);

  return fotoUseArray;
}

function deleteUserFoto(uid, file) {
  try {
    log.info('deleteUserFoto', uid, file);
    db = db.filter(item => !(item.uid === uid && item.file === file));
    embeddings = db.map(rec => rec.embedding);
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
  savePhotoOnly,
  addPhotoWhithoutVerify,
  checkPhoto,
  findUserOnFoto,
  saveDB,
  getUserInfo,
  getUserInfoID,
  getUserInfoByEmpCode,
  updateUser,
  updateUsersInfo,
  deleteFotosUserAll,
  getUserFotoList,
  deleteUserFoto,
  updateFaceID,
};
