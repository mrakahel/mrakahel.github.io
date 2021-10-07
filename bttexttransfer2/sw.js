var CACHE_NAME  = "texttransfer";
var urlsToCache = [
    "index.html",
    "https://cdnjs.cloudflare.com/ajax/libs/d3/4.3.0/d3.min.js",
    "style.css",
    "app.js",
    "/favicon.ico"
];
const CACHE_KEYS = [
    CACHE_NAME
  ];

self.addEventListener('install', event => {
    console.log(`install`);
    event.waitUntil(
        caches.open(CACHE_NAME) // 上記で指定しているキャッシュ名
          .then(
          function(cache){
              return cache.addAll(urlsToCache); // 指定したリソースをキャッシュへ追加
              // 1つでも失敗したらService Workerのインストールはスキップされる
          })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
      caches.keys().then(keys => {
        return Promise.all(
          keys.filter(key => {
            return !CACHE_KEYS.includes(key);
          }).map(key => {
            // 不要なキャッシュを削除
            return caches.delete(key);
          })
        );
      })
    );
  });

self.addEventListener('fetch', event => {
    console.log(`fetch`);
    var online = navigator.onLine;

    //回線が使えるときの処理
    if(online){
        console.log(`online`);
        event.respondWith(
            caches.match(event.request)
                .then(
                function (response) {
                //if (response) {
                //    return response;
                //}
                return fetch(event.request)
                    .then(function(response){
                        //cloneRequest = request.clone();
                        cloneResponse = response.clone();
                        if(response){
                            if(response || response.status == 200){
                                //キャッシュに追加
                                caches.open(CACHE_NAME)
                                    .then(function(cache)
                                    {
                                    cache.put(event.request, cloneResponse)
                                        .then(function(){
                                            //正常にキャッシュ追加できたときの処理(必要であれば)
                                            console.log(`cache added`);
                                        });
                                    });
                            }else{
                                //正常に取得できなかったときにハンドリングしてもよい
                                console.log(`cache failed`);
                                return response;
                            }
                            return response;
                        }
                    }).catch(function(error) {
                        //デバッグ用
                        return console.log(error);
                    });
                }
            )
        );
    }else{
        //オフラインのときの制御
        console.log(`offline`);
        event.respondWith(
        caches.match(event.request)
            .then(function(response) {
            // キャッシュがあったのでそのレスポンスを返す
            if (response) {
                return response;
            }
            //オフラインでキャッシュもなかったパターン
            return caches.match("index.html")
                .then(function(responseNodata)
                {
                    return responseNodata;
                });
            }
        )
        );
    }
});
