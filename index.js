const express = require("express");
const app = express();
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const P = require("pino");
const QRCode = require("qrcode");

const PORT = process.env.PORT || 3000;
let lastQR = "";

app.get("/", (req,res)=> {
  if(!lastQR) return res.send("KingRed V1 is Online ✅<br><br>Waiting for QR... refresh in 5 seconds. Or check Render logs.");
  res.send(`<h2>KingRed V1 - Scan QR</h2><img src="${lastQR}"><br><p>Open WhatsApp > Linked Devices > Link Device > Scan</p>`);
});

app.listen(PORT, ()=> console.log("Web on "+PORT));

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({ logger: P({ level: "silent" }), auth: state });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async (u)=>{
    if(u.qr){
      lastQR = await QRCode.toDataURL(u.qr);
      console.log("New QR generated - check website!");
    }
    if(u.connection==="open") console.log("Connected!");
  });
}
start();
