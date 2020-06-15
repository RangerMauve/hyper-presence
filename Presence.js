const EventEmitter = require('events')
const { DiGraph, hasPath } = require('jsnetworkx')
const codecs = require('codecs')

const { Type, Message } = require('./messages')

const DEFAULT_ENCODING = 'json'

module.exports = class Presence extends EventEmitter {
  constructor (id, { encoding } = {}) {
    super()
    if (!id) throw new TypeError('Must provide id for self')

    this.id = id.toString('hex')

    this.bootstrapped = false
    this.graph = new DiGraph()
    this.connectedTo = new Set()
    this.data = {}
    this.encoding = codecs(encoding || DEFAULT_ENCODING)
    this.online = [id]
  }

  broadcast (data, ttl) {
    throw new TypeError('Broadcast has not been implemented')
  }

  setData (data) {
    this.data = data

    this._setPeer(this.id, data)

    this._broadcastData()
  }

  _broadcastData () {
    const rawData = this.data
    if (!rawData) return
    const data = this.encoding.encode(rawData)
    this.broadcast(Message.encode({
      type: Type.STATE,
      data
    }))
  }

  onAddPeer (id) {
    this.connectedTo.add(id.toString('hex'))

    this._addPeerConnection(this.id, id)

    this.emit('peer-add', id)

    this._recalculate()

    this.broadcast(Message.encode({
      type: Type.CONNECTED,
      id
    }))

    this._broadcastData()

    if (this.bootstrapped) return

    // If this is the first person we've met, get their graph
    this.broadcast(Message.encode({
      type: Type.BOOTSTRAP_REQUEST
    }), 0)
  }

  onRemovePeer (id) {
    this.connectedTo.delete(id.toString('hex'))

    this._removePeerConnection(this.id, id)

    this.emit('peer-remove')

    this._recalculate()

    this.broadcast(Message.encode({
      type: Type.DISCONNECTED,
      id
    }))
  }

  onGetBroadcast (message, id) {
    const decoded = Message.decode(message)
    const { type } = decoded
    if (!type) throw new Error('Missing Type In Message')

    if (type === Type.STATE) {
      const { data: rawData } = decoded
      const data = this.encoding.decode(rawData)
      this._setPeer(id, data)
      this.emit('peer-data', data, id)
      this._recalculate()
    } else if (type === Type.CONNECTED) {
      const { id: toId } = decoded
      this._addPeerConnection(id, toId)
      this.emit('peer-add-seen', id, toId)
      this._recalculate()
    } else if (type === Type.DISCONNECTED) {
      const { id: toId } = decoded
      this._removePeerConnection(id, toId)
      this.emit('peer-remove-seen', id, toId)
      this._recalculate()
    } else if (type === Type.BOOTSTRAP_REQUEST) {
      const bootstrap = this._getBootstrapInfo()
      this.broadcast(Message.encode({
        type: Type.BOOTSTRAP_RESPONSE,
        bootstrap
      }), 0)
    } else if (type === Type.BOOTSTRAP_RESPONSE) {
      const { bootstrap } = message
      this._bootstrapFrom(bootstrap)
    }
  }

  _hasSeenPeer (id) {
    return this.graph.hasNode(id.toString('hex'))
  }

  _setPeer (id, data) {
    this.graph.addNode(id.toString('hex'), data)
  }

  _removePeer (id) {
    this.graph.removeNode(id.toString())
  }

  _ensurePeer (id) {
    if (!this._hasSeenPeer(id)) this._setPeer(id, {})
  }

  _addPeerConnection (origin, destination) {
    this._ensurePeer(origin)
    this._ensurePeer(destination)
    this.graph.addEdge(origin.toString('hex'), destination.toString('hex'))
  }

  _removePeerConnection (origin, destination) {
    this._ensurePeer(origin)
    this._ensurePeer(destination)
    this.graph.removeEdge(origin.toString('hex'), destination.toString('hex'))
  }

  _bootstrapFrom (bootstrap) {
    if (this.bootstrapped) return

    for (const id in bootstrap) {
      const { data, connectedTo } = bootstrap[id]
      const parsedData = data ? this.encoding.decode(data) : null
      if (id === this.id) continue
      this._removePeer(id)
      this._setPeer(id, parsedData)
      for (const connection of connectedTo) {
        this._addPeerConnection(id, connection)
      }
    }

    this.emit('bootstrapped')

    this._recalculate()
  }

  _getBootstrapInfo () {
    const state = {}
    for (const [id, rawData] of this.graph.nodes(true)) {
      const connectedTo = this.graph.neighbors(id).map((id) => Buffer.from(id, 'hex'))
      const data = rawData ? this.encoding.encode(rawData) : null
      state[id] = { data, connectedTo }
    }

    return state
  }

  // Calculate who's online and emit an event
  _recalculate () {
    const online = this.graph.nodes().filter((id) => {
      return hasPath(this.graph, { source: this.id, target: id })
    })

    const offline = this.graph.nodes().filter((id) => {
      return !hasPath(this.graph, { source: this.id, target: id })
    })

    for (const id of offline) this.graph.removeNode(id)

    this.online = online

    this.emit('online', online)
  }

  getPeerData (id) {
    return this.graph.node.get(id.toString('hex'))
  }
}
