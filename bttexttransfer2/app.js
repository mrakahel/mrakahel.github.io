  
var bluetoothDevice;
var characteristic;
var vercharacteristic;

var TEXT_SERVICE_UUID = 'b07ff626-4b79-0001-89e5-fae40ab7e07f';
var TEXT_CHARACTERISTIC_UUID = 'b07ff626-4b79-0004-89e5-fae40ab7e07f';
var VERSION_CHARACTERISTIC_UUID = 'b07ff626-4b79-0002-89e5-fae40ab7e07f';

var status;

//ボタンイベントリスナー
d3.select("#connect").on("click", connect);
d3.select("#disconnect").on("click", disconnect);
//d3.select("#reconnect").on("click", reconnect);
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
        chara = await service.getCharacteristic(VERSION_CHARACTERISTIC_UUID)
        vercharacteristic = chara;
        console.log("characteristic", chara);    
        chara = await service.getCharacteristic(TEXT_CHARACTERISTIC_UUID)
        characteristic = chara;
        console.log("characteristic", chara);
        //alert("BLE接続が完了しました。");
        updateStatus('Connected');
    }catch(error){
        console.log(error);
        updateStatus(error);
    }
}

//テキストメッセージを送信
async function sendMessage() {
    const maxchunk = 200;
    let text = document.querySelector("#message").value;
    if(text === "") return;
    if (!bluetoothDevice || !bluetoothDevice.gatt.connected || !characteristic) return ;

    document.querySelector("#message").disabled = true;
    document.querySelector("#send").disabled = true;
    const arrayBuf = new TextEncoder().encode(text);

    try{
        // frame cnt
        let header = 0x00;
        let result = await sendData(header, bigUIntToBuffer(arrayBuf.byteLength))

        // text data
        header = 0x10;
        result = await sendData(header, arrayBuf);
        if(result){
            clearText();
            onTextChange();    
        }
    }catch(error){
        alert(error);
    }
    document.querySelector("#message").disabled = false;
    document.querySelector("#send").disabled = false;
}

function bigUIntToBuffer(big) {
    const bit32 = 4294967296;
    let arr = new Uint8Array(8);
    if(big > bit32) {
        let uint = new BigUint64Array(1)
        uint[0] = big;
        arr = uint.buffer;
    }else{
        let uint = new Uint32Array(1)
        uint[0] = big;
        arr.set(uint.buffer, 8);
    }
    return arr.buffer;
}

async function sendData(header, buf) {
    const maxchunk = 200;
    const chunkCheckInterval = 100;
    try{
        let readidx = 0;
        let senddata;
        let response;
        let isSuccess = false;
        let chunkCnt = 0;
        
        header = header | 0x80;
        while(readidx < buf.length){
            while(chunkCnt < chunkCheckInterval){
                let arr;
                if((readidx+1)*maxchunk < buf.length){
                    // 継続データあり
                    arr = new Uint8Array(maxchunk+1);
                    arr.set(buf.slice(readidx, readidx+maxchunk), 1);
                    arr[0] = header | 0x01;
                    senddata = arr;
                }else{
                    // 継続データなし
                    arr = new Uint8Array(buf.length-readidx+1)
                    arr.set(buf.slice(readidx, buf.length), 1);
                    arr[0] = header & 0xfe;
                    senddata = arr;
                }
                readidx += maxchunk; 
                await characteristic.writeValueWithResponse(senddata);
                header = header & 0x7f;
                chunkCnt++;
            }
            // retry max5回
//            for(let step = 0; step < 5; step++){ 
//                response = await characteristic.writeValueWithResponse(senddata);
//                if(response == chunkCnt){
//                    isSuccess = true;
//                    break;
//                }
//            }
            if(!isSuccess){
                return false;
            }
            isSuccess = false;
            chunkCnt = 0;
        }
    }catch(error){
        return false;
    }
    return true;
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
    const b = document.querySelector("#message").value.bytes();
    document.querySelector("#textByte").textContent = b;    
}

String.prototype.bytes = function () {
    return(encodeURIComponent(this).replace(/%../g,"x").length);
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
