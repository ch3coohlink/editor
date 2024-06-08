let $ = {}; {
  globalThis.log = console.log
  globalThis.dlog = console.dir
  globalThis.__require = base => async path => {
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

  let waitload = new Map
  let load = async path => new Promise((res, rej) => {
    send({ command: 'load', path })
    waitload.set(path, { res, rej })
  })

  const send = postMessage
  addEventListener('message', e => {
    const o = e.data
    if (o.command === 'init') { exec(o.path, o.content) }
    else if (o.command === 'initfail') { console.error(o.error) }
    else if (o.command === 'load') {
      waitload.get(o.path).res(o.content)
      waitload.delete(o.path)
    } else if (o.command === 'loadfail') {
      waitload.get(o.path).rej(o.error)
      waitload.delete(o.path)
    }
  })
  setInterval(() => send({ command: 'heartbeat' }), 500)
}