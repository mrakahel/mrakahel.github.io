
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
async function connect() {
    let options = {};

    //options.acceptAllDevices = true;
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
    if(text === "") return;
    //alert("bluetoothDevice:"+bluetoothDevice+" connected:"+bluetoothDevice.gatt.connected+" characteristic:"+characteristic);
    if (!bluetoothDevice || !bluetoothDevice.gatt.connected || !characteristic) return ;
    var text = document.querySelector("#message").value;
    //  alert(text);
    var arrayBuf = new TextEncoder().encode(text);
    try{
        const response = await characteristic.writeValueWithoutResponse(arrayBuf);
        clearText();
    }catch(error){
        alert('send failed');
    }

}

//BLE切断処理
function disconnect() {
    if (!bluetoothDevice || !bluetoothDevice.gatt.connected){
        console.log("device", bluetoothDevice);
        return;
    } 
    bluetoothDevice.onGattServerDisconnected = undefined;
    bluetoothDevice.gatt.disconnect();
    bluetoothDevice = undefined;
    updateDevicename("None");
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

async function onAvailabilityChanged() {
    let availability = await navigator.bluetooth.getAvailability();
    if(!availability) {
        alert("Bluetooth not available");
        updateStatus("Disconnected");
    }
}

async function onGattServerDisconnected() {
    const maxretry = 3;
    updateStatus("Reconnecting...")
    for(let step = 0; step < maxretry; step++){
        if(await reconnect()) return;
    }
    updateStatus("Disconnected");
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

