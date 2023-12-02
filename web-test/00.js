let pc1 = new RTCPeerConnection(),
  pc2 = new RTCPeerConnection()

let addCandidate = (pc, can) => can && pc.addIceCandidate(can).catch(console.error)

pc1.onicecandidate = e => { addCandidate(pc2, e.candidate) }
pc2.onicecandidate = e => { addCandidate(pc1, e.candidate) }

pc1.oniceconnectionstatechange = e => log('pc1 iceConnState:', pc1.iceConnectionState)
pc2.oniceconnectionstatechange = e => log('pc2 iceConnState:', pc2.iceConnectionState)

pc1dch = pc1.createDataChannel('dch', { negotiated: true, id: 1 })
pc2dch = pc2.createDataChannel('dch', { negotiated: true, id: 1 })

pc2dch.binaryType = 'arraybuffer'
pc1dch.binaryType = 'arraybuffer'

pc1dch.onopen = e => { log('pc1dch open') }
pc2dch.onopen = e => { log('pc2dch open') }

pc1dch.onclose = e => { log('pc1dch close') }
pc2dch.onclose = e => { log('pc2dch close') }
pc2dch.onmessage = e => { log('pc2dch message: ', e) }
pc1dch.onmessage = e => { log('pc1dch message: ', e) }

const start = () => {
  pc1.createOffer()
    .then(d => pc1.setLocalDescription(d))
    .then(() => pc2.setRemoteDescription(pc1.localDescription))
    .then(() => pc2.createAnswer())
    .then(d => pc2.setLocalDescription(d))
    .then(() => pc1.setRemoteDescription(pc2.localDescription))
    .catch(console.error)
}

start()