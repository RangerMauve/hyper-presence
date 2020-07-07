const hypercore = require('hypercore')
const RAM = require('random-access-memory')
const test = require('tape')

const HypercorePresence = require('./')

test('Basic presence test  / data propogation', (t) => {
  t.plan(6)

  const feed1 = hypercore(RAM)
  feed1.ready(() => {
    const feed2 = hypercore(RAM, feed1.key)
    feed2.ready(() => {
      const p1 = new HypercorePresence(feed1)
      const p2 = new HypercorePresence(feed2)

      p1.setData({ message: 'Hello' })
      p2.setData({ message: 'World!' })

      t.ok(p1.id, 'Generated id 1')
      t.ok(p2.id, 'Generated id 2')

      p1.on('online', handleOnline)
      p2.on('online', handleOnline)

      p1.on('peer-remove', handleDisconnect)

      const stream1 = feed1.replicate(true)
      const stream2 = feed2.replicate(false)

      stream1.pipe(stream2).pipe(stream1)

      let hasFinished = false

      function handleOnline (list) {
        if (list.length === 2) {
          const peerData1 = p1.getPeerData(p2.id)
          const peerData2 = p2.getPeerData(p1.id)
          const hasP1 = peerData1 && Object.keys(peerData1).length
          const hasP2 = peerData2 && Object.keys(peerData2).length
          if (!hasP1 || !hasP2) return

          t.pass('Seeing everyone online')

          p1.removeListener('online', handleOnline)
          p2.removeListener('online', handleOnline)

          t.deepEqual(peerData1, p2.data, 'Got peer data from peer 2')
          t.deepEqual(peerData2, p1.data, 'Got peer data from peer 2')

          hasFinished = true

          feed1.close()
        }
      }

      function handleDisconnect () {
        if (!hasFinished) return t.error('Disconnected too early')
        t.pass('Peer removed on disconnect')
        t.end()
      }
    })
  })
})
