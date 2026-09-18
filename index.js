const express = require("express");
const fs = require("fs");
const cors = require("cors");
const P = require("pino");
const { default: makeWASocket, useMultiFileAuthState, delay } = require("@whiskeysockets/baileys");
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

let DB = {};
if (fs.existsSync("./db.json")) DB = JSON.parse(fs.readFileSync("./db.json"));
function saveDB(){ fs.writeFileSync("./db.json", JSON.stringify(DB)); }

function makeToken(){
  const a = () => Math.random().toString(36).substring(2,6).toUpperCase();
  return `KINGRED-${a()}-${a()}`;
}

const CSS = `
body{margin:0;background:#0a1120;color:#cbd5e1;font-family:monospace}
.top{display:flex;justify-content:space-between;padding:18px;border-bottom:1px solid #1e2a44}
.logo{color:#5ff;letter-spacing:2px;font-weight:bold}
.node{color:#ff4ec6;font-size:12px;letter-spacing:2px;margin:30px 20px 10px}
h1{margin:0 20px;font-size:32px;color:#fff;line-height:1.1}h1 span{color:#5ff}
.sub{margin:15px 20px;color:#6b7a9a;min-height:40px}
.card{margin:20px;border:1px solid #1e2a44;border-left:3px solid #5ff;background:#0f1a30;padding:18px}
label{font-size:11px;letter-spacing:2px;color:#5ff}
input{width:100%;margin-top:10px;padding:14px;background:#0a1120;border:1px solid #243150;color:#fff;box-sizing:border-box}
.btn{width:100%;margin-top:12px;padding:14px;background:#5ffdf2;color:#000;font-weight:bold;border:none;letter-spacing:1px;cursor:pointer}
.btn-pink{background:#ff5ac8}
.status{margin-top:14px;border:1px solid #243150;padding:10px;display:none}
.bar{height:2px;background:linear-gradient(90deg,#5ff,#ff5ac8);width:0%;transition:width 0.5s}
.plans{margin:20px}.plan{border:1px solid #1e2a44;padding:12px;margin-top:12px}
.pink{color:#ff5ac8;font-weight:bold}.small{font-size:11px;color:#6b7a9a}
.tokenBox{border:1px solid #ff5ac8;background:#150f2a;padding:12px;margin-top:15px}
.codeBig{font-size:28px;letter-spacing:4px;color:#ff5ac8;font-weight:bold}
`;

// HOME -> TOKEN
app.get("/", (req,res)=> res.redirect("/token"));

app.get("/token", (req,res)=>{
res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS}</style></head><body>
<div class="top"><div class="logo">🔥 // KINGRED<br><small style="color:#6b7a9a">REUSABLE TOKEN TERMINAL</small></div><div style="font-size:11px;text-align:right">TOKEN<br>PAIR CODE</div></div>
<div class="node">[ NODE 01 / IDENTITY ]</div>
<h1>Claim your <span>Kingred token.</span></h1>
<div class="sub" id="type"></div>
<div class="card">
<label>PHONE // INTERNATIONAL FORMAT</label>
<input id="phone" placeholder="254 7XX XXX XXX">
<button class="btn" id="btn" onclick="gen()">GENERATE TOKEN // →</button>
<div class="status" id="status"><div id="stext" style="font-size:11px;margin-bottom:6px"></div><div style="background:#0a1120;height:2px"><div class="bar" id="bar"></div></div></div>
<div id="result"></div>
</div>
<div class="plans"><label>TOKEN ACCESS PLANS</label><br><small class="small">PAYMENT PLANS COMING SOON</small>
<div class="plan"><div class="pink">KSh 10</div><div class="small">10 DAYS</div><div style="border:1px solid #222;padding:8px;text-align:center;margin-top:8px" class="small">STK PUSH OFFLINE</div></div>
<div class="plan"><div class="pink">KSh 49</div><div class="small">30 DAYS</div><div style="border:1px solid #222;padding:8px;text-align:center;margin-top:8px" class="small">STK PUSH OFFLINE</div></div>
<div class="plan"><div class="pink">KSh 99</div><div class="small">90 DAYS</div><div style="border:1px solid #222;padding:8px;text-align:center;margin-top:8px" class="small">STK PUSH OFFLINE</div></div>
</div>
<script>
const texts=["Secure the link. Keep the token. Connect Kingred when you are ready","Generate once. Store it safely. Use the same token whenever you need a new WhatsApp pairing code.","One identity. One saved token. New pairing codes on demand.","Your Kingred token stays yours. Keep it private and reuse it whenever you need a fresh code."];
let ti=0, ci=0; function typeLoop(){ let t=texts[ti]; if(ci<=t.length){ document.getElementById('type').innerHTML=t.slice(0,ci)+'<span style="color:#5ff">|</span>'; ci++; setTimeout(typeLoop,30);} else { setTimeout(()=>{ti=(ti+1)%texts.length; ci=0; typeLoop()},3000);} } typeLoop();
async function gen(){
 let phone=document.getElementById('phone').value.replace(/\\D/g,''); if(!phone) return alert('Enter number');
 let s=document.getElementById('status'); s.style.display='block';
 let steps=["VALIDATING NUMBER //..","ENCRYPTING REGISTRATION //..","SECURING KINGRED IDENTITY //..","SYNCING PAIRING SERVICE //..","GENERATING YOUR TOKEN //..","TOKEN READY // REVEALING"];
 let b=document.getElementById('bar'), st=document.getElementById('stext');
 for(let i=0;i<steps.length;i++){ st.innerText=steps[i]; b.style.width=((i+1)/steps.length*100)+'%'; await new Promise(r=>setTimeout(r,700)); }
 let res=await fetch('/api/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});
 let data=await res.json();
 document.getElementById('result').innerHTML='<div class="tokenBox"><div style="font-size:10px;color:#5ff">YOUR REUSABLE KINGRED TOKEN</div><div style="color:#5ff;font-size:18px;font-weight:bold;margin:8px 0">'+data.token+'</div><button class="btn btn-pink" onclick="navigator.clipboard.writeText(\\''+data.token+'\\');this.innerText=\\'Token copied.\\'">COPY TOKEN</button><div style="font-size:11px;color:#6b7a9a;margin-top:8px">Store this token in a password manager or another private location. It can be reused on the Pair Code page.</div></div>';
}
</script></body></html>`);
});

app.get("/code", (req,res)=>{
res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${CSS}</style></head><body>
<div class="top"><div class="logo">🔥 // KINGRED<br><small style="color:#6b7a9a">PAIRING CODE TERMINAL</small></div><div style="font-size:11px;text-align:right">TOKEN<br>PAIR CODE</div></div>
<div class="node">[ NODE 02 / LINK ]</div>
<h1>Generate a <span>pairing code.</span></h1>
<div class="sub">Enter your saved Kingred token. The token is reusable, so you can return here and request another code whenever needed.</div>
<div class="card" style="border-left-color:#ff5ac8">
<label>KINGRED TOKEN // SAVED SECRET</label>
<input id="token" placeholder="KINGRED-XXXX-XXXX">
<button class="btn btn-pink" onclick="genCode()">GENERATE PAIR CODE // →</button>
<div class="small" style="margin-top:10px">FORGOT TOKEN? CHAT ADMIN →</div>
<div id="result"></div>
</div>
<div class="plans"><label>TOKEN ACCESS PLANS</label><br><small class="small">PAYMENT PLANS COMING SOON</small>
<div class="plan"><div class="pink">KSh 10</div><div class="small">10 DAYS</div><div style="border:1px solid #222;padding:8px;text-align:center;margin-top:8px" class="small">STK PUSH OFFLINE</div></div>
<div class="plan"><div class="pink">KSh 49</div><div class="small">30 DAYS</div><div style="border:1px solid #222;padding:8px;text-align:center;margin-top:8px" class="small">STK PUSH OFFLINE</div></div>
<div class="plan"><div class="pink">KSh 99</div><div class="small">90 DAYS</div><div style="border:1px solid #222;padding:8px;text-align:center;margin-top:8px" class="small">STK PUSH OFFLINE</div></div>
</div>
<script>
async function genCode(){
 let token=document.getElementById('token').value.trim(); if(!token) return alert('Enter token');
 document.getElementById('result').innerHTML='<div class="status" style="display:block"><div>REQUESTING //..</div><div style="background:#0a1120;height:2px;margin-top:6px"><div class="bar" style="width:60%"></div></div></div>';
 let res=await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
 let data=await res.json();
 if(data.error) document.getElementById('result').innerHTML='<div style="color:red">'+data.error+'</div>';
 else document.getElementById('result').innerHTML='<div class="tokenBox"><div style="font-size:10px;color:#ff5ac8">WHATSAPP PAIRING CODE</div><div class="codeBig">'+data.code+'</div><button class="btn" onclick="navigator.clipboard.writeText(\\''+data.code+'\\');this.innerText=\\'Pairing code copied.\\'">COPY CODE</button><div style="font-size:11px;color:#6b7a9a;margin-top:8px">In WhatsApp: Settings → Linked Devices → Link a Device → Link with phone number → Enter code. Generate again whenever you need a fresh code.</div></div>';
}
</script></body></html>`);
});

app.post("/api/token", (req,res)=>{
  let {phone}=req.body;
  let token=makeToken();
  DB[token]=phone; saveDB();
  res.json({token});
});

app.post("/api/pair", async (req,res)=>{
  let {token}=req.body;
  let phone=DB[token];
  if(!phone) return res.json({error:"Invalid token, generate new one in /token"});
  try{
    const {state, saveCreds} = await useMultiFileAuthState('./auth_'+token);
    const sock = makeWASocket({logger:P({level:"silent"}),auth:state,browser:["KingRed","Chrome","1.0"]});
    sock.ev.on("creds.update", saveCreds);
    await delay(2000);
    const code = await sock.requestPairingCode(phone);
    res.json({code});
  }catch(e){
    res.json({error:e.message});
  }
});

app.listen(PORT, ()=> console.log("KingRed Firebox running "+PORT));
