//# sourceURL=7bF10sAz0.js
await require("../common/basic.js")

const wsserver = () => {
  let protocol = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//'
  let send = (c, o = {}) => ws ? ws.send(JSON.stringify({ c, ...o })) : 0
  let goon = (c, o = {}) => {
    let mid = mesid++; o.m = mid; send(c, o);
    return new Promise((r, j) => _hs[mid] =
      o => { if (o.r) { r(o) } else { j(o) } })
      .finally(() => delete _hs[mid])
  }, _hs = {}, mesid = 0
  let handle = (c, f) => _hs[c] = f
  let ws, connect = () => {
    ws = new WebSocket(protocol + host)
    ws.onmessage = e => {
      const o = JSON.parse(e.data)
      const { c, m } = o; let f = _hs[m]
      if (f) { f(o); delete _hs[m]; return }
      f = _hs[c]; if (f) { f(o); return }
      throw new Error(`cannot handle message type: ${c}`)
    }
    ws.onerror = e => console.error(e)
    ws.onclose = login
    return new Promise(r => ws.onopen = r)
  }
  setInterval(() => send('heartbeat'), 1000 * 60)
  return {
    connect, send, goon, handle, get ws() { return ws },
    get host() { return host }, set host(v) { host = v },
  }
}

const logcandidate = async (c, id, pc) => {
  let { url, type } = c, a = [`ice candidate to ${id.slice(0, 8)}:`,
    type, c.component, c.protocol, c.address + ":" + c.port]
  if (!url && ['srflx', 'relay'].includes(type)) {
    const a = []; (await pc.getStats()).forEach(v => a.push(v))
    for (const v of a) if (v.type === 'local-candidate' &&
      v.address === c.address && v.port === c.port) { url = v.url; break }
  } if (url) { a.push(url) } log(a.join(" "))
}
const miniwrtcpeer = id => {
  let cfg = { iceTransportPolicy: 'all' }
  let urls = ['stun:stun.qq.com:3478']
  // let urls = ['stun:freeturn.net:5349']
  cfg.iceServers = [{ urls }]

  let pc = new RTCPeerConnection(cfg)
  log("create rtcpeer with: " + id.slice(0, 8))
  pc.addEventListener('icecandidate', e => {
    const c = e.candidate; if (!c) { return }
    svr.send('icecandidate', { candidate: c, from: userid, to: id })
    logcandidate(c, id, pc)
  })
  pc.addEventListener('iceconnectionstatechange', e => {
    if (pc.iceConnectionState === 'connected') {
      log(`connected to user ${id.slice(0, 8)}`)
    }
  })
  return pc
}, wrtcpeer = id => {
  let pc = miniwrtcpeer(id)
  let dc = pc.createDataChannel('dch', { negotiated: true, id: 0 })
  dc.bufferedAmountLowThreshold = 1024 * 1024 * 1024 * 10
  pc.dc = dc; return pc
}, streampeer = user => {
  const pc = miniwrtcpeer(user.id)
  user.streampc = pc; return pc
}

const login = async () => {
  await svr.connect()
  try {
    const o = await svr.goon('login', { userid, room })
    await setup_connection(o)
  } catch (o) {
    console.warn(o.e ?? o)
    delete svr.ws.onclose
  }
}, setup_connection = async o => {
  const ul = o.userlist
  const needconnection = []; for (const u of ul) {
    if (!userlist[u.id]?.connected) { needconnection.push(u) }
  } let users = needconnection.map(u => createuser(u.id, wrtcpeer(u.id)))
  await Promise.all(users.map(async u =>
    await u.pc.setLocalDescription(await u.pc.createOffer())))
  list = users.map(u => ({ id: u.id, offer: u.pc.localDescription }))
  await svr.send('create-webrtc-offer', { list, id: userid })
}

const createuser = (id, pc) => {
  const u = { pc, connected: false }, { dc } = pc
  u.wait = new Promise(a => u.acc = a); userlist[id] = u
  const send = (c, o) => {
    try {
      if (typeof c == 'string') { dc.send(JSON.stringify({ c, ...o })) }
      else { dc.send(c) }
    } catch (e) {
      console.warn(e)
    }
  }
  const handle = (c, f) => {

  }
  u.send = send; u.id = id; let fid
  dc.ordered = false
  let lastResult = {}
  dc.onopen = () => {
    u.connected = true; u.acc()
    fid = setInterval(() => {
      send('ping', { t: performance.now() })
      if (u.videoelement) { u.videoelement.innerText = '' }
      const a = []; for (const tp of pc.getTransceivers()) {
        a.push(tp.sender.getStats().then(res => {
          const a = []; res.forEach(v => a.push(v))
          for (const report of a) {
            if (report.type === 'outbound-rtp') {
              const now = report.timestamp
              const bytes = report.bytesSent
              const headerBytes = report.headerBytesSent
              const packets = report.packetsSent
              const lr = lastResult[report.id]; if (lr) {
                const bitrate = 8 * (bytes - lr.bytesSent) / (now - lr.timestamp)
                const headerrate = 8 * (headerBytes - lr.headerBytesSent) / (now - lr.timestamp)
                const packetrate = packets - lr.packetsSent
                return [report.kind, bitrate, headerrate, packetrate]
              } lastResult[report.id] = report
            }
          } return ['waiting...']
        }))
      } Promise.all(a).then(a => {
        if (!u.videoelement) { return }
        u.videoelement.innerHTML = a.map(a => a.join(' ')).join('<br>')
      })
    }, 1000)
  }
  dc.onclose = () => {
    delete userlist[id]; clearInterval(fid)
    log('lost connection with: ' + id.slice(0, 8))
  }
  dc.onmessage = async e => {
    if (typeof e.data === "string") {
      const o = JSON.parse(e.data); switch (o.c) {
        case 'ping': { send('ping-back', { t: o.t }) } break
        case 'ping-back': { const t = performance.now() } break
        case 'upgrade-offer': {
          const v = video(); v.muted = false; v.createtextforuser(u)
          pc.addEventListener('track', async e => {
            v.bindstream(e.streams[0])
            const t = e.track, tp = e.transceiver
            if (t.kind === 'video') {
              let { codecs: c } = await RTCRtpReceiver.getCapabilities('video')
              c = c.filter(c => c.mimeType.indexOf('H264') >= 0)
              log(t.kind, c)
              tp.setCodecPreferences(c)
            } else {
              // const { codecs: c } = await RTCRtpReceiver.getCapabilities('audio')
              // log(c)
            }
          })

          await pc.setRemoteDescription(o.offer)
          await pc.setLocalDescription(await pc.createAnswer())
          const answer = pc.localDescription
          // log(answer.sdp)
          answer.sdp = addsdpbandwidth(answer.sdp, desirevideobandwidth)
          // log(answer.sdp)
          send('upgrade-answer', { answer })
        } break
        case 'upgrade-answer': {
          await pc.setRemoteDescription(o.answer)
          for (const tp of pc.getTransceivers()) {
            const s = tp.sender, p = s.getParameters(), type = s.track.kind
            if (type === 'video') {
              p.encodings = [{ maxBitrate: desirevideobandwidth, priority: 'high' }]
            } else { p.encodings = [{ maxBitrate: 320 * 1000, priority: 'medium' }] }
            s.setParameters(p)
            const stats = await pc.getStats()
            stats.forEach(stat => {
              if (!(stat.type === 'outbound-rtp' && stat.kind === 'video')) { return; }
              const codec = stats.get(stat.codecId)
              log(codec)
            })
          }
        } break
        case 'upgrade-track-priority': {

        }
      }
    } else { }
  }; return u
}

const sp = new URLSearchParams(location.search)
const host = sp.get('host'), room = sp.get('room')
// let userid = localStorage.getItem("webrtc-userid")
// if (!userid) { localStorage.setItem("webrtc-userid", userid = uuid()) }
const userid = uuid()
log(userid)

const svr = wsserver(), userlist = {}
login()

svr.handle('icecandidate', async o => {
  const id = o.from, u = userlist[o.from]
  if (!u) { console.warn(`user: "${id}" not found`) } else {
    log(`from user ` + id.slice(0, 8), o.candidate.candidate)
    await u.pc.addIceCandidate(o.candidate)
  }
})
svr.handle('receive-webrtc-offer', async o => {
  if (o.r) {
    const id = o.from, pc = wrtcpeer(id); createuser(id, pc)
    await pc.setRemoteDescription(o.offer)
    await pc.setLocalDescription(await pc.createAnswer())
    const answer = pc.localDescription
    svr.send('send-webrtc-answer', { from: userid, to: id, answer })
  } else { }
})
svr.handle('receive-webrtc-answer', async o => {
  const u = userlist[o.from]
  if (u) { u.pc.setRemoteDescription(o.answer) }
})

const video = () => {
  const c = document.createElement('div')
  const t = document.createElement('span')
  const v = document.createElement('video')
  v.style.height = '400px'
  v.autoplay = true, v.playsInline = true
  v.muted = true, v.controls = true
  v.bindstream = s => { v.srcObject = s }
  v.createtextforuser = u =>
    t.append(u.videoelement = document.createElement('span'))
  document.body.append(c)
  c.append(v, v.t = t)
  return v
}

const addstreambutton = document.createElement("button")
addstreambutton.textContent = '+'
addstreambutton.addEventListener('click', async e => {
  if (e.button !== 0) { return }
  const constraints = {
    audio: {
      autoGainControl: false,
      echoCancellation: false,
      googAutoGainControl: false,
      noiseSuppression: false
    }, video: true
  }
  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: {
      autoGainControl: false,
      echoCancellation: false,
      googAutoGainControl: false,
      noiseSuppression: false
    }, video: { frameRate: 60 }
  })
  // const stream = await navigator.mediaDevices.getUserMedia(constraints)
  const v = video(), a = []; v.bindstream(stream);
  for (const k in userlist) { const u = userlist[k]; a.push(u); v.createtextforuser(u) }
  a.forEach(async u => {
    const pc = u.pc; await u.wait
    stream.getTracks().forEach(t => { pc.addTrack(t, stream) })
    await pc.setLocalDescription(await pc.createOffer())
    const offer = pc.localDescription
    offer.sdp = addsdpbandwidth(offer.sdp, desirevideobandwidth)
    u.send('upgrade-offer', { offer })
  })
})

const desirevideobandwidth = 10 * 1000 * 1000

const removesdpbandwidth = sdp => sdp.replace(/b=AS:.*\r\n/, '').replace(/b=TIAS:.*\r\n/, '')
const updatesdpbandwidth = (sdp, bandwidth) => {
  let modifier = 'AS';
  // if (adapter.browserDetails.browser === 'firefox') {
  //   bandwidth = (bandwidth >>> 0) * 1000;
  //   modifier = 'TIAS';
  // }
  if (sdp.indexOf('b=' + modifier + ':') === -1) {
    // insert b= after c= line.
    sdp = sdp.replace(/c=IN (.*)\r\n/, 'c=IN $1\r\nb=' + modifier + ':' + bandwidth + '\r\n');
  } else {
    sdp = sdp.replace(new RegExp('b=' + modifier + ':.*\r\n'), 'b=' + modifier + ':' + bandwidth + '\r\n');
  }
  return sdp;
}
const addsdpbandwidth = (sdp, bandwidth = 100000) => {
  const a = sdp.split(/\r?\n/)
  a.forEach((s, i) => {
    if (/^a=fmtp:\d*/.test(s)) {
      a[i] = s + `;x-google-max-bitrate=${bandwidth};x-google-min-bitrate=${bandwidth};x-google-start-bitrate=${bandwidth}`;
    } else if (/^a=mid:(1|video)/.test(s)) {
      a[i] += `\r\nb=AS:${bandwidth}`
    }
  })
  log(a.join('\r\n'))
  return a.join('\r\n')
}
document.body.append(addstreambutton)