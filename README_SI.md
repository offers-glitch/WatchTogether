# WatchTogether V4

V4 එකේ **Full Connection Diagnostics** තියෙනවා.

## Files
- index.html
- style.css
- app.js
- config.js

## GitHub Pages
පරණ files 4 replace කරලා commit කරන්න.

## Test
Host:
1. Video Select
2. Create Room
3. Copy Link

Guest:
1. Host link open කරන්න.
2. Join click කරන්න.
3. **Full Diagnostics** box එක බලන්න.

## Expected Guest logs
✓ Firebase initialized
✓ PeerJS SDK: LOADED
✓ Guest Peer OPEN
✓ Host Peer ID found
✓ DATA connection OPEN
✓ Guest MEDIA CALL created
✓ REMOTE MEDIA STREAM RECEIVED
✓ Remote video tracks: 1
✓ Remote metadata: WIDTHxHEIGHT

## If REMOTE MEDIA STREAM RECEIVED does not appear
එහෙනම් WebRTC media path එක establish වෙලා නැහැ. Debug box එකේ අවසාන lines බලලා network/signaling/browser issue එක identify කරන්න.

## Browser
Latest Chrome/Edge use කරන්න. GitHub Pages HTTPS use කරන නිසා WebRTC APIs සඳහා secure context එකක් ලැබේ.

## Important
PeerJS Cloud signaling එක media relay/TURN server එකක් නොවේ. Restrictive NAT/firewall network එකක P2P media connection එක fail විය හැක. Production reliability සඳහා TURN infrastructure අවශ්‍ය විය හැක.

Firebase config එක user-provided project එකට prefilled කර ඇත. Firebase Realtime Database room state/sync සඳහා පමණයි.
