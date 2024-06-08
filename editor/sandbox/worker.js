let $ = {}; {
  window.log = console.log
  window.dlog = console.dir
  window.__require = base => async path => {
    let b = base.split('/'); path = path.split('/'); for (const p of path) {
      if (p === '..') { b.pop() } else if (p !== '.') { b.push(p) }
    } path = b.filter(v => v).join('/'); if (loaded.has(path)) { return }
    await exec(path, await load(path))
  }

  let loaded = new Set, AF = (async () => { }).constructor
  const exec = async (path, src) => (loaded.add(path), await (
    new AF('$', `//# sourceURL=${path}\n` +
      `const __dirname = '${path.split('/').slice(0, -1).join('/')}'\n` +
      `const require = __require(__dirname)\n` + `with($) {\n${src}\n}`)($)))

  let waitload = new Map, inited = false
  let load = async path => new Promise((res, rej) => {
    ws.send(JSON.stringify({ command: 'load', path }))
    waitload.set(path, { res, rej })
  })

  const sp = new URLSearchParams(location.search)
  const initpath = sp.get('load') ?? sp.get('init')
  document.title = decodeURI(initpath)
  let ws, connect = () => {
    ws = new WebSocket((window.location.protocol === 'https:'
      ? 'wss:' : 'ws:') + '//' + window.location.host)
    ws.onopen = () => ws.send(JSON.stringify({ command: 'init', path: initpath }))
    ws.onmessage = e => {
      const o = JSON.parse(e.data)
      if (o.command === 'init' && !inited) {
        inited = true, exec(initpath, o.content)
      } else if (o.command === 'load') {
        waitload.get(o.path).res(o.content)
        waitload.delete(o.path)
      } else if (o.command === 'loadfail') {
        waitload.get(o.path).rej(o.error)
        waitload.delete(o.path)
      } else if (o.command === 'reload') { location.reload() }
      else if (o.command === 'initfail') { console.error(o.error) }
    }
    ws.onclose = connect
  }; connect(), setInterval(() => ws ? ws.send(
    JSON.stringify({ command: 'heartbeat' })) : 0, 1000 * 60)
}