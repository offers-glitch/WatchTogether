(() => {
const $=id=>document.getElementById(id);
const cfg=window.FIREBASE_CONFIG;
const valid=cfg && cfg.apiKey && !cfg.apiKey.startsWith("PASTE_") && cfg.databaseURL && !cfg.databaseURL.includes("PASTE_");
let db=null,peer=null,conn=null,roomId=null,isHost=false,localURL=null,localStream=null,remoteStream=null,syncing=false;
const video=$("video");

function status(x){$("status").textContent=x}
function rid(){return Math.random().toString(36).slice(2,9).toUpperCase()}
function url(id){return location.origin+location.pathname+"?room="+encodeURIComponent(id)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function msg(name,text){let d=document.createElement("div");d.className="msg";d.innerHTML=`<b>${esc(name)}</b>: ${esc(text)}`;$("messages").appendChild(d);$("messages").scrollTop=$("messages").scrollHeight}
function init(){if(!valid){status("config.js configure කරන්න");return false}if(!firebase.apps.length)firebase.initializeApp(cfg);db=firebase.database();return true}
function send(o){if(conn&&conn.open)conn.send(o)}

$("videoInput").onchange=e=>{
 const f=e.target.files[0]; if(!f)return;
 if(localURL)URL.revokeObjectURL(localURL);
 localURL=URL.createObjectURL(f); video.src=localURL; $("fileName").textContent=f.name; status("Video ready");
};

$("createBtn").onclick=()=>{
 if(!init()||!localURL){alert("මුලින් video එකක් select කරන්න.");return}
 roomId=rid();isHost=true;$("roomLink").value=url(roomId);$("copyBtn").disabled=false;$("role").textContent="HOST";
 peer=new Peer("wt-"+roomId,{debug:1});
 peer.on("open",id=>{
   db.ref("rooms/"+roomId).set({hostPeer:id,playing:false,time:0,users:1,createdAt:firebase.database.ServerValue.TIMESTAMP});
   status("Room created 🟢");
 });
 peer.on("connection",c=>{conn=c;wireData(c);});
 peer.on("call",call=>{
   if(!localStream) return;
   call.answer(localStream);
   status("Video connected 🟢");
 });
 peer.on("error",e=>{console.error(e);status("Peer error: "+e.type)});
};

$("joinBtn").onclick=async()=>{
 if(!init())return;
 let id=new URLSearchParams(location.search).get("room")||$("roomLink").value.split("room=")[1];
 if(!id){alert("Room link එක open කරන්න.");return}
 roomId=decodeURIComponent(id);isHost=false;$("role").textContent="GUEST";
 peer=new Peer(undefined,{debug:1});
 peer.on("open",async myId=>{
   const snap=await db.ref("rooms/"+roomId).get();
   if(!snap.exists()){alert("Room not found");return}
   const hostPeer=snap.val().hostPeer;
   conn=peer.connect(hostPeer,{reliable:true});
   wireData(conn);
   const call=peer.call(hostPeer,new MediaStream());
   call.on("stream",stream=>{
     remoteStream=stream;
     video.srcObject=stream;
     video.controls=false;
     video.muted=false;
     video.play().catch(()=>{status("Connected — Play button click කරන්න")});
     status("Live video 🟢");
   });
   call.on("error",e=>{console.error(e);status("Video call error")});
   db.ref("rooms/"+roomId+"/users").transaction(n=>(n||0)+1);
 });
 peer.on("call",call=>{
   call.answer();
   call.on("stream",stream=>{remoteStream=stream;video.srcObject=stream;video.play().catch(()=>{});});
 });
 peer.on("error",e=>{console.error(e);status("Peer error: "+e.type)});
};

function wireData(c){
 c.on("open",()=>{
   status("Connected 🟢");
   if(isHost)c.send({type:"state",playing:!video.paused,time:video.currentTime});
   else c.send({type:"request-state"});
 });
 c.on("data",m=>{
   if(m.type==="state"&&!isHost){
     syncing=true;
     if(Math.abs((video.currentTime||0)-(m.time||0))>.35)video.currentTime=m.time||0;
     if(m.playing)video.play().catch(()=>{});else video.pause();
     syncing=false;
   }
   if(m.type==="chat")msg(m.name||"User",m.text);
   if(m.type==="request-state"&&isHost)c.send({type:"state",playing:!video.paused,time:video.currentTime});
 });
 c.on("close",()=>status("Disconnected"));
}

video.addEventListener("play",()=>{if(isHost&&!syncing){send({type:"state",playing:true,time:video.currentTime});if(db&&roomId)db.ref("rooms/"+roomId).update({playing:true,time:video.currentTime})}});
video.addEventListener("pause",()=>{if(isHost&&!syncing){send({type:"state",playing:false,time:video.currentTime});if(db&&roomId)db.ref("rooms/"+roomId).update({playing:false,time:video.currentTime})}});
video.addEventListener("seeked",()=>{if(isHost&&!syncing){send({type:"state",playing:!video.paused,time:video.currentTime});if(db&&roomId)db.ref("rooms/"+roomId).update({time:video.currentTime})}});

$("copyBtn").onclick=async()=>{await navigator.clipboard.writeText($("roomLink").value);status("Link copied ✓")};
$("sendBtn").onclick=()=>{let t=$("chatInput").value.trim();if(!t)return;msg("You",t);send({type:"chat",name:"User",text:t});$("chatInput").value=""};
$("chatInput").onkeydown=e=>{if(e.key==="Enter")$("sendBtn").click()};

window.addEventListener("load",()=>{
 const id=new URLSearchParams(location.search).get("room");if(id)$("roomLink").value=url(id);
 if(valid)init();else status("config.js configure කරන්න");
});
})();