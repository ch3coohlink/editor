const basepath = __dirname
const http = require('http')
const fs = require('fs')
const path = require('path')
const ws = require('ws')
const { log } = console
const port = 8642

const args = {}; process.argv.forEach(
  t => { let [k, v] = t.split("="); args[k.replace(/^-*/, '')] = v })
const room = args.room
if (!room) { throw new Error('room id is required') }

const debounce = (f, t = 100, i) => (...a) =>
  (clearTimeout(i), i = setTimeout(() => f(...a), t))

const users = new Map
const wss = new ws.WebSocketServer({ port })
const sendws = ws => (c, o) => {
  if (!("r" in o)) { o.r = 1 }
  ws.send(JSON.stringify({ c, ...o }))
}
wss.on('connection', ws => {
  log('establish connection')
  ws.on('error', console.error)

  const send = sendws(ws)
  const goon = (c, o) => {
    let mid = mesid++; o.m = mid; send(c, o);
    return new Promise((r, j) => _hs[mid] =
      o => { if (o.r) { r(o) } else { j(o) } })
      .finally(() => delete _hs[mid])
  }; let _hs = {}, mesid = 0
  const handle = (c, f) => _hs[c] = f
  ws.on('message', async data => {
    const o = JSON.parse(data.toString())
    const { c, m } = o; let f = _hs[m]
    if (f) { f(o); delete _hs[m]; return }
    f = _hs[c]; if (f) { f(o); return }
    console.warn(`cannot handle message type: ${c}`)
  })
  ws.on('close', () => {
    log('close connection')
    if (id) { users.delete(id) }
  })

  let id, tid = setTimeout(() => { ws.close() }, 1000)
  handle('heartbeat', () => { })
  handle('login', o => {
    if (o.room !== room) {
      send(o.c, { m: o.m, r: 0, e: "wrong room id" })
      ws.close()
    } else {
      const userlist = [...users].map(([_, v]) => ({ id: v.id }))
      send(o.c, { m: o.m, userlist })
      id = o.userid; users.set(id, { id, ws })
    } clearTimeout(tid)
  })
  handle('create-webrtc-offer', o => {
    const from = o.id; for (const u of o.list) {
      const d = users.get(u.id), { offer } = u
      if (d) { sendws(d.ws)('receive-webrtc-offer', { from, offer }) }
      else { console.warn(`user: "${u.id}" not found`) }
    }
  })
  handle('send-webrtc-answer', o => {
    const d = users.get(o.to), { from, answer } = o
    if (d) { sendws(d.ws)('receive-webrtc-answer', { from, answer }) }
    else { console.warn(`user: "${o.to}" not found`) }
  })
  handle('icecandidate', o => {
    const d = users.get(o.to), { from, candidate } = o
    if (d) { sendws(d.ws)('icecandidate', { from, candidate }) }
    else { console.warn(`user: "${o.to}" not found`) }
  })
})

log(`listening on localhost:${port}`)