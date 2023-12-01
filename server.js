const basepath = __dirname
const http = require('http')
const fs = require('fs')
const path = require('path')
const ws = require('ws')
const { log } = console
const port = 9999

const server = http.createServer((req, res) => {
  let u = new URL("https://localhost" + req.url)
  let s = fs.createReadStream(path.join(basepath, u.pathname))
  s.on('error', () => (res.writeHead(404), res.end()))
  s.pipe(res)
}).listen(port)

const watchs = new Map
// TODO watch file change

const wss = new ws.WebSocketServer({ server })
wss.on('connection', ws => {
  let watch = new Set; watchs.set(ws, watch)
  ws.on('error', console.error)
  ws.on('message', async data => {
    const o = JSON.parse(data.toString())
    if (o.command === "init" || o.command === "load") {
      try {
        const f = await fs.promises.readFile(o.path); watch.add(o.path)
        ws.send(JSON.stringify({ command: o.command, path: o.path, content: f.toString() }))
      } catch (e) {
        ws.send(JSON.stringify({ command: o.command + "fail", error: e.message, path: o.path }))
      }
    }
  })
  ws.on('close', () => watch.delete(ws))
})

log(`listening on localhost:${port}`)