# TikTok LIVE Aslan Yarışı — Euler gerektirmeyen sürüm

Bu sürüm `tiktok-live-connector@1.2.3` kullanır. Yeni sürümlerdeki Euler Stream imzalama akışını kullanmaz.

## Render

Build Command:
npm install

Start Command:
npm start

Node:
20+

## GitHub'a yükle

Bu paketteki şu 3 dosyayı GitHub reposundaki eski dosyaların üzerine yükle:
- package.json
- server.js
- index.html

Sonra Render'da Manual Deploy -> Deploy latest commit yap.

## Hediye eşleştirme

server.js içindeki:

const GIFT_TO_LANE = {
  "Rose": 0,
  "Heart": 1,
  "Lion": 2,
  "GG": 3,
  "TikTok": 4
};

0 Aslan 1, 1 Aslan 2, ... 4 Aslan 5 demektir.

Not: `tiktok-live-connector` resmi TikTok API'si değildir. TikTok Webcast protokolünü kullanan topluluk projesidir ve TikTok değişiklikleri nedeniyle zaman zaman güncelleme gerekebilir.
