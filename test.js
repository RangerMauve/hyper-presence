const SDK = require('dat-sdk')
const RAM = require('random-access-memory')
const test = require('tape')

const HypercorePresence = require('./')

test('Basic presence test  / data propogation', (t) => {
  t.plan(6)

  Promise.all([
    SDK({ storage: RAM }),
    SDK({ storage: RAM })
  ]).then(([
    { Hypercore: Hypercore1, close: close1, keyPair: keyPair1 },
    { Hypercore: Hypercore2, close: close2, keyPair: keyPair2 }
  ]) => {
    const feed1 = Hypercore1('Test')
    feed1.ready(() => {
      const feed2 = Hypercore2(feed1.key)
      feed2.ready(() => {
        var p1 = new HypercorePresence(feed1, { id: keyPair1.publicKey })
        var p2 = new HypercorePresence(feed2, { id: keyPair2.publicKey })

        p1.setData({ message: 'Hello' })
        p2.setData({ message: 'World!' })

        t.ok(p1.id, 'Generated id 1')
        t.ok(p2.id, 'Generated id 2')

        p1.on('online', handleOnline)
        p2.on('online', handleOnline)

        p1.on('peer-remove', handleDisconnect)

        let hasFinished = false

        function handleOnline (list) {
          if (list.length === 2) {
            const peerData1 = p1.getPeerData(p2.id)
            const peerData2 = p2.getPeerData(p1.id)
            const hasP1 = peerData1 && Object.keys(peerData1).length
            const hasP2 = peerData2 && Object.keys(peerData2).length
            if (!hasP1 || !hasP2) return

            p1.removeListener('online', handleOnline)
            p2.removeListener('online', handleOnline)

            setTimeout(() => {
              t.pass('Seeing everyone online')

              t.deepEqual(peerData1, p2.data, 'Got peer data from peer 2')
              t.deepEqual(peerData2, p1.data, 'Got peer data from peer 2')

              hasFinished = true

              feed2.close()
            }, 1000)
          }
        }

        function handleDisconnect () {
          if (!hasFinished) return t.error('Disconnected before finished')
          t.pass('Peer removed on disconnect')
          t.end()

          close1()
          close2()
        }
      })
    })
  }, (e) => t.error(e))
})
