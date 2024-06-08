// 01.js - iframe deadlooop

const i = document.createElement('iframe')
i.sandbox = 'allow-scripts'
// i.src = 'http://localhost:9999/dev.html?load=editor/sandbox/deadloop.js'
document.body.append(i)
setInterval(() => log('not locked'), 500)