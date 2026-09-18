const express = require("express");
const fs = require("fs");
const P = require("pino");
const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");

const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.json());

let DB = {};
if (fs.existsSync("./db.json")) DB = JSON.parse(fs.readFileSync("./db.json"));
function saveDB(){ fs.writeFileSync("./db.json", JSON.stringify(DB)); }
function genToken(){ return `KINGRED-${Math.random().toString(36).slice(2,6).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }

let SOCKS = {};

const CSS = `*{box-sizing:border-box}body{margin:0;background:#0a1120;color:#8b9bb4;font-family:monospace}.top{display:flex;justify-content:space-between;padding:16px;border-bottom:1px solid #1a2744}.logo{color:#5ffdf2;font-weight:bold;letter-spacing:2px}.menu a{color:#5a6a8a;text-decoration:none;font-size:10px;display:block;text-align:right}.node{color:#ff4ec6;font-size:11px;letter-spacing:3px;margin:28px 20px 12px}h1{margin:0 20px;color:#fff;font-size:32px}h1 span{color:#5ffdf2}.sub{margin:12px 20px;color:#5a6a8a;font-size:13px;min-height:38px}.card{margin:0 16px;border:1px solid #1c2d4d;background:#101c33;padding:16px;border-left:3px solid #5ffdf2}.card.pink{border-left-color:#ff4ec6}.inp{width:100%;margin-top:10px;background:#08101f;border:1px solid #1c2d4d;padding:12px;display:flex}.inp input{background:transparent;border:none;color:#fff;width:100%;outline:none}.btn{width:100%;margin-top:12px;padding:14px;background:#5ffdf2;font-weight:bold;border:none;cursor:pointer}.btn-pink{background:#ff5ac8}.status{margin-top:12px;border:1px solid #1c2d4d;padding:10px;font-size:11px}.bar{height:2px;background:linear-gradient(90deg,#5ff,#ff5ac8);width:0%;transition:.4s}.token-box{margin-top:14px;border:1px solid #ff4ec6;background:#1a1230;padding:14px}.code{font-size:26px;color:#ff4ec6;letter-spacing:4px;font-weight:bold;margin:10px 0}`;

app.get("/",(r,s)=>s.redirect("/token"));

app.get("/token",(req,res)=>{
res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS}</style></head><body>
<div class="top"><div class="logo">🔥 // KINGRED</div><div><a href="/token" style="color:#fff">TOKEN</a><a href="/code" style="color:#5a6a8a">PAIR CODE</a></div></div>
<div class="node">[ NODE 01 / IDENTITY ]</div><h1>Claim your <span>Kingred token.</span></h1><div class="sub" id="sub"></div>
<div class="card"><div style="font-size:10px;letter-spacing:2px;color:#5ffdf2">PHONE // 2547XXXXXXX (12 DIGITS)</div>
<div class="inp"><input id="ph" placeholder="2547XXXXXXX" maxlength="12" inputmode="numeric"></div>
<button class="btn" onclick="go()">GENERATE TOKEN // →</button><div id="stat" class="status" style="display:none"><div id="stxt"></div><div style="background:#08101f;height:2px;margin-top:6px"><div id="bar" class="bar"></div></div></div><div id="out"></div></div>
<script>
let lines=["Secure the link. Keep the token.","Generate once. Store it safely."];
let ti=0,ci=0;function type(){let t=lines[ti];document.getElementById('sub').innerHTML=t.slice(0,ci)+'|';ci++;if(ci<=t.length)setTimeout(type,40);else{setTimeout(()=>{ti=(ti+1)%lines.length;ci=0;type()},2000)}}type();
function validPhone(p){p=p.replace(/\\D/g,'');if(p.startsWith('0'))p='254'+p.slice(1);if(p.length!=12||!p.startsWith('254'))return null;return p;}
async function go(){
 let raw=document.getElementById('ph').value;let phone=validPhone(raw);if(!phone)return alert('Enter 10 digits like 07XXXXXXXX or 12 digits like 2547XXXXXXXX');
 let st=document.getElementById('stat');st.style.display='block';
 let steps=["VALIDATING NUMBER //..","ENCRYPTING REGISTRATION //..","SECURING KINGRED IDENTITY //..","SYNCING PAIRING SERVICE //..","GENERATING YOUR TOKEN //..","TOKEN READY // REVEALING"];
 for(let i=0;i<steps.length;i++){document.getElementById('stxt').innerText=steps[i];document.getElementById('bar').style.width=((i+1)/steps.length*100)+'%';await new Promise(r=>setTimeout(r,600))}
 let r=await fetch('/api/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});let d=await r.json();
 document.getElementById('out').innerHTML='<div class="token-box"><div style="font-size:10px;color:#5ffdf2">YOUR TOKEN</div><div style="color:#5ffdf2;font-weight:bold;margin:8px 0">'+d.token+'</div><button class="btn btn-pink" onclick="navigator.clipboard.writeText(\\''+d.token+'\\')">COPY TOKEN</button><br><br><a href="/code" style="color:#5ffdf2">Go to Pair Code →</a></div>';
}
</script></body></html>`);
});

app.get("/code",(req,res)=>{
res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS}</style></head><body>
<div class="top"><div class="logo">🔥 // KINGRED</div><div><a href="/token" style="color:#5a6a8a">TOKEN</a><a href="/code" style="color:#fff">PAIR CODE</a></div></div>
<div class="node">[ NODE 02 / LINK ]</div><h1>Generate a <span>pairing code.</span></h1><div class="sub">Enter your saved Kingred token. Token is reusable.</div>
<div class="card pink"><div style="font-size:10px;letter-spacing:2px;color:#ff4ec6">KINGRED TOKEN</div><div class="inp"><input id="tk" placeholder="KINGRED-XXXX-XXXX"></div><button class="btn btn-pink" id="b2" onclick="pair()">GENERATE PAIR CODE // →</button><div id="out2"></div></div>
<script>
async function pair(){
 let tk=document.getElementById('tk').value.trim();if(!tk)return alert('Enter token');
 let b=document.getElementById('b2');b.innerText='REQUESTING.. KEEP PAGE OPEN 60s';b.disabled=true;
 document.getElementById('out2').innerHTML='<div class="status">REQUESTING //.. DO NOT CLOSE PAGE</div>';
 try{
  let r=await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:tk})});let d=await r.json();
  if(d.error) document.getElementById('out2').innerHTML='<div style="color:#ff4ec6;margin-top:10px">'+d.error+'</div>';
  else document.getElementById('out2').innerHTML='<div class="token-box"><div style="font-size:10px;color:#ff4ec6">WHATSAPP PAIRING CODE - ENTER WITHOUT DASH</div><div class="code">'+d.code+'</div><button class="btn" style="background:#5ffdf2" onclick="navigator.clipboard.writeText(\\''+d.code+'\\')">COPY CODE</button><div style="font-size:10px;color:#6b7a9a;margin-top:8px">WhatsApp > Linked Devices > Link with phone number > Paste code WITHOUT dash. Code valid 60 sec.</div></div>';
 }catch(e){document.getElementById('out2').innerHTML='Error '+e.message}
 b.innerText='GENERATE PAIR CODE // →';b.disabled=false;
}
</script></body></html>`);
});

app.post("/api/token",(req,res)=>{
 let {phone}=req.body; phone=phone.replace(/\\D/g,'');
 if(phone.startsWith('0')) phone='254'+phone.slice(1);
 for(let k in DB) if(DB[k]==phone) return res.json({token:k});
 let t=genToken(); DB[t]=phone; saveDB(); res.json({token:t});
});

app.post("/api/pair", async (req,res)=>{
 try{
  let {token}=req.body; let phone=DB[token];
  if(!phone) return res.json({error:"Invalid token"});
  if(SOCKS[token]){try{SOCKS[token].end()}catch{} delete SOCKS[token]}
  let dir='./tmp_'+token; if(fs.existsSync(dir)) fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir,{recursive:true});
  let {state, saveCreds} = await useMultiFileAuthState(dir);
  let sock = makeWASocket({logger:P({level:"silent"}),auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,P({level:"silent"}))},browser:["KingRed","Chrome","1.0.0"]});
  SOCKS[token]=sock; sock.ev.on("creds.update",saveCreds);
  await delay(4000);
  let code = await sock.requestPairingCode(phone);
  code = code.replace(/-/g,''); // REMOVE DASH FOR USER
  setTimeout(()=>{try{sock.end();}catch{} delete SOCKS[token]}, 120000);
  res.json({code});
 }catch(e){ console.log(e); res.json({error:e.message}); }
});

app.listen(PORT,()=>console.log("Running "+PORT));
