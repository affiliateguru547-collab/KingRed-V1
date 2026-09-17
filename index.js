const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const P = require("pino");
const config = require("./config");

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({
    logger: P({ level: "silent" }),
    printQRInTerminal: true,
    auth: state,
    syncFullHistory: false,
    markOnlineOnConnect: false
  });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
    if (!text.startsWith(config.prefix)) return;
    const cmd = text.slice(1).toLowerCase();
    if (cmd === "owner") {
      await sock.sendMessage(m.key.remoteJid, { text: `👑 *${config.name}*\nOwner: ${config.ownerName}\nCompany: ${config.company}\nNumber: +${config.number}` });
    }
    if (cmd === "ping") {
      await sock.sendMessage(m.key.remoteJid, { text: "⚡ King Red is alive! Fast!" });
    }
  });
}
start();
