# WatchTogether V5

### Main change
V5 uses **one-way WebRTC media**:
Host only sends media. Guest does not send a dummy MediaStream.

Host:
`video.captureStream()` → `PeerJS call` → Guest

Firebase:
room ID + host Peer ID + play/pause/seek state only.

### Best media compatibility
Use **MP4 H.264 video + AAC audio**. Browser support for MKV/HEVC is inconsistent.

### Test
1. Replace `index.html`, `style.css`, `app.js`, `config.js` on GitHub.
2. Refresh GitHub Pages.
3. Host selects an MP4.
4. Create Room.
5. Guest opens room link and presses Join.
6. Check Full Diagnostics.

Expected Guest:
- Guest Peer OPEN
- Host Peer found
- DATA connection OPEN
- ONE-WAY media call created
- REMOTE MEDIA STREAM RECEIVED
- Remote video tracks: 1
- Remote video playing

If `REMOTE MEDIA STREAM RECEIVED` never appears, the WebRTC media path is not reaching the guest. The diagnostics will show the last successful step.

### Note
PeerJS Cloud provides signaling, not a guaranteed TURN relay. Some NAT/firewall combinations can prevent direct media. For reliable production connectivity across restrictive networks, TURN is required.
