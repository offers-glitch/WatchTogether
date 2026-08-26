(() => {
const $=id=>document.getElementById(id);
const video=$("video");
let db=null,peer=null,conn=null,mediaCall=null,roomId=null,isHost=false,localURL=null,localStream=null;
let suppressSync=false;

function log(text,ok=true){const d=document.createElement("div");d.className=ok?"ok":"bad";d.textContent=(ok?"✓ ":"✗ ")+text;$("debug").appendChild(d);$("debug").scrollTop=$("debug").scrollHeight;console.log(text)}
function status(x){$("status").textContent=x}
function roomURL(id){return location.origin+location.pathname+"?room="+encodeURIComponent(id)}
function rid(){return Math.random().toString(36).slice(2,9).toUpperCase()}
function send(x){if(conn&&conn.open){conn.send(x);return true}return false}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function addMsg(n,t){let d=document.createElement("div");d.className="msg";d.innerHTML="<b>"+esc(n)+"</b>: "+esc(t);$("messages").appendChild(d)}

function firebaseInit(){
 try{
  if(!firebase.apps.length)firebase.initializeApp(window.FIREBASE_CONFIG);
  db=firebase.database();log("Firebase initialized");return true
 }catch(e){log("Firebase error: "+e.message,false);return false}
}

function makeLocalStream(){
 if(!video.captureStream){log("captureStream() not supported. Use latest Chrome/Edge.",false);return false}
 try{
  localStream=video.captureStream(30);
  const v=localStream.getVideoTracks().length;
  const a=localStream.getAudioTracks().length;
  log("Host captureStream created: video="+v+", audio="+a);
  return v>0;
 }catch(e){log("captureStream failed: "+e.message,false);return false}
}

$("videoInput").addEventListener("change",e=>{
 const f=e.target.files[0];if(!f)return;
 if(localURL)URL.revokeObjectURL(localURL);
 localURL=URL.createObjectURL(f);
 video.srcObject=null;video.src=localURL;video.load();
 $("fileName").textContent=f.name;
 $("videoHint").textContent="Local video ready";
 status("Video ready");
 log("Local file loaded: "+f.name);
 video.onloadedmetadata=()=>{log("Video metadata loaded: "+video.videoWidth+"x"+video.videoHeight)}
});

$("createBtn").onclick=()=>{
 if(!$("videoInput").files[0]){alert("මුලින් video select කරන්න.");return}
 if(!firebaseInit())return;
 if(!makeLocalStream())return;
 isHost=true;roomId=rid();$("roomLink").value=roomURL(roomId);$("copyBtn").disabled=false;$("role").textContent="HOST";
 peer=new Peer("wt-"+roomId,{debug:2});
 log("Creating Peer: wt-"+roomId);
 peer.on("open",id=>{
  db.ref("rooms/"+roomId).set({hostPeer:id,playing:false,time:0,users:1,createdAt:firebase.database.ServerValue.TIMESTAMP});
  status("Room ready 🟢");log("Peer open: "+id);log("Waiting for Guest...");
 });
 peer.on("connection",c=>{conn=c;log("Data connection received");wireData(c)});
 peer.on("call",call=>{
  log("Incoming WebRTC media call");
  if(!localStream)makeLocalStream();
  if(!localStream){call.close();log("No host media stream",false);return}
  mediaCall=call;
  call.answer(localStream);
  log("Answered media call with host stream");
  call.on("stream",()=>log("Host-side media call stream event"));
  call.on("close",()=>log("Guest media call closed",false));
  call.on("error",e=>log("Media call error: "+e.message,false));
 });
 peer.on("disconnected",()=>log("Peer disconnected",false));
 peer.on("error",e=>{log("Peer error: "+e.type+" — "+(e.message||""),false);status("Peer error")});
};

$("joinBtn").onclick=async()=>{
 if(!firebaseInit())return;
 let id=new URLSearchParams(location.search).get("room");
 if(!id)id=$("roomLink").value.split("room=")[1];
 if(!id){alert("Hostගේ room link එක open කරන්න.");return}
 roomId=decodeURIComponent(id);isHost=false;$("role").textContent="GUEST";
 peer=new Peer({debug:2});log("Guest Peer creating...");
 peer.on("open",async myId=>{
  log("Guest Peer open: "+myId);
  const snap=await db.ref("rooms/"+roomId).get();
  if(!snap.exists()){log("Room not found",false);alert("Room not found");return}
  const hostPeer=snap.val().hostPeer;
  log("Host Peer: "+hostPeer);
  conn=peer.connect(hostPeer,{reliable:true});wireData(conn);
  status("Connecting video...");
  mediaCall=peer.call(hostPeer, new MediaStream());
  if(!mediaCall){log("Peer call() returned null",false);return}
  log("Outgoing WebRTC media call created");
  mediaCall.on("stream",stream=>{
   log("REMOTE MEDIA STREAM RECEIVED 🟢");
   const vt=stream.getVideoTracks().length,at=stream.getAudioTracks().length;
   log("Remote tracks: video="+vt+", audio="+at);
   video.pause();video.removeAttribute("src");video.srcObject=stream;video.load();
   $("videoHint").textContent="Remote video stream received";
   video.onloadedmetadata=()=>{
    log("Remote video metadata: "+video.videoWidth+"x"+video.videoHeight);
    video.play().then(()=>{status("Live video 🟢")}).catch(()=>{status("Video ready — Guest Play click කරන්න")});
   };
  });
  mediaCall.on("close",()=>{log("Media call closed",false);status("Video disconnected")});
  mediaCall.on("error",e=>{log("Outgoing media call error: "+e.message,false);status("WebRTC media error")});
 });
 peer.on("call",call=>{
  log("Guest received incoming media call");
  call.answer();
  call.on("stream",stream=>{
   log("INCOMING REMOTE STREAM RECEIVED 🟢");
   video.srcObject=stream;video.load();
   video.play().catch(()=>{});
  });
  call.on("error",e=>log("Incoming call error: "+e.message,false));
 });
 peer.on("disconnected",()=>log("Guest Peer disconnected",false));
 peer.on("error",e=>{log("Guest Peer error: "+e.type+" — "+(e.message||""),false);status("Peer error")});
};

function wireData(c){
 c.on("open",()=>{
  log("Data connection OPEN 🟢");
  status("Connected 🟢");
  if(isHost)send({type:"state",playing:!video.paused,time:video.currentTime});
  else send({type:"request-state"});
 });
 c.on("data",m=>{
  if(m.type==="state"&&!isHost){
   suppressSync=true;
   const t=Number(m.time)||0;
   if(Math.abs((video.currentTime||0)-t)>.4)video.currentTime=t;
   if(m.playing)video.play().catch(()=>{});
   else video.pause();
   setTimeout(()=>suppressSync=false,50);
  }
  if(m.type==="request-state"&&isHost)send({type:"state",playing:!video.paused,time:video.currentTime});
  if(m.type==="chat")addMsg(m.name||"User",m.text||"");
 });
 c.on("close",()=>log("Data connection closed",false));
 c.on("error",e=>log("Data error: "+e.message,false));
}

function sync(){
 if(!isHost||suppressSync)return;
 const state={type:"state",playing:!video.paused,time:video.currentTime};
 send(state);
 if(db&&roomId)db.ref("rooms/"+roomId).update({playing:state.playing,time:state.time});
}
video.addEventListener("play",sync);
video.addEventListener("pause",sync);
video.addEventListener("seeked",sync);

$("copyBtn").onclick=async()=>{
 try{await navigator.clipboard.writeText($("roomLink").value);status("Link copied ✓");log("Room link copied")}
 catch(e){log("Clipboard failed",false)}
};
$("sendBtn").onclick=()=>{
 const t=$("chatInput").value.trim();if(!t)return;
 addMsg("You",t);send({type:"chat",name:"User",text:t});$("chatInput").value="";
};
$("chatInput").addEventListener("keydown",e=>{if(e.key==="Enter")$("sendBtn").click()});

window.addEventListener("load",()=>{
 const id=new URLSearchParams(location.search).get("room");
 if(id)$("roomLink").value=roomURL(id);
 if(firebaseInit())log("App ready");
});
})();