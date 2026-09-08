# TikTok LIVE Aslan Yarışı

Bu proje, ekrandaki tasarıma benzer bir yarış ekranı oluşturur:
- Sayfa açılınca TikTok kullanıcı adı ister.
- Node.js sunucusu TikTok LIVE Webcast verisine bağlanır.
- Hediyeler gerçek zamanlı alınır.
- Hediye `elmas × tekrar sayısı` puana çevrilir.
- Puan ilgili aslanın ilerlemesini sağlar.
- İzleyici sayısı ve son hediyeler gösterilir.
- `DEMO` düğmesi gerçek yayın olmadan ekranı test eder.

## Kurulum

Node.js 20+ gerekir.

```bash
npm install
npm start
```

Sonra tarayıcıdan:

`http://localhost:3000`

## Hediye → aslan eşleştirme

`server.js` içindeki `GIFT_TO_LANE` alanını düzenleyebilirsin:

```js
const GIFT_TO_LANE = {
  "Rose": 0,
  "Heart": 1,
  "Lion": 2,
  "GG": 3,
  "TikTok": 4
};
```

0 = Aslan 1, 1 = Aslan 2 ... 4 = Aslan 5.

Eşleştirilmemiş hediyeler varsayılan olarak `giftId % 5` ile bir aslana gider.

## Önemli

Saf bir HTML dosyası TikTok LIVE Webcast bağlantısını güvenilir şekilde doğrudan tarayıcıdan yapamaz. Bu nedenle HTML + Node.js backend birlikte kullanılıyor.

Kullanılan `tiktok-live-connector` resmi TikTok API'si değildir; TikTok'un Webcast akışını tersine mühendislik ile okuyan açık kaynak bir Node.js kütüphanesidir. TikTok protokolü değişirse proje güncelleme gerektirebilir.
