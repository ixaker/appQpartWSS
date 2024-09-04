function initListPlate(platesID, needClearData = false) {
    console.log('initListPlate start',);

    try {
        const plateJQ = $(platesID);
        plateJQ.empty();

        let id_response = plateJQ.attr('id') + Date.now();

        if (needClearData) {
            const defaultParam = plateJQ.data('defaultParam');

            const param = { ...defaultParam };
            plateJQ.data('param', param);
        }

        const param = plateJQ.data('param') || {};

        NProgress.start();
        const url = plateJQ.attr('url');

        console.log('param', param);
        $.ajax({
            url: url, type: 'GET', dataType: 'json', data: param, success: async function (response) {
                console.log('response from initLIstPlate', response);
                callbackFromAttr(plateJQ, 'callbackAfterLoadData', response);
                plateJQ.data('data', response);

                if (!response.passRender) {
                    response.list.forEach(element => {
                        const elementForAdding = $(`<div id=${element.uid} class="plateListItem"></div>`);
                        elementForAdding.data('data', element);
                        $(platesID).append(elementForAdding);
                        callbackFromAttr(plateJQ, 'callbackForRender', element);
                    });

                    plateJQ.on('click', '.plateListItem', function (event) {
                        callbackFromAttr(plateJQ, 'callbackClick', this);
                    });

                    callbackFromAttr(plateJQ, 'callbackAfterRender', response);

                }

            }, complete: function (response) {
                NProgress.done();
            }, beforeSend: function (response) {
                activeRequests[id_response] = response;
            }
        });
    } catch (error) {
        NProgress.done();
    }
}

callbackScrollForLoadingData = function () {
    console.log('callbackScrollForLoadingData')
    $('[type="plate"]').each((index, plate) => {
        console.log('callbackScrollForLoadingData plate', plate);
        const needPaggination = $(plate).attr('paggination') !== 'false';
        console.log('needPaggination, plate ', $(plate), needPaggination);
        console.log('needPaggination', needPaggination);
        if (needPaggination) {
            initListPlate(plate)
        }
    });
}