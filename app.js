(()=>{"use strict";
const $=id=>document.getElementById(id), video=$("video");
let db=null,peer=null,conn=null,roomId=null,isHost=false,localURL=null,localStream=null,call=null;
function add(text,type="ok"){let d=document.createElement("div");d.className="line "+type;d.textContent=(type==="ok"?"✓ ":type==="bad"?"✗ ":type==="warn"?"⚠ ":"• ")+text;$("debug").appendChild(d);$("debug").scrollTop=$("debug").scrollHeight;console.log(text)}
function status(x){$("status").textContent=x}
function roomURL(id){return location.origin+location.pathname+"?room="+encodeURIComponent(id)}
function rid(){return Math.random().toString(36).slice(2,9).toUpperCase()}
function send(x){if(conn?.open){conn.send(x);return true}return false}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function chat(n,t){let d=document.createElement("div");d.className="msg";d.innerHTML="<b>"+esc(n)+"</b>: "+esc(t);$("messages").appendChild(d)}

window.addEventListener("error",e=>add("JavaScript error: "+e.message,"bad"));
window.addEventListener("unhandledrejection",e=>add("Promise error: "+(e.reason?.message||e.reason),"bad"));

add("HTML / JavaScript loaded");
add("Browser: "+navigator.userAgent.split(")")[0]+")","info");
add("HTTPS context: "+(location.protocol==="https:"||location.hostname==="localhost"?"YES":"NO"),location.protocol==="https:"||location.hostname==="localhost"?"ok":"warn");
add("WebRTC support: "+(window.RTCPeerConnection?"YES":"NO"),window.RTCPeerConnection?"ok":"bad");
add("Media captureStream support: "+(HTMLVideoElement.prototype.captureStream?"YES":"NO"),HTMLVideoElement.prototype.captureStream?"ok":"bad");
add("Firebase SDK: "+(window.firebase?"LOADED":"MISSING"),window.firebase?"ok":"bad");
add("PeerJS SDK: "+(window.Peer?"LOADED":"MISSING"),window.Peer?"ok":"bad");
add("config.js: "+(window.FIREBASE_CONFIG?"LOADED":"MISSING"),window.FIREBASE_CONFIG?"ok":"bad");

function initFirebase(){
 try{
  if(!window.firebase)throw new Error("Firebase SDK missing");
  if(!window.FIREBASE_CONFIG)throw new Error("config.js missing");
  if(!firebase.apps.length)firebase.initializeApp(window.FIREBASE_CONFIG);
  db=firebase.database();
  add("Firebase initialized");
  return true;
 }catch(e){add("Firebase initialization failed: "+e.message,"bad");return false}
}

function capture(){
 if(!HTMLVideoElement.prototype.captureStream){add("captureStream unavailable in this browser","bad");return false}
 try{
  localStream=video.captureStream(30);
  const vt=localStream.getVideoTracks(),at=localStream.getAudioTracks();
  add("Host MediaStream created");
  add("Video tracks: "+vt.length,vt.length?"ok":"bad");
  add("Audio tracks: "+at.length,at.length?"ok":"warn");
  return vt.length>0;
 }catch(e){add("captureStream failed: "+e.message,"bad");return false}
}

$("videoInput").addEventListener("change",e=>{
 const f=e.target.files[0];if(!f)return;
 localURL&&URL.revokeObjectURL(localURL);localURL=URL.createObjectURL(f);
 video.srcObject=null;video.src=localURL;video.load();$("fileName").textContent=f.name;
 $("videoHint").textContent="Local video ready";status("Video ready");
 add("Video selected: "+f.name);
 video.onloadedmetadata=()=>{add("Local metadata: "+video.videoWidth+"x"+video.videoHeight);};
});

$("createBtn").onclick=()=>{
 if(!$("videoInput").files[0])return alert("Video select කරන්න.");
 if(!initFirebase())return;
 if(!capture())return;
 isHost=true;roomId=rid();$("roomLink").value=roomURL(roomId);$("copyBtn").disabled=false;$("role").textContent="HOST";
 if(!window.Peer){add("PeerJS SDK missing","bad");return}
 peer=new Peer("wt-"+roomId,{debug:2});add("Host Peer object created");
 peer.on("open",id=>{
  add("Host Peer OPEN: "+id);
  db.ref("rooms/"+roomId).set({hostPeer:id,playing:false,time:0,users:1});
  status("Room ready 🟢");$("videoHint").textContent="Waiting for Guest...";
 });
 peer.on("connection",c=>{conn=c;add("Guest data connection received");wireData(c)});
 peer.on("call",incoming=>{
  add("Incoming MEDIA CALL received");
  if(!localStream&&!capture()){incoming.close();return}
  call=incoming;incoming.answer(localStream);add("Host ANSWER sent with MediaStream");
  incoming.on("close",()=>add("Guest media call closed","warn"));
  incoming.on("error",e=>add("Host media call error: "+e.message,"bad"));
 });
 peer.on("disconnected",()=>add("Host Peer disconnected","bad"));
 peer.on("error",e=>{add("Host Peer error: "+e.type+" "+(e.message||""),"bad");status("Peer error")});
};

$("joinBtn").onclick=async()=>{
 if(!initFirebase())return;
 let id=new URLSearchParams(location.search).get("room")||$("roomLink").value.split("room=")[1];
 if(!id)return alert("Host room link එක open කරන්න.");
 roomId=decodeURIComponent(id);isHost=false;$("role").textContent="GUEST";
 if(!window.Peer){add("PeerJS SDK missing","bad");return}
 peer=new Peer({debug:2});add("Guest Peer object created");
 peer.on("open",async myId=>{
  add("Guest Peer OPEN: "+myId);
  const snap=await db.ref("rooms/"+roomId).get();
  if(!snap.exists()){add("Room not found","bad");return}
  const host=snap.val().hostPeer;add("Host Peer ID found: "+host);
  conn=peer.connect(host,{reliable:true});wireData(conn);
  status("Connecting video...");
  call=peer.call(host,new MediaStream());
  if(!call){add("peer.call returned NULL","bad");return}
  add("Guest MEDIA CALL created");
  call.on("stream",stream=>{
   add("REMOTE MEDIA STREAM RECEIVED 🟢");
   const vt=stream.getVideoTracks(),at=stream.getAudioTracks();
   add("Remote video tracks: "+vt.length,vt.length?"ok":"bad");
   add("Remote audio tracks: "+at.length,at.length?"ok":"warn");
   video.srcObject=stream;video.removeAttribute("src");video.load();
   $("videoHint").textContent="Remote stream received";
   video.onloadedmetadata=()=>{
    add("Remote metadata: "+video.videoWidth+"x"+video.videoHeight);
    video.play().then(()=>{status("Live video 🟢");add("Remote video PLAYING 🟢")}).catch(e=>{status("Click Play");add("Autoplay blocked: "+e.message,"warn")});
   };
  });
  call.on("close",()=>add("Guest media call CLOSED","bad"));
  call.on("error",e=>add("Guest media call ERROR: "+e.message,"bad"));
 });
 peer.on("call",incoming=>{
  add("Unexpected incoming call received","warn");
  incoming.answer();
  incoming.on("stream",s=>{video.srcObject=s;video.play().catch(()=>{})});
 });
 peer.on("disconnected",()=>add("Guest Peer disconnected","bad"));
 peer.on("error",e=>{add("Guest Peer error: "+e.type+" "+(e.message||""),"bad");status("Peer error")});
};

function wireData(c){
 c.on("open",()=>{
  add("DATA connection OPEN 🟢");status("Connected 🟢");
  send(isHost?{type:"state",playing:!video.paused,time:video.currentTime}:{type:"request-state"});
 });
 c.on("data",m=>{
  if(m.type==="state"&&!isHost){
   const t=Number(m.time)||0;if(Math.abs((video.currentTime||0)-t)>.4)video.currentTime=t;
   m.playing?video.play().catch(()=>{}):video.pause();
  }
  if(m.type==="request-state"&&isHost)send({type:"state",playing:!video.paused,time:video.currentTime});
  if(m.type==="chat")chat(m.name||"User",m.text||"");
 });
 c.on("close",()=>add("DATA connection closed","warn"));
 c.on("error",e=>add("DATA connection error: "+e.message,"bad"));
}

function sync(){if(!isHost)return;let x={type:"state",playing:!video.paused,time:video.currentTime};send(x);db&&roomId&&db.ref("rooms/"+roomId).update({playing:x.playing,time:x.time})}
video.addEventListener("play",sync);video.addEventListener("pause",sync);video.addEventListener("seeked",sync);

$("copyBtn").onclick=async()=>{await navigator.clipboard.writeText($("roomLink").value);status("Copied ✓");add("Room link copied")};
$("sendBtn").onclick=()=>{let t=$("chatInput").value.trim();if(!t)return;chat("You",t);send({type:"chat",name:"User",text:t});$("chatInput").value=""};
$("chatInput").onkeydown=e=>{if(e.key==="Enter")$("sendBtn").click()};

window.addEventListener("load",()=>{
 let id=new URLSearchParams(location.search).get("room");if(id)$("roomLink").value=roomURL(id);
 if(initFirebase())status("Ready 🟢");else status("Firebase error");
});
})();