//
// JavaScriptのグローバル変数群
//
let CANVAS_SIZE;
let undoDataStack = [];
let redoDataStack = [];
let mouseDown = false;
let drawCount = 0;

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
    $("#undo").click(function() {

        if (undoDataStack.length <= 0) {
            return;
        }

        canvas = document.getElementById('canvas');
        context = canvas.getContext('2d');
        redoDataStack.unshift(context.getImageData(0, 0, canvas.width, canvas.height));

        var imageData = undoDataStack.shift();
        context.putImageData(imageData, 0, 0);
    });

    //
    // redo
    //
    $("#redo").click(function() {

        if (redoDataStack.length <= 0) {
            return;
        }

        canvas = document.getElementById('canvas');
        context = canvas.getContext('2d');
        undoDataStack.unshift(context.getImageData(0, 0, canvas.width, canvas.height));

        var imageData = redoDataStack.shift();
        context.putImageData(imageData, 0, 0);
    });
});

function startDrawTouch(e){
    if(e.changedTouches.length > 1){
       return;
    }
    e.preventDefault();
    // 描画前処理をおこないマウス押下状態にする。
    beforeDraw();
    mouseDown = true;

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
    // Send 
}

//
// 描画前処理
//
function beforeDraw() {

    // undo領域に描画情報を格納
    redoDataStack = [];
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    undoDataStack.unshift(context.getImageData(0, 0, canvas.width, canvas.height));

}

//
// 描画中処理
//
function drawing(event){

    // マウスボタンが押されていれば描画中と判断
    if (mouseDown){
        x = event.clientX - wbound.left;
        y = event.clientY - wbound.top;
        draw(x, y);
    
        // Send 
    }
}

//
// 描画終了
//
function endDraw(event){

    // マウスボタンが押されていれば描画中と判断
    if (mouseDown){
        context.globalCompositeOperation = 'source-over';
        context.setLineDash([]);
        mouseDown = false;
    }

    // Send 
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