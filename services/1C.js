const axios = require('axios');
const log = require('./loggerConfig.js');
const funcIbSession = require('./ibsessionFunctions.js');
const { createProxyMiddleware } = require('http-proxy-middleware');
const url = require('url');

const base = process.env.base;
const API_1C_URL = `${process.env.BASE_URL}/${base}/ru_RU/hs/app`;
console.log('API_1C_URL', API_1C_URL)
const API_1C_LOGIN = process.env.API_1C_LOGIN;
const API_1C_PASSWORD = process.env.API_1C_PASSWORD;
const Authorization1C = `Basic ${Buffer.from(`${API_1C_LOGIN}:${API_1C_PASSWORD}`).toString('base64')}`;

let ibSession = '';
const periodOfPing1C = 60 * 10 * 1000;

async function GET(path) {
    try {
        const response = await request1C('GET', path);
        return response.data; // Возвращаем данные ответа
    } catch (error) {
        console.error('Ошибка при выполнении GET_1C:', error); // Логирование ошибки
        return {}; // Возвращаем пустой объект в случае ошибки
    }

}

async function pingRequest() {
    log.info('pingRequestStart');
    const response = await request1C('GET', '/ping');
    log.info('pingRequest', response.status, ibSession);
}

async function init() {
    ibSession = funcIbSession.readSessionFromFile('ibsession.txt');

    pingRequest();
    // const response = await request1C('POST', '/createReport?uid=f9c18a95-123c-11ed-81c1-000c29006152', {}, { operator: true } )
    // console.log('response createReport', response);
    setInterval(() => {
        pingRequest();
    }, periodOfPing1C);
}

async function request1C(method, path, headers = {}, data = {}) {
    try {
        let needStartSession = true;

        if (ibSession && ibSession.trim() !== '') {
            needStartSession = false;

            authHeaders = {
                'Cookie': ibSession,
                // 'Authorization': Authorization1C,
                ...headers
            }
            const response = await axios1C(method, path, authHeaders, data);
            log.info('request1C', response)
            if (response.status === 200) {
                return response;
            }

            if (response.status === 400 || response.status === 404) {
                needStartSession = true;
            }
        }

        if (needStartSession) {

            log.info('needStartSession2', needStartSession)

            authHeaders = {
                'IBSession': 'start',
                'Authorization': Authorization1C,
                ...headers
            }
            const responseStart = await axios1C(method, path, authHeaders, data);
            log.info('responseStart', responseStart)
            if (responseStart.status === 200) {
                if (responseStart.headers.hasOwnProperty('set-cookie')) {
                    ibSession = responseStart.headers['set-cookie'][0];
                    funcIbSession.writeSessionToFile('ibsession.txt', ibSession);
                }
            }

            return responseStart;
        }

        throw (`request1C - ${method} : ${path} - error`)

    } catch (error) {
        return {
            status: 500,
            headers: {},
            data: error
        };
    }
}



async function axios1C(method, path, headers, data) {
    log.info('axios1C start')
    try {
        log.info(`axios1C ${method}, ${path}`)
        const url = `${API_1C_URL}${path}`
        log.data(`axios1C ${method}, ${path}`, url)

        const response = await axios({
            method: method,
            url: url,
            headers: headers,
            data: data
        });
        log.info(`axios1C ${method}, ${path}`, response.status)

        return {
            status: response.status,
            headers: response.headers,
            data: response.data
        };
    } catch (error) {
        log.info(`axios1C ${method}, ${path} error`, error.headers)
        return {
            status: error.response ? error.response.status : 500,
            headers: error.response ? error.response.headers : {},
            data: error.response ? error.response.data : {}
        };
    }
}

const ProxyMiddleware1C = createProxyMiddleware({
    target: API_1C_URL,
    changeOrigin: true,
    on: {
        proxyReq: (proxyReq, req, res) => {
            try {
                proxyReq.setHeader('Cookie', ibSession);
                // proxyReq.setHeader('Authorization', Authorization1C);
                const newTarget = new url.URL(proxyReq.path, 'http://localhost');
                newTarget.searchParams.set('uid', req.user.uid); // добавляем новый параметр
                proxyReq.path = newTarget.toString().replace('http://localhost', '');
                log.info('proxyReq', proxyReq.path);
                log.info('middleware req.body', req.method)
                const writeBody = (bodyData) => {
                    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData))
                    proxyReq.write(bodyData)
                }
                
                const contentType = req.headers['content-type'];
                log.info('contentType', contentType)
                if (contentType && (contentType.includes('application/json') || contentType.includes('application/x-www-form-urlencoded'))) {
                    writeBody(JSON.stringify(req.body))
                } else {
                    // Обробка випадку, коли contentType відсутній або не має підтримуваних типів
                }
            } catch (error) {
                log.error('ProxyMiddleware1C proxyReq', error);
            }
        },
        error: (err, req, res) => {
            log.error('ProxyMiddleware1C', err);
        },
    },
})

module.exports = {
    init,
    GET,
    ProxyMiddleware1C,
    request1C
}
