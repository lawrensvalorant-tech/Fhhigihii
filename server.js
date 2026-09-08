import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from "tiktok-live-connector";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

let connection = null;
let currentUsername = null;
const clients = new Set();

// İstersen burada belirli hediyeleri belirli aslanlara bağlayabilirsin.
// Örnek: "Rose": 0, "Heart": 1, "Lion": 2
const GIFT_TO_LANE = {
  // "Rose": 0,
  // "Heart": 1,
  // "Lion": 2,
  // "TikTok": 3,
  // "GG": 4,
};

function send(client, payload) {
  client.write(`data: ${JSON.stringify(payload)}\n\n`);
}
function broadcast(payload) {
  for (const client of clients) send(client, payload);
}

async function connectTikTok(username) {
  if (connection) {
    try { await connection.disconnect(); } catch {}
    connection = null;
  }

  const clean = username.replace(/^@/, "").trim();
  if (!clean) throw new Error("Kullanıcı adı boş.");

  connection = new TikTokLiveConnection(clean, {
    enableExtendedGiftInfo: true,
    processInitialData: true,
    fetchRoomInfoOnConnect: true
  });
  currentUsername = clean;

  connection.on(ControlEvent.CONNECTED, () => {
    broadcast({type:"connected", username: clean});
    console.log(`Connected: @${clean}`);
  });

  connection.on(ControlEvent.DISCONNECTED, () => {
    broadcast({type:"disconnected"});
    console.log(`Disconnected: @${clean}`);
  });

  connection.on(ControlEvent.ERROR, (err) => {
    console.error("TikTok error:", err);
    broadcast({type:"error", message: err?.message || String(err)});
  });

  connection.on(WebcastEvent.GIFT, (data) => {
    // giftType=1 streak hediyelerinde sadece final repeatEnd eventini sayıyoruz.
    if (data?.giftDetails?.giftType === 1 && !data.repeatEnd) return;

    const giftName = data?.giftDetails?.giftName || data?.giftName || `Gift ${data?.giftId ?? ""}`;
    const diamonds = Number(
      data?.giftDetails?.diamondCount ??
      data?.diamondCount ??
      data?.extendedGiftInfo?.diamond_count ??
      1
    );
    const repeatCount = Math.max(1, Number(data?.repeatCount ?? 1));
    const mapped = GIFT_TO_LANE[giftName];
    const laneIndex = Number.isInteger(mapped)
      ? mapped
      : Number(data?.giftId ?? 0) % 5;

    broadcast({
      type:"gift",
      giftId: data?.giftId ?? 0,
      giftName,
      diamonds: Number.isFinite(diamonds) ? diamonds : 1,
      repeatCount,
      laneIndex,
      user: data?.user?.uniqueId || data?.user?.nickname || ""
    });

    console.log(`Gift: ${giftName} x${repeatCount}, diamonds=${diamonds}, lane=${laneIndex}`);
  });

  connection.on(WebcastEvent.ROOM_USER, (data) => {
    if (typeof data?.viewerCount === "number") {
      broadcast({type:"viewer", count:data.viewerCount});
    }
  });

  connection.on(WebcastEvent.STREAM_END, () => {
    broadcast({type:"ended"});
  });

  await connection.connect();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/events") {
    res.writeHead(200, {
      "Content-Type":"text/event-stream",
      "Cache-Control":"no-cache, no-transform",
      "Connection":"keep-alive",
      "Access-Control-Allow-Origin":"*"
    });
    res.write(": connected\n\n");
    clients.add(res);
    if (currentUsername) send(res, {type:"connected", username:currentUsername});
    req.on("close", () => clients.delete(res));
    return;
  }

  if (req.method === "POST" && url.pathname === "/connect") {
    let body="";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const {username} = JSON.parse(body || "{}");
        await connectTikTok(String(username || ""));
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ok:true, username:currentUsername}));
      } catch (e) {
        res.writeHead(400, {"Content-Type":"application/json"});
        res.end(JSON.stringify({ok:false, error:e?.message || String(e)}));
      }
    });
    return;
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    const html = fs.readFileSync(path.join(__dirname, "index.html"));
    res.writeHead(200, {"Content-Type":"text/html; charset=utf-8"});
    res.end(html);
    return;
  }

  res.writeHead(404, {"Content-Type":"text/plain; charset=utf-8"});
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`TikTok Lion Race: http://localhost:${PORT}`);
});
