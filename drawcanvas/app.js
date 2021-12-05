//
// JavaScriptのグローバル変数群
//
  
let bluetoothDevice;
let characteristic;
let vercharacteristic;

const INK_SERVICE_UUID = 'b07ff626-4b78-0001-89e5-fae40ab7e07f';
const WRITE_CHARACTERISTIC_UUID = 'b07ff626-4b78-0004-89e5-fae40ab7e07f';
const VERSION_CHARACTERISTIC_UUID = 'b07ff626-4b78-0002-89e5-fae40ab7e07f';
const Command = { Draw: 0x02, Undo: 0x04, Redo: 0x06, Clear: 0x08 }; 
let status;

let CANVAS_SIZE;
let undoDataStack = [];
let redoDataStack = [];
let mouseDown = false;
let drawCount = 0;
let points = [];
let strokes = [];

const chunkCheckInterval = 50;
const maxchunk = 500;

//ボタンイベントリスナー
d3.select("#connect").on("click", connect);
d3.select("#disconnect").on("click", disconnect);


//デバイスに接続する
async function connect() {
    let options = {};

    options.filters = [
        {services: [INK_SERVICE_UUID]}
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
        service = await server.getPrimaryService(INK_SERVICE_UUID);
        console.log("service", service);
        chara = await service.getCharacteristic(VERSION_CHARACTERISTIC_UUID)
        vercharacteristic = chara;
        console.log("characteristic", chara);    
        chara = await service.getCharacteristic(WRITE_CHARACTERISTIC_UUID)
        characteristic = chara;
        console.log("characteristic", chara);
        //alert("BLE接続が完了しました。");
        updateStatus('Connected');
        
    }catch(error){
        console.log(error);
        updateStatus(error);
    }
}

$(function() {
    //
    // 画面読み込み時のロード処理
    //
    $(document).ready(function(){

        // キャンバスのサイズを設定
        $('#canvas').css('width', '600px');
        $('#canvas').css('height', '600px');

        // キャンバスの属性を設定
        canvas = document.getElementById('canvas');
        canvas.width = 600;
        canvas.height = 600;
        CANVAS_SIZE = canvas.clientWidth;

        // 描画開始 → 描画中 → 描画終了
        canvas.addEventListener('mousedown', startDraw, false);
        canvas.addEventListener('mousemove', drawing, false);
        canvas.addEventListener('mouseup', endDraw, false);
        canvas.addEventListener('touchstart', startDrawTouch, false);
        canvas.addEventListener('touchmove', drawingTouch, false);
        canvas.addEventListener('touchend', endDraw, false);
    });

    //
    // undo
    //
    $("#undo").click(async function() {
        if (!bluetoothDevice || !bluetoothDevice.gatt.connected){
            console.log("device", bluetoothDevice);
            return;
        }
        if (undoDataStack.length <= 0) {
            return;
        }

        canvas = document.getElementById('canvas');
        context = canvas.getContext('2d');
        redoDataStack.unshift(context.getImageData(0, 0, canvas.width, canvas.height));

        var imageData = undoDataStack.shift();
        context.putImageData(imageData, 0, 0);
        let buf = new ArrayBuffer(1);
        buf[0] = Command.Undo;
        // Send 
        let result = await sendData(Command.Undo, buf);
    });

    //
    // redo
    //
    $("#redo").click(async function() {
        if (!bluetoothDevice || !bluetoothDevice.gatt.connected){
            console.log("device", bluetoothDevice);
            return;
        }
        if (redoDataStack.length <= 0) {
            return;
        }

        canvas = document.getElementById('canvas');
        context = canvas.getContext('2d');
        undoDataStack.unshift(context.getImageData(0, 0, canvas.width, canvas.height));

        var imageData = redoDataStack.shift();
        context.putImageData(imageData, 0, 0);
        let buf = new ArrayBuffer(1);
        buf[0] = Command.Redo;
        // Send 
        let result = await sendData(Command.Redo, buf);
    });

    //
    // clear
    //
    $("#clear").click(async function() {
        if (!bluetoothDevice || !bluetoothDevice.gatt.connected){
            console.log("device", bluetoothDevice);
            return;
        }
        canvas = document.getElementById('canvas');
        context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        let buf = new ArrayBuffer(1);
        buf[0] = Command.Clear;
        // Send 
        let result = await sendData(Command.Clear, buf);
    });

});

function startDrawTouch(e){
    if(e.changedTouches.length > 1){
       return;
    }
    e.preventDefault();
    
    let touch = e.changedTouches[0];
    startDraw(touch);
}

function drawingTouch(e){
    if(e.changedTouches.length > 1){
       return;
    }
    e.preventDefault();
    let touch = e.changedTouches[0];
    drawing(touch);

}

//
// 描画開始
//
function startDraw(event){
    if (!bluetoothDevice || !bluetoothDevice.gatt.connected){
        console.log("device", bluetoothDevice);
        return;
    }
    // 描画前処理をおこないマウス押下状態にする。
    beforeDraw();
    mouseDown = true;

    // クライアント領域からマウス開始位置座標を取得
    wbound = event.target.getBoundingClientRect() ;
    stX = event.clientX - wbound.left;
    stY = event.clientY - wbound.top;

    // キャンバス情報を取得
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");

    drawCount++;
}

//
// 描画前処理
//
function beforeDraw() {

    // undo領域に描画情報を格納
    redoDataStack = [];
    points = [];
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    undoDataStack.unshift(context.getImageData(0, 0, canvas.width, canvas.height));

}

//
// 描画中処理
//
async function drawing(event){

    // マウスボタンが押されていれば描画中と判断
    if (mouseDown){
        let x = event.clientX - wbound.left;
        let y = event.clientY - wbound.top;
        points.push({X: x, Y: y});
        draw(x, y);
    }
}

const uint16ToUint8Array = (num) => {
	const uint8Array = new Uint8Array(2);
    uint8Array[1] = (num & 0xff00) >> 8;
    uint8Array[0] =  num & 0x00ff;
    return uint8Array;
};

//
// 描画終了
//
async function endDraw(event){

    // マウスボタンが押されていれば描画中と判断
    if (mouseDown){
        context.globalCompositeOperation = 'source-over';
        context.setLineDash([]);
        mouseDown = false;
    }

    let header = Command.Draw;
    let buf = new Uint8Array(points.length * 2 * 2);
    for(let i=0; i<points.length; i++){
        buf.set(uint16ToUint8Array(points[i].X), i*4);
        buf.set(uint16ToUint8Array(points[i].Y), (i*4)+2);
    }
    // Send 
    let result = await sendData(header, buf);

}

//
// 描画
//
function draw(x, y){
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    context.beginPath();
    context.strokeStyle = "black";
    context.fillStyle = "black";
    context.lineWidth = 5;
    context.lineCap = "round";

    context.globalCompositeOperation = 'source-over';
    context.moveTo(stX,stY);
    context.lineTo(x,y);
    context.stroke();
    stX = x;
    stY = y;

    update(x, y);
}

function update(x, y){
    let span = document.getElementById("count");
    let x_span = document.getElementById("x");
    let y_span = document.getElementById("y");
    span.textContent = drawCount;
    x_span.textContent = x;
    y_span.textContent = y;
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

async function sendData(header, buf) {
    let readidx = 0;
    let senddata;
    let chunkCnt = 0;
    header = header | 0x80;
    
    while(readidx < buf.byteLength){
        while(chunkCnt < chunkCheckInterval && readidx < buf.byteLength){
            let arr;
            //if(cancelreq){
            //    return false;
            //}
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
    if(bluetoothDevice) {
        updateStatus("Reconnecting...")
        for(let step = 0; step < maxretry; step++){
            if(await reconnect()) return;
        }
    }
    updateStatus("Disconnected");
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
    navigator.bluetooth.onavailabilitychanged = onAvailabilityChanged;
});
