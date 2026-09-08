const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebcastPushConnection } = require("tiktok-live-connector");

const PORT = process.env.PORT || 3000;

let connection = null;
let currentUsername = null;
const clients = new Set();

// Hediye -> aslan eşleştirmesi.
// 0 = Aslan 1, 1 = Aslan 2, ... 4 = Aslan 5.
// Buraya isim eklediğinde o hediye doğrudan seçtiğin aslana gider.
const GIFT_TO_LANE = {
  // "Rose": 0,
  // "Heart": 1,
  // "Lion": 2,
  // "GG": 3,
  // "TikTok": 4
};

function send(res, data) {
  try {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {}
}

function broadcast(data) {
  for (const res of clients) send(res, data);
}

async function connectTikTok(username) {
  const clean = String(username || "").replace(/^@/, "").trim();
  if (!clean) throw new Error("TikTok kullanıcı adı boş.");

  if (connection) {
    try { connection.disconnect(); } catch {}
    connection = null;
  }

  connection = new WebcastPushConnection(clean, {
    processInitialData: true,
    enableExtendedGiftInfo: true,
    fetchRoomInfoOnConnect: true
  });

  currentUsername = clean;

  connection.on("connected", (state) => {
    console.log(`TikTok LIVE bağlandı: @${clean}, roomId=${state.roomId}`);
    broadcast({ type: "connected", username: clean, roomId: state.roomId });
  });

  connection.on("disconnected", () => {
    console.log("TikTok LIVE bağlantısı kesildi.");
    broadcast({ type: "disconnected" });
  });

  connection.on("error", (err) => {
    console.error("TikTok error:", err);
    broadcast({ type: "error", message: err && err.message ? err.message : String(err) });
  });

  connection.on("gift", (data) => {
    // Streak hediyelerinde aynı hediyeyi her ara tekrar saymamak için
    // sadece final event'i işliyoruz.
    if (data.giftType === 1 && !data.repeatEnd) return;

    const giftName =
      (data.giftDetails && data.giftDetails.giftName) ||
      data.giftName ||
      `Gift ${data.giftId || ""}`;

    const diamonds = Number(
      (data.giftDetails && data.giftDetails.diamondCount) ||
      data.diamondCount ||
      1
    );

    const repeatCount = Math.max(1, Number(data.repeatCount || 1));

    let laneIndex = GIFT_TO_LANE[giftName];

    // Özel eşleştirme yoksa giftId'ye göre 5 aslandan birine dağıt.
    if (!Number.isInteger(laneIndex)) {
      laneIndex = Number(data.giftId || 0) % 5;
    }

    broadcast({
      type: "gift",
      giftId: data.giftId || 0,
      giftName,
      diamonds: Number.isFinite(diamonds) ? diamonds : 1,
      repeatCount,
      laneIndex,
      user:
        (data.user && (data.user.uniqueId || data.user.nickname)) || ""
    });
  });

  connection.on("roomUser", (data) => {
    const count = Number(data.viewerCount);
    if (Number.isFinite(count)) {
      broadcast({ type: "viewer", count });
    }
  });

  try {
    await connection.connect();
  } catch (err) {
    broadcast({
      type: "error",
      message: err && err.message ? err.message : String(err)
    });
    throw err;
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });

    res.write(": connected\n\n");
    clients.add(res);

    if (currentUsername) {
      send(res, { type: "connected", username: currentUsername });
    }

    req.on("close", () => clients.delete(res));
    return;
  }

  if (req.method === "POST" && url.pathname === "/connect") {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body || "{}");
        await connectTikTok(data.username);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          ok: true,
          username: currentUsername
        }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          ok: false,
          error: err && err.message ? err.message : String(err)
        }));
      }
    });

    return;
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    const html = fs.readFileSync(path.join(__dirname, "index.html"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`TikTok Lion Race running on port ${PORT}`);
});
