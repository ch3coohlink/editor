// 02 - audio worklet
const wa = new AudioContext()

const src = await readfile('worklet01.js')
const blob = new Blob([src], { type: 'application/javascript' })

await wa.audioWorklet.addModule(URL.createObjectURL(blob))
const osc = wa.createOscillator()
const bypass = new AudioWorkletNode(wa, 'worklet01')
osc.connect(bypass).connect(wa.destination)
osc.start()

{
  const b = document.createElement('button')
  b.textContent = 'play'
  b.onclick = () => wa.resume()
  document.body.append(b)
} {
  const b = document.createElement('button')
  b.textContent = 'stop'
  b.onclick = () => wa.suspend()
  document.body.append(b)
}