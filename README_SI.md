# WatchTogether — Firebase + PeerJS

## 1. Firebase
1. Firebase Console → Create project.
2. Realtime Database → Create Database.
3. Web App එකක් register කරන්න.
4. Project settings → Your apps → Config copy කරන්න.
5. `config.js` තුළ values replace කරන්න.

### Realtime Database Rules (demo)
Development සඳහා පමණක්:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
Production එකේ authentication + restrictive rules දාන්න.

## 2. GitHub Pages
1. මේ folder එක GitHub repository එකකට upload කරන්න.
2. Settings → Pages.
3. Deploy from branch → `main` / root.
4. ලැබෙන Pages URL එක open කරන්න.

## 3. Use
- Host: Video Select → Create Room → Copy Link.
- Friend: link open කරලා Join.
- Host browser එක open තියෙන්න ඕනේ.
- Firebase stores room metadata/sync state; video file එක Firebase Storage එකට upload කරන්නේ නැහැ.

## Important technical note
PeerJS Cloud signaling WebRTC connection setup සඳහා භාවිතා වෙනවා. Browser-to-browser media transfer එක direct WebRTC path එකක් භාවිතා කරයි. NAT/firewall situations වල reliability සඳහා TURN server එකක් future production version එකකට අවශ්‍ය විය හැක.

## Security
Public Realtime Database rules demo සඳහා විතරයි. Real deployment එකකට Firebase Authentication, room membership validation, rate limiting සහ stricter rules අනිවාර්යයෙන් add කරන්න.
