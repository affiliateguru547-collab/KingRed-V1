const express = require("express");
const fs = require("fs");
const P = require("pino");
const { default: makeWASocket, useMultiFileAuthState, delay } = require("@whiskeysockets/baileys");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// Database for tokens
let DB = {};
if (fs.existsSync("./db.json")) {
  DB = JSON.parse(fs.readFileSync("./db.json"));
}
function saveDB() {
  fs.writeFileSync("./db.json", JSON.stringify(DB));
}
function generateToken() {
  const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `KINGRED-${part()}-${part()}`;
}
let ACTIVE_SOCKETS = {};

// CSS - Exact from video dark theme
const CSS = `
* { box-sizing: border-box; }
body { margin:0; background:#0a1120; color:#8b9bb4; font-family: monospace; }
.top { display:flex; justify-content:space-between; align-items:center; padding:16px 18px; border-bottom:1px solid #1a2744; }
.logo { color:#5ffdf2; font-weight:bold; letter-spacing:2px; font-size:13px; line-height:1.2; cursor:pointer; }
.menu { text-align:right; font-size:10px; line-height:1.8; }
.menu a { color:#5a6a8a; text-decoration:none; display:block; }
.menu a.active { color:#fff; font-weight:bold; }
.node { color:#ff4ec6; font-size:11px; letter-spacing:3px; margin:28px 20px 12px; }
h1 { margin:0 20px; color:#fff; font-size:34px; line-height:1.05; }
h1 span { color:#5ffdf2; }
.sub { margin:12px 20px 20px; color:#5a6a8a; font-size:13px; line-height:1.4; min-height:38px; }
.card { margin:0 16px; border:1px solid #1c2d4d; background:#101c33; padding:16px; border-left:3px solid #5ffdf2; }
.card.pink { border-left-color:#ff4ec6; }
.label { font-size:10px; letter-spacing:2px; color:#5ffdf2; }
.input-box { width:100%; margin-top:10px; background:#08101f; border:1px solid #1c2d4d; color:#fff; padding:14px 12px; display:flex; gap:8px; }
.input-box input { background:transparent; border:none; color:#fff; width:100%; outline:none; font-family:monospace; }
.btn { width:100%; margin-top:12px; background:#5ffdf2; color:#001010; border:none; padding:14px; font-weight:bold; letter-spacing:1px; cursor:pointer; }
.btn-pink { background:#ff5ac8; color:#000; }
.status { margin-top:12px; border:1px solid #1c2d4d; background:#0d182c; padding:10px; font-size:11px; }
.bar-wrap { height:2px; background:#08101f; margin-top:8px; }
.bar { height:2px; background:linear-gradient(90deg,#5ffdf2,#ff4ec6); width:0%; transition:0.4s; }
.plans { margin:24px 16px; }
.plan { border:1px solid #1c2d4d; margin-top:12px; padding:12px; display:flex; justify-content:space-between; align-items:center; }
.pink { color:#ff4ec6; font-weight:bold; }
.small { font-size:10px; color:#4a5a78; }
.token-box { margin-top:14px; border:1px solid #ff4ec6; background:#1a1230; padding:14px; }
.token-val { color:#5ffdf2; font-size:17px; font-weight:bold; margin:10px 0; word-break:break-all; }
.code-val { color:#ff4ec6; font-size:28px; letter-spacing:4px; font-weight:bold; margin:10px 0; }
`;

// ==================== ROUTES ====================

app.get("/", (req, res) => res.redirect("/token"));

// TOKEN PAGE - EXACT FROM VIDEO
app.get("/token", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS}</style></head>
<body>
<div class="top">
  <div class="logo" onclick="location.href='/token'">🔥 // KINGRED<br><span style="color:#8b9bb4;font-weight:normal;font-size:10px;letter-spacing:3px">REUSABLE TOKEN TERMINAL</span></div>
  <div class="menu"><a class="active" href="/token">TOKEN</a><a href="/code">PAIR CODE</a></div>
</div>
<div class="node">[ NODE 01 / IDENTITY ]</div>
<h1>Claim your <span>Kingred token.</span></h1>
<div class="sub" id="sub"></div>
<div class="card">
  <div class="label">PHONE // INTERNATIONAL FORMAT</div>
  <div class="input-box"><span>▼</span><input id="phone" placeholder="254 7XX XXX XXX" value="254100969922"></div>
  <button class="btn" id="btn1" onclick="generateTokenFunc()">GENERATE TOKEN // →</button>
  <div id="status" class="status" style="display:none"><div id="stext"></div><div class="bar-wrap"><div id="bar" class="bar"></div></div></div>
  <div id="output"></div>
</div>
<div class="plans">
  <div style="font-size:10px;letter-spacing:2px">TOKEN ACCESS PLANS</div>
  <div style="font-size:10px;color:#4a5a78;margin-top:4px">PAYMENT PLANS COMING SOON</div>
  <div class="plan"><div><div class="pink">KSh 10</div><div class="small">10 DAYS</div></div><div class="small" style="border:1px solid #222;padding:6px 12px">STK PUSH OFFLINE</div></div>
  <div class="plan"><div><div class="pink">KSh 49</div><div class="small">30 DAYS</div></div><div class="small" style="border:1px solid #222;padding:6px 12px">STK PUSH OFFLINE</div></div>
  <div class="plan"><div><div class="pink">KSh 99</div><div class="small">90 DAYS</div></div><div class="small" style="border:1px solid #222;padding:6px 12px">STK PUSH OFFLINE</div></div>
</div>
<script>
let lines = [
  "Secure the link. Keep the token. Connect Kingred when you are ready",
  "Generate once. Store it safely. Use the same token whenever you need a new WhatsApp pairing code.",
  "One identity. One saved token. New pairing codes on demand.",
  "Your Kingred token stays yours. Keep it private and reuse it whenever you need a fresh code."
];
let lineIndex = 0, charIndex = 0;
function typeWriter(){
  let text = lines[lineIndex];
  document.getElementById('sub').innerHTML = text.slice(0,charIndex) + '<span style="color:#5ffdf2">|</span>';
  charIndex++;
  if(charIndex <= text.length){ setTimeout(typeWriter, 30); }
  else { setTimeout(()=>{ lineIndex = (lineIndex+1)%lines.length; charIndex=0; typeWriter(); }, 2500); }
}
typeWriter();
async function generateTokenFunc(){
  let phone = document.getElementById('phone').value.replace(/\\D/g,'');
  if(!phone) return alert('Enter phone number');
  let status = document.getElementById('status'); status.style.display='block';
  let steps = ["VALIDATING NUMBER //..","ENCRYPTING REGISTRATION //..","SECURING KINGRED IDENTITY //..","SYNCING PAIRING SERVICE //..","GENERATING YOUR TOKEN //..","TOKEN READY // REVEALING"];
  for(let i=0;i<steps.length;i++){
    document.getElementById('stext').innerText = steps[i];
    document.getElementById('bar').style.width = ((i+1)/steps.length*100)+'%';
    await new Promise(r=>setTimeout(r,700));
  }
  let res = await fetch('/api/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});
  let data = await res.json();
  document.getElementById('output').innerHTML = '<div class="token-box"><div style="font-size:10px;letter-spacing:2px;color:#5ffdf2">YOUR REUSABLE KINGRED TOKEN</div><div class="token-val">'+data.token+'</div><button class="btn btn-pink" onclick="navigator.clipboard.writeText(\\''+data.token+'\\');this.innerText=\\'Token copied.\\'">COPY TOKEN</button><div class="small" style="margin-top:10px">Store this token in a password manager or another private location. It can be reused on the Pair Code page.</div><br><a href="/code" style="color:#5ffdf2;font-size:12px">Go to Pair Code →</a></div>';
}
</script>
</body>
</html>
  `);
});

// CODE PAGE - EXACT FROM VIDEO
app.get("/code", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS}</style></head>
<body>
<div class="top">
  <div class="logo" onclick="location.href='/token'">🔥 // KINGRED<br><span style="color:#8b9bb4;font-weight:normal;font-size:10px;letter-spacing:3px">PAIRING CODE TERMINAL</span></div>
  <div class="menu"><a href="/token">TOKEN</a><a class="active" href="/code">PAIR CODE</a></div>
</div>
<div class="node">[ NODE 02 / LINK ]</div>
<h1>Generate a <span>pairing code.</span></h1>
<div class="sub">Enter your saved Kingred token. The token is reusable, so you can return here and request another code whenever needed.</div>
<div class="card pink">
  <div class="label" style="color:#ff4ec6">KINGRED TOKEN // SAVED SECRET</div>
  <div class="input-box" style="border-color:#ff4ec633"><input id="token" placeholder="KINGRED-XXXX-XXXX"></div>
  <button class="btn btn-pink" id="btn2" onclick="generateCode()">GENERATE PAIR CODE // →</button>
  <div style="font-size:10px;margin-top:10px;color:#5a6a8a">FORGOT TOKEN? CHAT ADMIN →</div>
  <div id="output2"></div>
</div>
<div class="plans">
  <div style="font-size:10px;letter-spacing:2px">TOKEN ACCESS PLANS</div>
  <div style="font-size:10px;color:#4a5a78;margin-top:4px">PAYMENT PLANS COMING SOON</div>
  <div class="plan"><div><div class="pink">KSh 10</div><div class="small">10 DAYS</div></div><div class="small" style="border:1px solid #222;padding:6px 12px">STK PUSH OFFLINE</div></div>
  <div class="plan"><div><div class="pink">KSh 49</div><div class="small">30 DAYS</div></div><div class="small" style="border:1px solid #222;padding:6px 12px">STK PUSH OFFLINE</div></div>
  <div class="plan"><div><div class="pink">KSh 99</div><div class="small">90 DAYS</div></div><div class="small" style="border:1px solid #222;padding:6px 12px">STK PUSH OFFLINE</div></div>
</div>
<script>
async function generateCode(){
  let token = document.getElementById('token').value.trim();
  if(!token) return alert('Enter token');
  let btn = document.getElementById('btn2');
  btn.innerText = 'REQUESTING //..';
  btn.disabled = true;
  document.getElementById('output2').innerHTML = '<div class="status"><div>REQUESTING //..</div><div class="bar-wrap"><div class="bar" style="width:70%"></div></div></div>';
  try{
    let res = await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
    let data = await res.json();
    if(data.error){
      document.getElementById('output2').innerHTML = '<div style="color:#ff4ec6;margin-top:12px">Error: '+data.error+'</div>';
    } else {
      document.getElementById('output2').innerHTML = '<div class="token-box"><div style="font-size:10px;letter-spacing:2px;color:#ff4ec6">WHATSAPP PAIRING CODE</div><div class="code-val">'+data.code+'</div><button class="btn" style="background:#5ffdf2" onclick="navigator.clipboard.writeText(\\''+data.code+'\\');this.innerText=\\'Pairing code copied.\\'">COPY CODE</button><div class="small" style="margin-top:10px">In WhatsApp: Settings → Linked Devices → Link a Device → Link with phone number → Enter this code. Generate again whenever you need a fresh code.</div></div>';
    }
  }catch(e){
    document.getElementById('output2').innerHTML = 'Error '+e.message;
  }
  btn.innerText = 'GENERATE PAIR CODE // →';
  btn.disabled = false;
}
</script>
</body>
</html>
  `);
});

// API - Generate Token
app.post("/api/token", (req, res) => {
  let { phone } = req.body;
  for (let k in DB) if (DB[k] == phone) return res.json({ token: k });
  let t = generateToken();
  DB[t] = phone;
  saveDB();
  res.json({ token: t });
});

// API - Generate Pair Code (Fixed to stay alive 2 minutes)
app.post("/api/pair", async (req, res) => {
  try {
    let { token } = req.body;
    let phone = DB[token];
    if (!phone) return res.json({ error: "Invalid token. Generate new one in /token" });

    if (ACTIVE_SOCKETS[token]) {
      try { ACTIVE_SOCKETS[token].end(); } catch {}
      delete ACTIVE_SOCKETS[token];
    }

    let dir = "./tmp_" + token;
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const sock = makeWASocket({
      logger: P({ level: "silent" }),
      auth: state,
      browser: ["KingRed", "Chrome", "1.0.0"]
    });

    ACTIVE_SOCKETS[token] = sock;
    sock.ev.on("creds.update", saveCreds);
    await delay(3500);
    let code = await sock.requestPairingCode(phone);

    // Keep socket alive 2 minutes so code doesn't expire
    setTimeout(() => {
      try { sock.end(); delete ACTIVE_SOCKETS[token]; } catch {}
    }, 120000);

    res.json({ code });
  } catch (e) {
    res.json({ error: e.message });
  }
});

app.listen(PORT, () => console.log("KingRed Full Video Copy Running on " + PORT));
