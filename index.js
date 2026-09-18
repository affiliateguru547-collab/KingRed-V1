const express = require("express");
const app = express();
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const P = require("pino");
const qrcode = require("qrcode-terminal");

const PORT = process.env.PORT || 3000;
app.get("/", (req,res)=> res.send("KingRed V1 is Online ✅"));
app.listen(PORT, ()=> console.log("Web server on port "+PORT));

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({
    logger: P({ level: "silent" }),
    auth: state,
    printQRInTerminal: false
  });
  sock.ev.on("creds.update", saveCreds);
  
  sock.ev.on("connection.update", async (update)=>{
    const { connection, qr } = update;
    if(qr){
      console.log("SCAN THIS QR ON WHATSAPP:");
      qrcode.generate(qr, {small:true});
    }
    if(connection === "open") console.log("KingRed V1 Connected ✅");
  });
}
start();
