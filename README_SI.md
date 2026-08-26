# WatchTogether V3 — WebRTC Debug + Video Streaming

## මෙවර fix එක
Host local video එක `HTMLVideoElement.captureStream()` මගින් MediaStream එකකට convert කරලා PeerJS media call එකෙන් Guest වෙත යවයි.

Guest පැත්තේ incoming `MediaStream` එක `<video>.srcObject` වෙත attach කරයි.

## Test
1. GitHub Pages එකේ files replace කරන්න.
2. Host browser එකේ video select කරන්න.
3. Create Room.
4. Room link Guestට දෙන්න.
5. Guest link open කරලා Join කරන්න.
6. Guestගේ **WebRTC Debug** box බලන්න.

### Expected debug
- Firebase initialized
- Guest Peer open
- Data connection OPEN
- Outgoing WebRTC media call created
- REMOTE MEDIA STREAM RECEIVED 🟢
- Remote tracks: video=1, audio=1 (audio track count browser/file අනුව වෙනස් විය හැක)
- Remote video metadata: 1920x1080 (resolution file අනුව වෙනස් වේ)

## If black screen
Debug box එකේ අවසාන red line එක බලන්න. ඒක exact failure point එක පෙන්වයි.

## Browser
Latest Chrome/Edge use කරන්න.

## Important network limitation
PeerJS Cloud handles signaling, but WebRTC media may fail on restrictive NAT/firewalls. In that case a TURN server may be required for reliable production connectivity.

## Firebase
Firebase Realtime Database room metadata and play/pause/time synchronization සඳහා පමණි. Video file එක Firebase Storage එකට upload නොකරයි.
