// 01 - iframe deadlooop

const i = document.createElement('iframe')
i.sandbox = 'allow-scripts'
// load either of these pages cause page freeze
// i.src = 'http://localhost:9999/dev.html?load=editor/sandbox/deadloop.js'
// i.src = 'http://localhost:9999/dev.html?load=editor/sandbox/deadloop2.js'
document.body.append(i)
setInterval(() => log('not locked'), 500)