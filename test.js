const hypercore = require('hypercore')
const RAM = require('random-access-memory')
const test = require('tape')

const HypercorePresence = require('./')

test('Basic presence test', (t) => {
  const feed1 = hypercore(RAM)
  feed1.ready(() => {
    const feed2 = hypercore(RAM, feed1.key)
    feed2.ready(() => {
      const p1 = new HypercorePresence({ feed: feed1 })
      const p2 = new HypercorePresence({ feed: feed2 })
    })
  })
})

function replicate (feed1, feed2) {
  const stream1 = feed1.replicate(true)
  const stream2 = feed2.replicate(false)

  stream1.pipe(stream2).pipe(stream1)
}
