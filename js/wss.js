let socket;
let firstConnection = true;
let WebSocketConnected = false;
let callbackWSS;

function sendWSS(action = '', topic = '', payload = '') {
    try {
        const msg = {action:action, topic:topic, payload:payload, user:user};
        //console.log('sendWSS', msg, 'WebSocketConnected', WebSocketConnected);

        if (WebSocketConnected) {
            console.log('sendWSS - socket.send');
            socket.send(JSON.stringify(msg));
        }
    } catch (error) {
        console.log('ERROR func: sendWSS', error);
    }
    
}

function updateSubscribeWSS(){
    sendWSS('unsubscribeAll');

    subscriptions.forEach((topic) => {
        sendWSS('subscribe', topic);
    });

}

function clearSubscribeWSS(){
    sendWSS('unsubscribeAll');
    subscriptions = [];
}

function addSubscribeWSS(topic){
    subscriptions.push(topic);
    subscriptions = [...new Set(subscriptions)];
    sendWSS('subscribe', topic);
    console.log('addSubscribeWSS', topic, subscriptions);
}

function reconectWebSocket() {
    console.log('reconectWebSocket');
    disconectWebSocket();
    //connectWebSocket('reconectWebSocket');
}

function disconectWebSocket() {
    console.log('disconectWebSocket');
    try {
        socket.close();
    } catch (error) {
        
    }
}

function connectWebSocket(from = 'none') {
    console.log('start connectWebSocket', from, firstConnection, auth, socket);

    try {
        if (auth) {
            if(WebSocketConnected){
                disconectWebSocket();
            }

            console.log('new WebSocket');
            socket = new WebSocket("wss://" + window.location.host);

            socket.addEventListener('open', function(event) {
                console.log("wss - open");
                $('#logo').removeClass('noColorImg');
                WebSocketConnected = true;

                if(!firstConnection){
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
                        toastr[msgData.type](msgData.text, msgData.title);    
                    } else {
                        callbackWSS(msgData);
                    }
                } catch (error) {
                    console.log(error);
                }
            });

            socket.addEventListener('close', function(event) {
                console.log("wss - close");
                $('#logo').addClass('noColorImg');
                WebSocketConnected = false;

                toastr.clear();
                //toastr["error"]('Disconnected');
                // При разрыве связи запускаем повторное подключение через некоторое время
                setTimeout(connectWebSocket, 3000); // Повторное подключение через 3 секунды
            });

        }else{
            setTimeout(connectWebSocket, 3000); // Повторное подключение через 3 секунды
        }
    } catch (error) {
            
    }
}

connectWebSocket();
