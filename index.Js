const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const P = require("pino");
const qrcode = require("qrcode-terminal");

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({
    logger: P({ level: "silent" }),
    printQRInTerminal: true,
    auth: state
  });
  sock.ev.on("creds.update", saveCreds);
  console.log("King Red V1 started - scan QR");
}
start();
