const fs = require('fs');

// Функція для запису ibsession у файл, якщо файл не існує, то спочатку створюємо його
function writeSessionToFile(filePath, ibsession) {
    fs.writeFile(filePath, ibsession, { flag: 'wx' }, (err) => {
        if (err) {
            if (err.code === 'EEXIST') {
                // Файл уже існує, тому просто записуємо в нього ibsession
                fs.writeFile(filePath, ibsession, (err) => {
                    if (err) {
                        console.error('Помилка при записі в файл:', err);
                    } else {
                        console.log('ibsession успішно збережено у файлі');
                    }
                });
            } else {
                console.error('Помилка при спробі запису у файл:', err);
            }
        } else {
            console.log('Файл для сесії створено, ibsession успішно збережено');
        }
    });
}

// Функція для читання ibsession з файлу
function readSessionFromFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.log('Файл не знайдено:', filePath);
            return ' ';
        }
        
        const data = fs.readFileSync(filePath, 'utf8');
        console.log('ibsession отримано з файлу:', data);
        return data.trim() || ' ';
    } catch (err) {
        console.error('Помилка при читанні з файлу:', err);
        return ' ';
    }
}

module.exports = { writeSessionToFile, readSessionFromFile };
