function initListPlate(platesID, needClearData = false) {
    console.log('initListPlate start',);

    try {
        const plateJQ = $(platesID);

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
                response.list.forEach(element => {
                    const elementForAdding = $(`<div id=${element.uid} ></div>`);
                    elementForAdding.data('data', element);
                    $(platesID).append(elementForAdding);
                    callbackFromAttr(plateJQ, 'callbackForRender', element);
                });

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
        console.log('callbackScrollForLoadingData plate', plate)
        initListPlate(plate)
    });


}