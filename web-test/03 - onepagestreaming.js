
const video = () => {
  const v = document.createElement('video')
  v.autoplay = true, v.playsInline = true, v.muted = true
  v.bindstream = s => { v.srcObject = null, v.srcObject = s }
  document.body.append(v)
  return v
}

let pc1 = new RTCPeerConnection(), pc2 = new RTCPeerConnection()
let candidate = (pc, can) => {
  if (!can) { return } pc.addIceCandidate(can)
  log(["ice candidate:", can.type, can.component,
    can.protocol, can.address + ":" + can.port].join(" "))
}
pc1.onicecandidate = e => candidate(pc2, e.candidate)
pc2.onicecandidate = e => candidate(pc1, e.candidate)
pc1.oniceconnectionstatechange = e => log('pc1 iceConnState:', pc1.iceConnectionState)
pc2.oniceconnectionstatechange = e => log('pc2 iceConnState:', pc2.iceConnectionState)

const constraints = { audio: true, video: true }
const stream = await navigator.mediaDevices.getUserMedia(constraints)
stream.getTracks().forEach(t => { pc1.addTrack(t, stream) })

pc2.addEventListener('track', e => { v.bindstream(e.streams[0]) })
const v = video()

let d1 = await pc1.createOffer()
await pc1.setLocalDescription(d1)
await pc2.setRemoteDescription(pc1.localDescription)
let d2 = await pc2.createAnswer()
await pc2.setLocalDescription(d2)
await pc1.setRemoteDescription(pc2.localDescription)