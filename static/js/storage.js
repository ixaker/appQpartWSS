async function saveFilesToStorage(media, uid, uidChild) {
    console.log('saveFilesToBackend', media, uid, uidChild);
    const patch = `/${uid}/${uidChild}`;

    for (const element of media) {
        await new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onloadend = function () {
                const data = JSON.stringify({
                    file: reader.result,
                    path: patch,
                    name: element.name
                });

                $.post(
                    '/saveFile',
                    data,
                    function (response) {
                        console.log('/saveFile', response);
                        resolve();
                    },
                    'json'
                ).fail(function (jqXHR, textStatus, errorThrown) {
                    reject(errorThrown);
                });
            };
            reader.readAsDataURL(element.data);
        });
    }

    console.log('All files processed successfully');
}


