
//navigator.bluetooth.addEventListener('onavailabilitychanged', OnAvailabilityChanged);
  
var bluetoothDevice;
var characteristic;

var TEXT_SERVICE_UUID = 'b07ff626-4b79-0001-89e5-fae40ab7e07f';
var TEXT_CHARACTERISTIC_UUID = 'b07ff626-4b79-0004-89e5-fae40ab7e07f';
//var TEXT_SERVICE_UUID = '0000aaa0-0000-1000-8000-aabbccddeeff'
//var TEXT_CHARACTERISTIC_UUID = '0000aaa2-0000-1000-8000-aabbccddeeff';

var status;

//ボタンイベントリスナー
d3.select("#connect").on("click", connect);
d3.select("#disconnect").on("click", disconnect);
d3.select("#reconnect").on("click", reconnect);
d3.select("#send").on("click", sendMessage);


//デバイスに接続する
function connect() {
    let options = {};

    //options.acceptAllDevices = true;
    options.filters = [
        {services: [TEXT_SERVICE_UUID]}
    ];

    update_status('Connecting...');

    navigator.bluetooth.requestDevice(options)
    .then(device => {
        bluetoothDevice = device;
        console.log("device", device);
        bluetoothDevice.addEventListener('ongattserverdisconnected', onGattServerDisconnected);
        return device.gatt.connect();
    })
    .then(server =>{
        console.log("server", server);
        return server.getPrimaryService(TEXT_SERVICE_UUID);
    })
    .then(service => {
        console.log("service", service);
        return service.getCharacteristic(TEXT_CHARACTERISTIC_UUID)
    })
    .then(chara => {
        console.log("characteristic", chara);
        alert("BLE接続が完了しました。");
        update_status('Connected');
        characteristic = chara;
        
    })
    .catch(error => {
        console.log(error);
        update_status(error);
    });
}

//メッセージを送信
async function sendMessage() {
    if(text === "") return;
    //alert("bluetoothDevice:"+bluetoothDevice+" connected:"+bluetoothDevice.gatt.connected+" characteristic:"+characteristic);
    if (!bluetoothDevice || !bluetoothDevice.gatt.connected || !characteristic) return ;
    var text = document.querySelector("#message").value;
    //  alert(text);
    var arrayBuf = new TextEncoder().encode(text);
    try{
        const response = await characteristic.writeValueWithoutResponse(arrayBuf);
    }catch(error){
        alert('send failed');
    }
    clear_text();
}

//BLE切断処理
function disconnect() {
    if (!bluetoothDevice || !bluetoothDevice.gatt.connected){
        console.log("device", bluetoothDevice);
        return;
    } 
    bluetoothDevice.gatt.disconnect();
    alert("BLE接続を切断しました。");
}

async function reconnect() {
    if (!bluetoothDevice) {
        console.log("device is null");
        return;
    }
    console.log("device", bluetoothDevice);
    let server;
    let service;
    let chara;
    try{
        if(bluetoothDevice.gatt.connected){
            server = bluetoothDevice.gatt;
        }else{
            server = await bluetoothDevice.gatt.connect();
        }
        console.log("server", server);
        service = await server.getPrimaryService(TEXT_SERVICE_UUID);
        console.log("service", service);
        chara = await service.getCharacteristic(TEXT_CHARACTERISTIC_UUID)
        console.log("characteristic", chara);
        alert("BLE接続が完了しました。");
        update_status('Connected');
        characteristic = chara;    
    }catch(error){
        console.log(error);
        update_status(error);
    }
}

function update_status(state) {
    let elm = document.getElementById('status');
    elm.textContent = state;
}

function clear_text() {
    document.querySelector("#message").value = "";
}

async function onAvailabilityChanged() {
    let availability = await navigator.bluetooth.getAvailability();
    if(!availability) {
        alert("Bluetooth not available");
        update_status("Disconnected");
    }
}

function onGattServerDisconnected() {
    update_status("Disconnected (ongattserverdisconnected).");
}

window.addEventListener('load', async e => {
    if("serviceWorker" in navigator){
        try{
            navigator.serviceWorker.register('sw.js')
            .then(registratioin => {
                registratioin.onupdatefound = function() {
                    registratioin.update();
                }
            })
            console.log(`SW registered`);
        }catch(error){
            console.log(`SW not registered`);
        }
    }
    navigator.bluetooth.addEventListener('onavailabilitychanged', onAvailabilityChanged);
});

