# WatchTogether FIXED

මේ version එකේ Host local video එක Guest browser එකට **actual WebRTC media stream** එකක් ලෙස යැවීමට PeerJS media-call flow එක add කර ඇත.

## Firebase
`config.js` එකේ Firebase Web App config values දාන්න.

Realtime Database එක room metadata/sync state සඳහා පමණයි.

## GitHub Pages
මේ files සියල්ල repository root එකට upload කරලා:
Settings → Pages → Deploy from branch → main → /root → Save.

## Important
Host browser එකේ video file එක local නිසා Host browser එක open/connected තිබිය යුතුයි.

Browser autoplay policy නිසා Guest පැත්තේ video auto-play නොවුණොත් video area එක click කරලා Play කරන්න.

## Note
WebRTC media connection එක network/NAT/firewall මත depend වෙනවා. PeerJS Cloud signaling තිබුණත් production reliability සඳහා TURN server එකක් අවශ්‍ය විය හැකි අවස්ථා තියෙනවා.
