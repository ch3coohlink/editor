let cfg = { iceTransportPolicy: 'all' }
// cfg.iceServers = [{ urls: ['stun:freeturn.net:5349'] }]
cfg.iceServers = [{ urls: ['stun:stun.l.google.com:19302'] }]

let pc = new RTCPeerConnection(/* cfg */), candidate

pc.onicecandidate = e => e.candidate ? candidate = e.candidate : 0
pc.onicegatheringstatechange = e => log('onicegatheringstatechange', e)
pc.onicecandidateerror = e => log('onicecandidateerror', e)
pc.oniceconnectionstatechange = e => log('oniceconnectionstatechange', e)

let dc = pc.createDataChannel('dch', { negotiated: true, id: 1 })
dc.binaryType = 'arraybuffer'
dc.onopen = log
dc.onclose = log
dc.onmessage = log

let of = await pc.createOffer({})
await pc.setLocalDescription(of)
log(JSON.stringify(pc.localDescription))