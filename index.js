const express = require("express");
const { default: makeWASocket, useMultiFileAuthState, delay } = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({extended:true}));

let tokens = {}; // token -> phone
if(fs.existsSync("./tokens.json")) tokens = JSON.parse(fs.readFileSync("./tokens.json"));

// --- UI CSS (same as Firebox) ---
const style = `
<style>
body{background:#0a101e;color:#fff;font-family:monospace;padding:20px}
h1{font-size:32px}.cyan{color:#3ffff0}.pink{color:#ff5ad4}
.box{border:1px solid #3ffff055;background:#111a2e;padding:20px;margin-top:20px;border-left:4px solid #3ffff0}
input{width:100%;padding:15px;background:#0a101e;border:1px solid #3ffff055;color:#fff;margin:10px 0}
button{width:100%;padding:15px;background:#3ffff0;color:#000;font-weight:bold;border:none;cursor:pointer}
.plan{border:1px solid #333;padding:15px;margin:10px 0}
</style>
`;

app.get("/", (req,res)=> res.redirect("/token"));

app.get("/token", (req,res)=>{
  res.send(`${style}
  <div>// KINGRED<br>REUSABLE TOKEN TERMINAL</div>
  <p style="color:#ff5ad4">[ NODE 01 / IDENTITY ]</p>
  <h1>Claim your <span class="cyan">Kingred token.</span></h1>
  <p>Generate once. Store it safely. Use the same token whenever you need a new WhatsApp pairing code.</p>
  <div class="box">
  PHONE // INTERNATIONAL FORMAT
  <input id="phone" placeholder="254 7XX XXX XXX" value="254100969922">
  <button onclick="genToken()">GENERATE TOKEN // →</button>
  <div id="result" style="margin-top:20px;color:#3ffff0"></div>
  <br><div>TOKEN ACCESS PLANS<br>PAYMENT PLANS COMING SOON</div>
  <div class="plan"><span class="pink">KSh 10</span><br>10 DAYS<br><button style="background:#111;color:#555">STK PUSH OFFLINE</button></div>
  <div class="plan"><span class="pink">KSh 49</span><br>30 DAYS</div>
  </div>
  <script>
  async function genToken(){
    let phone=document.getElementById('phone').value.replace(/\\D/g,'');
    let r=await fetch('/api/gentoken',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});
    let d=await r.json();
    document.getElementById('result').innerHTML='YOUR TOKEN: <b>'+d.token+'</b><br><br><a href="/code" style="color:#ff5ad4">Go to Pair Code →</a>';
  }
  </script>`);
});

app.get("/code", (req,res)=>{
  res.send(`${style}
  <div>// FIREBOX<br>PAIRING CODE TERMINAL</div>
  <p style="color:#ff5ad4">[ NODE 02 / LINK ]</p>
  <h1>Generate a <span class="cyan">pairing code.</span></h1>
  <p>Enter your saved Kingred token. The token is reusable.</p>
  <div class="box" style="border-left-color:#ff5ad4">
  FIREBOX TOKEN // SAVED SECRET
  <input id="token" placeholder="KINGRED-XXXX-XXXX">
  <button style="background:#ff5ad4" onclick="genCode()">GENERATE PAIR CODE // →</button>
  <div id="result" style="margin-top:20px;font-size:24px"></div>
  </div>
  <script>
  async function genCode(){
    let token=document.getElementById('token').value.trim();
    document.getElementById('result').innerHTML='Generating... wait 10s';
    let r=await fetch('/api/gencode',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
    let d=await r.json();
    document.getElementById('result').innerHTML=d.code? 'YOUR CODE: <b style="font-size:32px;letter-spacing:5px">'+d.code+'</b><br>Enter in WhatsApp > Linked Devices' : 'Error: '+d.error;
  }
  </script>`);
});

app.post("/api/gentoken", (req,res)=>{
  let {phone}=req.body;
  if(!phone) return res.json({error:"no phone"});
  let token="KINGRED-"+Math.random().toString(36).substring(2,6).toUpperCase()+"-"+Math.random().toString(36).substring(2,6).toUpperCase();
  tokens[token]=phone;
  fs.writeFileSync("./tokens.json", JSON.stringify(tokens));
  res.json({token});
});

app.post("/api/gencode", async (req,res)=>{
  try{
    let {token}=req.body;
    let phone=tokens[token];
    if(!phone) return res.json({error:"Invalid token"});
    const { state, saveCreds } = await useMultiFileAuthState('./temp/'+token);
    const sock = makeWASocket({ logger: P({level:"silent"}), auth: state, printQRInTerminal:false, browser: ["KingRed","Chrome","1.0"] });
    sock.ev.on("creds.update", saveCreds);
    await delay(2000);
    let code = await sock.requestPairingCode(phone);
    res.json({code});
  }catch(e){ res.json({error:e.message}); }
});

app.listen(PORT, ()=> console.log("KingRed Firebox Online on "+PORT));
