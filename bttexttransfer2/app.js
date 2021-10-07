  
var bluetoothDevice;
var characteristic;

var TEXT_SERVICE_UUID = 'b07ff626-4b79-0001-89e5-fae40ab7e07f';
var TEXT_CHARACTERISTIC_UUID = 'b07ff626-4b79-0004-89e5-fae40ab7e07f';

var status;

//ボタンイベントリスナー
d3.select("#connect").on("click", connect);
d3.select("#disconnect").on("click", disconnect);
d3.select("#reconnect").on("click", reconnect);
d3.select("#send").on("click", sendMessage);

var textArea = document.getElementById("message");

//デバイスに接続する
async function connect() {
    let options = {};

    options.filters = [
        {services: [TEXT_SERVICE_UUID]}
    ];

    updateStatus('Connecting...');

    let server;
    let service;
    let chara;
    try{
        bluetoothDevice = await navigator.bluetooth.requestDevice(options)
        console.log("device", bluetoothDevice);
        updateDevicename(bluetoothDevice.name);
        bluetoothDevice.ongattserverdisconnected = onGattServerDisconnected;
        server = bluetoothDevice.gatt.connect();
    
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
        //alert("BLE接続が完了しました。");
        updateStatus('Connected');
        characteristic = chara;    
    }catch(error){
        console.log(error);
        updateStatus(error);
    }
}

//メッセージを送信
async function sendMessage() {
    const maxchunk = 200;
    let text = document.querySelector("#message").value;
    if(text === "") return;
    if (!bluetoothDevice || !bluetoothDevice.gatt.connected || !characteristic) return ;

    document.querySelector("#message").disabled = true;
    const arrayBuf = new TextEncoder().encode(text);
    try{
        let i = 0;
        let senddata;
        let response;
        while(i < arrayBuf.length){
            let arr;
            if(i+maxchunk < arrayBuf.length){
                arr = new Uint8Array(maxchunk+1);
                arr.set(arrayBuf.slice(i, i+maxchunk), 1);
                arr[0] = 1;
                senddata = arr;
            }else{
                arr = new Uint8Array(arrayBuf.length-i+1)
                arr.set(arrayBuf.slice(i, arrayBuf.length), 1);
                arr[0] = 0;
                senddata = arr;
            }
            i += maxchunk; 
            response = await characteristic.writeValueWithoutResponse(senddata);
        }
        clearText();
    }catch(error){
        alert(error);
    }
    document.querySelector("#message").disabled = false;
}

//BLE切断処理
function disconnect() {
    if (!bluetoothDevice || !bluetoothDevice.gatt.connected){
        console.log("device", bluetoothDevice);
        return;
    } 
    bluetoothDevice.onGattServerDisconnected = "";
    bluetoothDevice.gatt.disconnect();
    bluetoothDevice = undefined;
    updateDevicename("");
    updateStatus("Disconnected");
    //alert("BLE接続を切断しました。");
}

async function reconnect() {
    if (!bluetoothDevice) {
        console.log("device is undefined");
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
        updateStatus('Connected');
        characteristic = chara; 
        return true;   
    }catch(error){
        console.log(error);
        updateStatus(error);
    }
    return false;
}

function updateStatus(state) {
    let elm = document.getElementById('status');
    elm.textContent = state;
}

function updateDevicename(name) {
    let elm = document.getElementById('devicename');
    elm.textContent = name;
}

function clearText() {
    document.querySelector("#message").value = "";
}

function updateProgress(progress) {
    let rate = progress / 100;
    let elm = document.getElementById('progress');
    elm.textContent =  progress + "%";
    bar.animate(rate);
}

async function onAvailabilityChanged() {
    let availability = await navigator.bluetooth.getAvailability();
    if(!availability) {
        alert("Bluetooth not available");
        updateStatus("Disconnected");
    }
}

async function onGattServerDisconnected() {
    const maxretry = 3;
    if(bluetoothDevice) {
        updateStatus("Reconnecting...")
        for(let step = 0; step < maxretry; step++){
            if(await reconnect()) return;
        }
    }
    updateStatus("Disconnected");
}

function onTextChange() {
    const len = document.querySelector("#message").value.length;
    document.querySelector("#textCnt").textContent = len;    
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
    textArea.oninput = onTextChange;

    navigator.bluetooth.onavailabilitychanged = onAvailabilityChanged;
});
