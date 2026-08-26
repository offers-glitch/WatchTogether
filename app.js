(() => {
  const $ = id => document.getElementById(id);
  const cfg = window.FIREBASE_CONFIG || {};
  const valid = cfg.apiKey && !cfg.apiKey.startsWith("PASTE_") && cfg.databaseURL && !cfg.databaseURL.includes("PASTE_");

  let db=null, peer=null, conn=null, roomId=null, isHost=false, videoUrl=null, syncing=false;
  const video=$("video");

  function status(s){$("status").textContent=s}
  function rid(){return Math.random().toString(36).slice(2,9).toUpperCase()}
  function addMsg(name,text){const d=document.createElement("div");d.className="msg";d.innerHTML=`<b>${escapeHtml(name)}</b>: ${escapeHtml(text)}`;$("messages").appendChild(d);$("messages").scrollTop=$("messages").scrollHeight}
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function roomURL(id){return location.origin+location.pathname+"?room="+encodeURIComponent(id)}
  function broadcast(data){ if(conn && conn.open) conn.send(data); }

  function initFirebase(){
    if(!valid){status("Firebase config එක දාන්න");return false}
    if(!firebase.apps.length) firebase.initializeApp(cfg);
    db=firebase.database(); return true;
  }

  $("videoInput").addEventListener("change", e=>{
    const f=e.target.files[0]; if(!f)return;
    videoUrl=URL.createObjectURL(f); video.src=videoUrl; $("fileName").textContent=f.name;
    status("Video ready");
  });

  $("createBtn").onclick=async()=>{
    if(!initFirebase()||!videoUrl){alert("මුලින් video එකක් select කරන්න.");return}
    roomId=rid(); isHost=true; $("roomLink").value=roomURL(roomId); $("copyBtn").disabled=false; $("role").textContent="Host";
    peer=new Peer("wt-"+roomId,{debug:1});
    peer.on("open",()=>{db.ref("rooms/"+roomId).set({hostPeer:peer.id,playing:false,time:0,users:1,createdAt:Date.now()});status("Room created");});
    peer.on("connection", c=>{conn=c; wireConnection(c);});
  };

  $("joinBtn").onclick=()=>{
    if(!initFirebase())return;
    const id=new URLSearchParams(location.search).get("room") || $("roomLink").value.split("room=")[1];
    if(!id){alert("Room link එකක් open කරන්න හෝ room URL එක paste කරන්න.");return}
    roomId=decodeURIComponent(id); isHost=false; $("role").textContent="Viewer";
    peer=new Peer();
    peer.on("open", async myId=>{
      const snap=await db.ref("rooms/"+roomId).get();
      if(!snap.exists()){alert("Room not found");return}
      conn=peer.connect(snap.val().hostPeer,{reliable:true}); wireConnection(conn);
      db.ref("rooms/"+roomId+"/users").transaction(n=>(n||0)+1);
    });
  };

  function wireConnection(c){
    c.on("open",()=>{
      status("Connected 🟢");
      if(isHost) c.send({type:"state",playing:!video.paused,time:video.currentTime});
      else c.send({type:"request-state"});
    });
    c.on("data", msg=>{
      if(msg.type==="state"){syncing=true; video.currentTime=msg.time||0; msg.playing?video.play().catch(()=>{}):video.pause(); syncing=false}
      if(msg.type==="chat")addMsg(msg.name||"User",msg.text);
      if(msg.type==="screen"){} // reserved for future screen-share signaling
    });
    c.on("close",()=>status("Disconnected"));
  }

  function sync(type){
    if(!isHost||syncing||!roomId||!db)return;
    const data={playing:!video.paused,time:video.currentTime,updatedAt:firebase.database.ServerValue.TIMESTAMP};
    db.ref("rooms/"+roomId).update(data);
    broadcast({type:"state",...data});
  }
  video.addEventListener("play",()=>sync("play"));
  video.addEventListener("pause",()=>sync("pause"));
  video.addEventListener("seeked",()=>sync("seek"));

  $("copyBtn").onclick=async()=>{await navigator.clipboard.writeText($("roomLink").value);status("Link copied ✓")};
  $("sendBtn").onclick=()=>{
    const t=$("chatInput").value.trim();if(!t)return;
    addMsg("You",t);broadcast({type:"chat",name:"User",text:t});$("chatInput").value="";
  };
  $("chatInput").addEventListener("keydown",e=>{if(e.key==="Enter")$("sendBtn").click()});

  // Viewer listens to Firebase state as a fallback synchronization channel.
  window.addEventListener("load",()=>{
    const id=new URLSearchParams(location.search).get("room");
    if(id) $("roomLink").value=roomURL(id);
    if(valid){initFirebase();} else status("config.js configure කරන්න");
  });
})();
