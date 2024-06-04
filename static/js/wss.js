let socket;
let firstConnection = true;
let WebSocketConnected = false;
let callbackWSS;

function sendWSS(action = '', topic = '', payload = '') {
    console.log('sendWSS ', action, topic, WebSocketConnected, auth);

    try {
        const msg = { action: action, topic: topic, payload: payload, user: user };
        //console.log('sendWSS', msg, 'WebSocketConnected', WebSocketConnected);

        if (WebSocketConnected) {
            //console.log('sendWSS - socket.send');
            socket.send(JSON.stringify(msg));
        }
    } catch (error) {
        //console.log('ERROR func: sendWSS', error);
    }

}

function updateSubscribeWSS() {
    console.log('updateSubscribeWSS', auth);
    sendWSS('unsubscribeAll');

    subscriptions.forEach((topic) => {
        sendWSS('subscribe', topic);
    });

}

function clearSubscribeWSS() {
    console.log('clearSubscribeWSS', auth);
    sendWSS('unsubscribeAll');
    subscriptions = [];
}

function addSubscribeWSS(topic) {
    console.log('addSubscribeWSS', auth, topic);
    subscriptions.push(topic);
    subscriptions = [...new Set(subscriptions)];
    sendWSS('subscribe', topic);
}

function reconectWebSocket() {
    console.log('reconectWebSocket', auth);

    //console.log('reconectWebSocket');
    disconectWebSocket();
}

function disconectWebSocket() {
    try {
        socket.close();
    } catch (error) {

    }
}

function connectWebSocket(from = 'none') {
    console.log('start connectWebSocket', from, firstConnection, auth, socket);

    try {
        if (auth) {
            if (WebSocketConnected) {
                // disconectWebSocket();
                console.log('Websocket already connected, return');
                return;
            }

            //console.log('new WebSocket');
            socket = new WebSocket("wss://" + window.location.host);

            socket.addEventListener('open', function (event) {
                console.log("wss - open");
                $('#logo').removeClass('noColorImg');
                WebSocketConnected = true;

                if (!firstConnection) {
                    toastr.clear();
                    //toastr.success("Connected");
                }

                firstConnection = false;
                sendWSS('new', user, $.cookie("token"));
                updateSubscribeWSS();
            });

            socket.addEventListener('message', function (event) {
                //console.log('Message from server: ' + event.data);

                //toastr["info"]('WSS', event.data);

                try {
                    const msgData = JSON.parse(event.data);
                    console.log('msgData', msgData);

                    if (msgData.topic === 'notification') {
                        if (msgData.type === "error") {
                            toastr.options.positionClass = 'toast-center-error';
                            toastr.options.timeOut = 10000;
                        }

                        toastr[msgData.type](msgData.text, msgData.title);
                        toastr.options.positionClass = 'toast-top-left';
                        toastr.options.timeOut = 3000;
                        $('#overlay').fadeOut();
                    } else {
                        callbackWSS(msgData);
                    }
                } catch (error) {
                    //console.log(error);
                }
            });

            socket.addEventListener('close', function (event) {
                console.log("wss - close");
                $('#logo').addClass('noColorImg');
                WebSocketConnected = false;

                toastr.clear();
                //toastr["error"]('Disconnected');
                // При разрыве связи запускаем повторное подключение через некоторое время
                console.log('addEventListener close setTimeout connectWebSocket')
                setTimeout(connectWebSocket, 3000); // Повторное подключение через 3 секунды
            });

        } else {
            console.log('else setTimeout connectWebSocket')
            setTimeout(connectWebSocket, 3000); // Повторное подключение через 3 секунды
        }
    } catch (error) {

    }
}

connectWebSocket();
