const HyperFlood = require('hyper-flood')

const Presence = require('./Presence')

const DEFAULT_EXTENSION = 'hyper-presence'

// Give half a second to get reconnected when disconnecting before making it final. 😁
const DISCONNECT_SMOOTH = 500

module.exports = class HypercorePresence extends Presence {
  constructor (feed, { id, extension = DEFAULT_EXTENSION, data = {}, ...opts } = {}) {
    if (!id && feed.noiseKeyPair) id = feed.noiseKeyPair.publicKey
    if (!id) throw new TypeError('Your ID should be provided and should be the public Key for your hypercore replication')

    const flood = new HyperFlood({ id, ...opts })

    super(id, opts)

    this.flood = flood
    this.feed = feed
    this.ext = feed.registerExtension(extension, flood.extension())

    feed.on('peer-open', (peer) => this.handlePeerAdd(peer))
    feed.on('peer-remove', (peer) => this.handlePeerRemove(peer))
    flood.on('message', (message, id) => this.onGetBroadcast(message, id))

    this.setData(data)

    if (feed.peers && feed.peers.length) {
      for (const peer of feed.peers) {
        this.handlePeerAdd(peer)
      }
    }
  }

  handlePeerAdd (peer) {
    const id = peer.remotePublicKey
    this.onAddPeer(id)
  }

  handlePeerRemove (peer) {
    const id = peer.remotePublicKey
    // Wait for a bit and check if we're still disconnected before removing the peer
    setTimeout(() => {
      const stillConnected = this.feed.peers.find((existing) => {
        return (existing !== peer) && existing.remotePublicKey.equals(id)
      })
      if (stillConnected) return
      this.onRemovePeer(id)
    }, DISCONNECT_SMOOTH)
  }

  broadcast (message, ttl) {
    this.flood.broadcast(message, ttl)
  }
}
