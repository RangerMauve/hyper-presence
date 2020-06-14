const hypercore = require('hypercore')
const RAM = require('random-access-memory')
const test = require('tape')

const HypercorePresence = require('./')

test('Basic presence test  / data propogation', (t) => {
  const feed1 = hypercore(RAM)
  feed1.ready(() => {
    const feed2 = hypercore(RAM, feed1.key)
    feed2.ready(() => {
      const p1 = new HypercorePresence(feed1)
      const p2 = new HypercorePresence(feed2)

      p1.setData({ message: 'Hello' })
      p2.setData({ message: 'World!' })

      t.pass(p1.id, 'Generated id 1')
      t.pass(p2.id, 'Generated id 2')

      p1.on('online', handleOnline)

      function handleOnline (list) {
        if (list.length === 2) {
          const peerData = p1.getPeer(p2.id)
          if (!Object.keys(peerData).length) return

					t.pass('Seeing everyone online')

          p1.removeListener('online', handleOnline)

          t.deepEqual(p2.data, peerData, 'Got peer data')
          t.end()
        }
      }

      replicate(feed1, feed2)
    })
  })
})

function replicate (feed1, feed2) {
  const stream1 = feed1.replicate(true)
  const stream2 = feed2.replicate(false)

  stream1.pipe(stream2).pipe(stream1)
}
