// dotenv.js
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envFilePath = path.resolve(process.cwd(), '.env');
let parsedDotENV = {};

const defaultDotENV = {
    'HOST': '10.8.0.3'
};

function init() {
    try {
        const result = dotenv.config({ path: envFilePath});
        parsedDotENV = result.parsed;

        if (result.error) {
            create();
        }
    } catch (error) {
        console.log('module dotenv : ERROR init()', error);    
    }
}

function create() {
    try {
        dotenv.populate(process.env, defaultDotENV, { override: true });
        parsedDotENV = defaultDotENV;
        writeEnvFile();
    } catch (error) {
        console.log('module dotenv : ERROR create()', error);
    }
    
}

function writeEnvFile() {
    try {
        const envContent = Object.entries(parsedDotENV).map(([key, value]) => `${key}=${value}`).join('\n');
        fs.writeFileSync(envFilePath, envContent);
    } catch (error) {
        console.log('module dotenv : ERROR writeEnvFile()', error);
    }
}

function setValue(key, value){
    try {
        parsedDotENV[key] = value;
        dotenv.populate(process.env, parsedDotENV, { override: true });
        writeEnvFile();
    } catch (error) {
        console.log('module dotenv : ERROR setValDotEnv(key, value)', error);
    }
}

function getENV() {
    return parsedDotENV;
}
module.exports = {
    init,
    setValue,
    envFilePath,
    getENV
};