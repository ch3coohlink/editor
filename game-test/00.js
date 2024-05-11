await require("../common/basic.js")

// there are humans in the world
const humans = []

// we got some humans at the beginning
const example_human = {}, eh = example_human
humans.push(eh)

// a human has need
eh.need = {}

// basic need like eat and sleep
eh.need.eat, eh.need.sleep

// eat has a value, many event effect it
eh.need.eat = 100

// and so do sleep
eh.need.sleep = 100

// human can take some action to do
eh.action = []

// like eat
const action_eat = { name: 'eat' }, ae = action_eat
eh.action.push(ae)

// a human has some probability to take this action
ae.probability = t => 0.5
// effect: t => t.need.eat,
// require: t => true

// time passes, we have a tick function for it
const event_functions = []
const tick = () => {
  for (const f of event_functions) { f() }
  requestAnimationFrame(tick)
}; requestAnimationFrame(tick)

// 
event_functions.push(() => {

})

// maybe prepare a story script for this game