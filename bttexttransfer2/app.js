  
var bluetoothDevice;
var characteristic;
var vercharacteristic;

var TEXT_SERVICE_UUID = 'b07ff626-4b79-0001-89e5-fae40ab7e07f';
var TEXT_CHARACTERISTIC_UUID = 'b07ff626-4b79-0004-89e5-fae40ab7e07f';
var VERSION_CHARACTERISTIC_UUID = 'b07ff626-4b79-0002-89e5-fae40ab7e07f';

var status;
var cancelreq = false;

//ボタンイベントリスナー
d3.select("#connect").on("click", connect);
d3.select("#disconnect").on("click", disconnect);
//d3.select("#reconnect").on("click", reconnect);
d3.select("#send").on("click", sendMessage);
d3.select("#sendfile").on("click", sendFile);
d3.select("#closeModal").on("click", sendCancel);


var textArea = document.getElementById("message");
var targetFile;

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
    let text = document.querySelector("#message").value;
    if(text === "") return;
    if (!bluetoothDevice || !bluetoothDevice.gatt.connected || !characteristic) return ;

    document.querySelector("#message").disabled = true;
    document.querySelector("#send").disabled = true;
    $('.modal').show();
    $('.overlay').show();
    const arrayBuf = new TextEncoder().encode(text);

    try{
        // text data
        let header = 0x10;
        let result = await sendData(header, arrayBuf);
        if(result){
            clearText();
            onTextChange();    
        }
    }catch(error){
        alert(error);
    }
    document.querySelector("#message").disabled = false;
    document.querySelector("#send").disabled = false;
    $('.modal').hide();
    $('.overlay').hide();
}

//ファイルを送信
async function sendFile() {
    if(typeof(myFile) === undefined) return;
    if (!bluetoothDevice || !bluetoothDevice.gatt.connected || !characteristic) return ;
    cancelreq = false;
    document.querySelector("#message").disabled = true;
    document.querySelector("#send").disabled = true;
    document.querySelector("#myfile").disabled = true;
    document.querySelector("#sendfile").disabled = true;
    $('.modal').show();
    $('.overlay').show();
    const reader = new FileReader();
    reader.onload = async () => {
        const arrayBuf = reader.result;
        try{
            // file name
            let header = 0x20;
            const buf = new TextEncoder().encode(targetFile.name);
            let result = await sendData(header, buf);
            // file data
            header = 0x30;
            result = await sendData(header, arrayBuf);
            if(result){
                const f = document.getElementById('myfile');
                f.value = '';
            }
        }catch(error){
            alert(error);
        }
        document.querySelector("#message").disabled = false;
        document.querySelector("#send").disabled = false;
        document.querySelector("#myfile").disabled = false;
        document.querySelector("#sendfile").disabled = false;
        $('.modal').hide();
        $('.overlay').hide();
    };
    reader.readAsArrayBuffer(targetFile);
}

async function sendData(header, buf) {
    const maxchunk = 500;
    const chunkCheckInterval = 100;
    let readidx = 0;
    let senddata;
    let chunkCnt = 0;
    let progress = 0;
    header = header | 0x80;
    while(readidx < buf.byteLength){
        progress = Math.floor(readidx*100/buf.byteLength);
        progress = progress > 100 ? 100 : progress;
        $('.ldBar').set(progress);
        while(chunkCnt < chunkCheckInterval && readidx < buf.byteLength){
            let arr;
            if(cancelreq){
                return false;
            }
            if(readidx+maxchunk < buf.byteLength){
                // 継続データあり
                arr = new Uint8Array(maxchunk+1);
                arr.set(new Int8Array(buf.slice(readidx, readidx+maxchunk)), 1);
                arr[0] = header | 0x01;
                senddata = arr;
            }else{
                // 継続データなし
                arr = new Uint8Array(buf.byteLength-readidx+1)
                arr.set(new Int8Array(buf.slice(readidx, buf.byteLength)), 1);
                arr[0] = header & 0xfe;
                senddata = arr;
            }
            readidx += maxchunk; 
            await characteristic.writeValueWithResponse(senddata);
            header = header & 0x7f;
            chunkCnt++;
        }

        chunkCnt = 0;
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
    const f = document.getElementById('myfile');
    f.addEventListener('change', evt => {
        targetFile = evt.target.files[0];
    });
    navigator.bluetooth.onavailabilitychanged = onAvailabilityChanged;
});
