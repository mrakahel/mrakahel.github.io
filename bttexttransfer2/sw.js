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
    return install(event);
});

const install = (event) => {
    return event.waitUntil(
      caches.open(CACHE_NAME)
        .then(function(cache) {
          urlsToCache.map(url => {
            return fetch(new Request(url)).then(response => {
              cache.put(url, response);
              return response;
            });
          })
        })
        .catch(function(err) {
          console.log(err);
        })
    );
  }

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
        return install(event);
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
