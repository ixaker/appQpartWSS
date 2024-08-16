const axios = require('axios');
const FormData = require('form-data');
const { Buffer } = require('buffer');

async function updateAvatar(photo, empCode) {
    console.log("Starting updateAvatar function for empCode:", empCode);
    const result = { response: "ok" };
    try {
        const csrfToken = await getCsrfToken();
        console.log("CSRF token received");

        const base64Data = photo.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');

        const response = await sendAvatar(imageBuffer, csrfToken, empCode);
        console.log("Response from sendAvatar:", response.data);

        result.data = response.data;
        return result;
    } catch (error) {
        console.error("Error updating avatar:", error.message);
        throw new Error(`Помилка оновлення аватара: ${error.message}`);
    } finally {
        console.log("updateAvatar function completed for empCode:", empCode);
    }
}

async function getCsrfToken() {
    console.log("Starting getCsrfToken function");
    try {
        const response = await axios.get('http://10.8.0.4/vlRegister/', {
            withCredentials: true,
        });
        console.log("Response from GET request for CSRF token:", response.status, response.statusText);

        const csrfToken = response.headers['set-cookie']
            .find(cookie => cookie.startsWith('csrftoken'))
            .split('csrftoken=')[1]
            .split(';')[0];
        console.log("CSRF token extracted csrfToken=", csrfToken);

        return csrfToken;
    } catch (error) {
        console.error('Error getting CSRF token:', error);
        throw error;
    } finally {
        console.log("getCsrfToken function completed");
    }
}

async function sendAvatar(imageBuffer, csrfToken, empCode) {
    console.log("Starting sendAvatar function");
    try {
        const form = new FormData();
        form.append('csrfmiddlewaretoken', csrfToken);
        form.append('orient', '1');
        form.append('user_capture', imageBuffer, { filename: 'user_capture.jpg' });
        form.append('employee_code', '518');
        form.append('remark', '');

        const truncatedBuffer = imageBuffer.toString('base64').slice(0, 50) + '...';
        console.log("Form data prepared");
        console.log("File type:", form.getHeaders()['content-type']);

        const response = await axios.post('http://10.8.0.4/vlRegister/', form, {
            headers: {
                ...form.getHeaders(),
                'Cookie': `csrftoken=${csrfToken}`,
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'Connection': 'keep-alive'
            }
        });

        console.log("Response from POST request:", response.data);
        if (response.data.ret === -1) {
            throw new Error("Не вдалось ідентифікувати фото.");
        }

        return response;
    } catch (error) {
        console.error('Error sending POST request:', error);
        throw error;
    } finally {
        console.log("sendAvatar function completed");
    }
}

module.exports = {
    updateAvatar
};
