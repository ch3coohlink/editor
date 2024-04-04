let pc1 = new RTCPeerConnection(), pc2 = new RTCPeerConnection()

let c = (pc, can) => can && pc.addIceCandidate(can)

pc1.onicecandidate = e => c(pc2, e.candidate)
pc2.onicecandidate = e => c(pc1, e.candidate)

pc1.oniceconnectionstatechange = e => log('pc1 iceConnState:', pc1.iceConnectionState)
pc2.oniceconnectionstatechange = e => log('pc2 iceConnState:', pc2.iceConnectionState)

pc1dch = pc1.createDataChannel('dch', { negotiated: true, id: 1 })
pc2dch = pc2.createDataChannel('dch', { negotiated: true, id: 1 })

pc2dch.binaryType = 'arraybuffer'
pc1dch.binaryType = 'arraybuffer'

pc1dch.onopen = e => log('pc1dch open')
pc1dch.onclose = e => log('pc1dch close')
pc1dch.onmessage = e => log('pc1dch message: ', e)
pc2dch.onopen = e => log('pc2dch open')
pc2dch.onclose = e => log('pc2dch close')
pc2dch.onmessage = e => log('pc2dch message: ', e)

let d1 = await pc1.createOffer()
await pc1.setLocalDescription(d1)
await pc2.setRemoteDescription(pc1.localDescription)
let d2 = await pc2.createAnswer()
await pc2.setLocalDescription(d2)
await pc1.setRemoteDescription(pc2.localDescription)