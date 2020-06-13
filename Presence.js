const EventEmitter = require('events')
const { DiGraph, hasPath } = require('jsnetworkx')

const TYPE_STATE = 'state'
const TYPE_CONNECTED = 'connected'
const TYPE_DISCONNECTED = 'disconnected'
const TYPE_BOOTSTRAP_REQUEST = 'bootstrap::request'
const TYPE_BOOTSTRAP_RESPONSE = 'bootstrap::response'

module.exports = class Presence extends EventEmitter {
  constructor ({ broadcast, sendTo, id, data = {} }) {
    super()
    if (!broadcast) throw new TypeError('Must provide broadcast function')
    if (!sendTo) throw new TypeError('Must provide sendTo function')
    if (!id) throw new TypeError('Must provide id for self')

    this.broadcast = broadcast
    this.sendTo = sendTo
    this.id = id.toString('hex')

    this.bootstrapped = false
    this.graph = new DiGraph()
    this.connectedTo = new Set()

    this.setData(data)
  }

  setData (data) {
    this.data = data

    this.graph.addNode(this.id, this.data)

    this.broadcast({
      type: TYPE_STATE,
      data
    })
  }

  onAddPeer (id) {
    this.connectedTo.add(id.toString('hex'))
    this.recalculate()
    this.broadcast({
      type: TYPE_CONNECTED,
      id
    })

    if (this.bootstrapped) return
    this.sendTo(id, {
      type: TYPE_BOOTSTRAP_REQUEST
    })
  }

  onRemovePeer (id) {
    this.connectedTo.delete(id.toString('hex'))
    this.recalculate()
    this.broadcast({
      type: TYPE_DISCONNECTED,
      id
    })
  }

  onGetBroadcast (message, id) {
    const { type } = message
    if (!type) throw new Error('Missing Type In Message')

    if (type === TYPE_STATE) {
      const { data } = message
      this.graph.addNode(id, data)
      this.emit('peer-data', data, id)
    } else if (type === TYPE_CONNECTED) {
      this.graph.addEdge(this.id, id)
      this.emit('peer-add', id)
      this.recalculate()
    } else if (type === TYPE_DISCONNECTED) {
      this.graph.removeEdge(this.id, id)
      this.emit('peer-remove', id)
      this.recalculate()
    } else if (type === TYPE_BOOTSTRAP_REQUEST) {
      const bootstrap = this.getBootstrap()
      this.sendTo(id, {
        type: TYPE_BOOTSTRAP_RESPONSE,
        bootstrap
      })
    } else if (type === TYPE_BOOTSTRAP_RESPONSE) {
      const { bootstrap } = message
      this.bootstrapFrom(bootstrap)
    }
  }

  bootstrapFrom (bootstrap) {
    if (this.bootstrapped) return

    for (const id in bootstrap) {
      const { data, connectedTo } = bootstrap[id]
      if (id === this.id) continue
      this.graph.removeNode(id)
      this.graph.addNode(id, data)
      for (const connection of connectedTo) {
        this.graph.addEdge(id, connection)
      }
    }
  }

  getState () {
    const state = {}
    for (const [id, data] of this.nodes(true)) {
      const connectedTo = this.graph.neighbors(id)

      state[id] = { data, connectedTo }
    }

    return state
  }

  // Calculate who's online and emit an event
  recalculate () {
    const online = this.graph.nodes().filter((id) => {
      return hasPath(this.graph, { source: this.id, target: id })
    })

    const offline = this.graph.nodes().filter((id) => {
      return !hasPath(this.graph, { source: this.id, target: id })
    })

    for (const id of offline) this.graph.removeNode(id)

    this.emit('online', online)
  }

  getPeerData (id) {
    return this.graph.node.get(id)
  }
}
