// 02 - web worker deadloop

// this freeze page because log will shown in main thread (dev tool)
// let w = new Worker('/editor/sandbox/deadloop.js')
// this works fine
let w = new Worker('/editor/sandbox/deadloop2.js')

setTimeout(() => (w.terminate(), log('worker terminated')), 100)
setInterval(() => log('not locked'), 500)