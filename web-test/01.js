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

const wrtcpeer = () => {
  let cfg = { iceTransportPolicy: 'all' }
  let urls = ['stun:stun.qq.com:3478']
  // let urls = ['stun:freeturn.net:5349']
  cfg.iceServers = [{ urls }]

  let pc = new RTCPeerConnection(cfg), acc
  pc.waitice = new Promise(r => acc = r)
  pc.onicecandidate = e => { if (e.candidate == null) { acc() } }
  let dc = pc.createDataChannel('dch', { negotiated: true, id: 0 })
  dc.bufferedAmountLowThreshold = 1024 * 1024 * 1024 * 10
  // dc.addEventListener("bufferedamountlow", log)
  pc.dc = dc; return pc
}, wrtcoffer = async () => {
  let pc = wrtcpeer()
  let ofr = await pc.createOffer()
  await pc.setLocalDescription(ofr)
  await pc.waitice
  return pc
}, wrtanswer = async (ofr) => {
  let pc = wrtcpeer()
  await pc.setRemoteDescription(ofr)
  let ans = await pc.createAnswer()
  await pc.setLocalDescription(ans)
  await pc.waitice
  return pc
}

const login = async () => {
  await svr.connect()
  try {
    const o = await svr.goon('login', { userid, room })
    await setup_connection(o)
  } catch (o) {
    console.warn(o.e ?? 'failed to signup with unknown reason')
    delete svr.ws.onclose
  }
}, setup_connection = async o => {
  const ul = o.userlist
  const needconnection = []; for (const u of ul) {
    if (!userlist[u.id]?.connected) { needconnection.push(u) }
  } let a = await Promise.all(needconnection.map(() => wrtcoffer()))
  needconnection.forEach((u, i) =>
    userlist[u.id] = { pc: a[i], connected: false })
  const list = needconnection.map((u, i) => {
    const pc = a[i]
    attach_data_channel(u.id)
    const offer = JSON.stringify(pc.localDescription)
    return ({ ...u, offer })
  })
  await svr.send('create-webrtc-offer', { list, id: userid })
}

const attach_data_channel = id => {
  const u = userlist[id], pc = u.pc, dc = pc.dc
  const send = (c, o) => {
    try {
      if (typeof c == 'string') { dc.send(JSON.stringify({ c, ...o })) }
      else { dc.send(c) }
    } catch (e) {
      log(e.message)
    }
  }
  u.send = send; let fid, fid2
  dc.ordered = false
  dc.onopen = () => {
    log('connected to ' + id)
    u.connected = true; fid = setInterval(() => {
      log(datasize)
      datasize = 0
      send('ping', { t: performance.now() })
      for (let i = 0; i < numpack; i++) {
        send(new ArrayBuffer(packsize * 1024))
      }
    }, 1000)
    const f = () => {
      // fid2 = setTimeout(f, 1000)
      // for (let i = 0; i < numpack; i++) {
      //   send(new ArrayBuffer(packsize * 1024))
      // }
    }
    f()
  }
  dc.onclose = () => { delete userlist[id]; clearInterval(fid); clearTimeout(fid2) }
  let datasize = 0, packsize = 16 * 16, numpack = 63
  dc.onmessage = e => {
    if (typeof e.data === "string") {
      const o = JSON.parse(e.data)
      if (o.c === 'ping') {
        send('ping-back', { t: o.t })
      } else if (o.c === 'ping-back') {
        const t = performance.now()
        // log(id, (t - o.t) / 2 + 'ms')
      }
    } else { datasize += packsize * numpack }
    // const d = document.createElement('div')
    // const t = Date.parse(new Date())
    // log(t, o.time, t - o.time)
    // d.textContent = [id.slice(0, 6), new Date(o.time), o.text].join(" ")
    // document.body.append(d)
  }
}

const sp = new URLSearchParams(location.search)
const host = sp.get('host'), room = sp.get('room')
// let userid = localStorage.getItem("webrtc-userid")
// if (!userid) { localStorage.setItem("webrtc-userid", userid = uuid()) }
const userid = uuid()
log(userid)

const svr = wsserver(), userlist = {}
login()

svr.handle('receive-webrtc-offer', async o => {
  if (o.r) {
    const pc = await wrtanswer(JSON.parse(o.offer)), id = o.from
    userlist[id] = { pc, connected: false }
    attach_data_channel(id)
    const answer = JSON.stringify(pc.localDescription)
    svr.send('send-webrtc-answer', { from: userid, to: id, answer })
  } else { }
})
svr.handle('receive-webrtc-answer', async o => {
  const u = userlist[o.from]
  if (u) { u.pc.setRemoteDescription(JSON.parse(o.answer)) }
})
//# sourceURL=7bF10sAz0.js