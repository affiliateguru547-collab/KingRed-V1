const express = require("express");
const fs = require("fs");
const P = require("pino");
const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 10000;

let DB = fs.existsSync("./db.json")? JSON.parse(fs.readFileSync("./db.json")) : {};
const save = () => fs.writeFileSync("./db.json", JSON.stringify(DB));
const genToken = () => `KINGRED-${Math.random().toString(36).slice(2,6).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
let SOCKS = {};

const CSS = `body{margin:0;background:#0a1120;color:#8b9bb4;font-family:monospace}.top{display:flex;justify-content:space-between;padding:14px;border-bottom:1px solid #1a2744}.logo{color:#5ffdf2;font-weight:bold}.card{margin:14px;border:1px solid #1c2d4d;background:#101c33;padding:16px;border-left:3px solid #5ffdf2}.card.pink{border-left-color:#ff4ec6}.inp{background:#08101f;border:1px solid #1c2d4d;padding:12px;margin-top:8px}.inp input{background:transparent;border:none;color:#fff;width:100%;outline:none}.btn{width:100%;margin-top:12px;padding:14px;background:#5ffdf2;font-weight:bold;border:none;cursor:pointer}.btn-pink{background:#ff5ac8}.box{border:1px solid #ff4ec6;background:#1a1230;padding:12px;margin-top:12px}.code{font-size:26px;color:#ff4ec6;letter-spacing:4px;font-weight:bold}`;

app.get("/",(a,b)=>b.redirect("/token"));

app.get("/token",(req,res)=>{
res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS}</style></head><body>
<div class="top"><div class="logo">🔥 KINGRED</div><div><a href="/token" style="color:#fff">TOKEN</a> <a href="/code">PAIR CODE</a></div></div>
<div class="card"><div style="font-size:10px;color:#5ffdf2">PHONE - 10 DIGITS: 07XXXXXXXX</div>
<div class="inp"><input id="ph" placeholder="07XXXXXXXX" maxlength="10"></div>
<button class="btn" onclick="go()">GENERATE TOKEN</button><div id="o"></div></div>
<script>
async function go(){
 let p=document.getElementById('ph').value.replace(/\\D/g,'');
 if(p.length!=10||!p.startsWith('0')) return alert('Enter 10 digits: 07XXXXXXXX');
 let phone='254'+p.slice(1);
 let r=await fetch('/api/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});
 let d=await r.json();
 document.getElementById('o').innerHTML='<div class="box">Token: <b style="color:#5ffdf2">'+d.token+'</b><br>Phone saved: '+phone+'<br><br><button class="btn btn-pink" onclick="navigator.clipboard.writeText(\\''+d.token+'\\')">COPY TOKEN</button><br><br><a href="/code" style="color:#5ffdf2">Go to Pair Code</a></div>';
}
</script></body></html>`);
});

app.get("/code",(req,res)=>{
res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS}</style></head><body>
<div class="top"><div class="logo">🔥 KINGRED</div><div><a href="/token">TOKEN</a> <a href="/code" style="color:#fff">PAIR CODE</a></div></div>
<div class="card pink"><div style="font-size:10px;color:#ff4ec6">KINGRED TOKEN</div><div class="inp"><input id="tk" placeholder="KINGRED-XXXX-XXXX"></div><button class="btn btn-pink" id="b" onclick="pair()">GENERATE PAIR CODE</button><div id="o2"></div></div>
<script>
async function pair(){
 let tk=document.getElementById('tk').value.trim(); if(!tk) return alert('token');
 document.getElementById('b').innerText='WAIT 15 SEC - DO NOT CLOSE';
 let r=await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:tk})});
 let d=await r.json();
 if(d.error) document.getElementById('o2').innerHTML='<div class="box" style="color:red">'+d.error+'</div>';
 else document.getElementById('o2').innerHTML='<div class="box"><div>Phone linked to this token: <b style="color:#fff">'+d.phone+'</b><br>This MUST be same WhatsApp you want to link</div><div class="code">'+d.code+'</div><button class="btn" onclick="navigator.clipboard.writeText(\\''+d.code+'\\')">COPY CODE - NO DASH</button><div style="font-size:10px;margin-top:8px">Enter in WhatsApp within 60 seconds. If fail, generate NEW token with your correct number.</div></div>';
 document.getElementById('b').innerText='GENERATE PAIR CODE';
}
</script></body></html>`);
});

app.post("/api/token",(req,res)=>{
 let {phone}=req.body; phone=phone.replace(/\\D/g,''); if(phone.startsWith('0')) phone='254'+phone.slice(1);
 for(let k in DB) if(DB[k]==phone) return res.json({token:k, phone});
 let t=genToken(); DB[t]=phone; save(); res.json({token:t, phone});
});

app.post("/api/pair", async (req,res)=>{
 try{
  let {token}=req.body; let phone=DB[token];
  if(!phone) return res.json({error:"Invalid token - make new token"});
  if(SOCKS[token]){try{SOCKS[token].end()}catch{} delete SOCKS[token]}
  let dir='./session_'+token; if(fs.existsSync(dir)) fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir,{recursive:true});
  const {state, saveCreds} = await useMultiFileAuthState(dir);
  const sock = makeWASocket({auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,P({level:"silent"}))},logger:P({level:"silent"}),browser:["KingRed","Chrome","1.0"],printQRInTerminal:false});
  SOCKS[token]=sock; sock.ev.on("creds.update",saveCreds);
  console.log("Requesting code for",phone);
  await delay(5000);
  let code = await sock.requestPairingCode(phone);
  code = code.replace(/-/g,'').trim();
  console.log("CODE:",code,"for",phone);
  setTimeout(()=>{try{sock.end()}catch{} delete SOCKS[token];}, 90000);
  res.json({code, phone});
 }catch(e){ console.log("PAIR FAIL",e); res.json({error:e.message+" - Try new token"}); }
});

app.listen(PORT,()=>console.log("RUNNING "+PORT));
