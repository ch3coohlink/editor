const basepath = __dirname
const http = require('http')
const fs = require('fs')
const path = require('path')
const ws = require('ws')
const { log } = console
const port = 9999

const mime = {
  "html": "text/html",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "png": "image/png",
  "svg": "image/svg+xml",
  "json": "application/json",
  "js": "application/javascript",
  "css": "text/css"
}
const server = http.createServer((req, res) => {
  let u = new URL('https://localhost' + req.url)
  let s = fs.createReadStream(path.join(basepath, decodeURI(u.pathname)))
  s.on('error', () => (res.writeHead(404), res.end())); s.pipe(res)
  res.setHeader('Content-Type', mime[u.pathname.split('.').pop()] ?? 'text/plain')
}).listen(port)

const watches = new Map
fs.watch('.', { recursive: true }, (e, path) => {
  if (typeof path !== 'string') { return }
  path = path.replaceAll('\\', '/')
  for (const [, { watch, reload }] of watches) {
    if (watch.has(path)) { reload() }
  }
})

const debounce = (f, t = 100, i) => (...a) =>
  (clearTimeout(i), i = setTimeout(() => f(...a), t))
const reload = ws => debounce(() => ws.send(JSON.stringify({ command: 'reload' })))

const wss = new ws.WebSocketServer({ server })
wss.on('connection', ws => {
  log('establish connection')
  let watch = new Set(['dev.html'])
  watches.set(ws, { watch, reload: reload(ws) })
  ws.on('error', console.error)
  ws.on('message', async data => {
    const o = JSON.parse(data.toString())
    if (o.command === 'init' || o.command === 'load') {
      try {
        const f = await fs.promises.readFile(o.path); watch.add(o.path)
        ws.send(JSON.stringify({ command: o.command, path: o.path, content: f.toString() }))
      } catch (e) {
        ws.send(JSON.stringify({ command: o.command + 'fail', error: e.message, path: o.path }))
      }
    } else if (o.command === 'listrepo') {
      if (!o.repo || typeof o.repo !== 'string') {
        ws.send(JSON.stringify({ id: o.id, error: 'Invalid input' }))
      } const rs = `./repo/${o.repo}/`; try {
        await fs.promises.mkdir(rs, { recursive: true })
        const f = await fs.promises.readFile(rs + hashlist.json)
        ws.send(JSON.stringify({ id: o.id, list: f.toString() }))
      } catch (e) { ws.send(JSON.stringify({ id: o.id, error: e.message })) }
    } else if (o.command === 'writerepo') {
      if (!o.repo || typeof o.repo !== 'string') {
        ws.send(JSON.stringify({ id: o.id, error: 'Invalid input' }))
      } const rs = `./repo/${o.repo}/`; try {
        await fs.promises.writeFile(rs + o.name, o.text)
        ws.send(JSON.stringify({ id: o.id }))
      } catch (e) { ws.send(JSON.stringify({ id: o.id, error: e.message })) }
    }
  })
  ws.on('close', () => {
    log('close connection')
    watches.delete(ws)
  })
})

log(`listening on localhost:${port}`)