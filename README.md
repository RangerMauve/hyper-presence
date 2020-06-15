# hyper-presence
Detect who's actively online using gossip over hypercore-protocol

## Usage

```
npm i --save hyper-presence
```

```js
const HypercorePresence = require('hyper-presence')

const feed = getHypercoreFromSomewhere()

const presence = new HypercorePresence(feed)

presence.setData({
	"hello": "world"
})

presence.on('online', (list) => {
	for(let id of list) {
		const peerData = presence.getPeerData(id)
		console.log('Online peer:', id, peerData)
	}
})
```

## API

### `const presence = new HypercorePresence(feed, {extension, data, encoding, id})`

Initialize a hypercore presence instance attached to a hypercore.

- `feed`: A `hypercore` instance to attach to. Make sure the hypercore is `ready` before attaching to it.
- `extension`: The extension message name to use over the replication stream. Default: `hyper-presence`
- `encoding`: The encoding for peers' `data`. Default: `json`
- `id`: The  id for this peer in the network. Should be the same as the replication public key
- `data`: The default data to advertise on the network. Default `{}`.

### `presence.on('bootstrapped')`

Emitted when you have bootstrapped with a peer in the network.

### `presence.on('online', list)`

Emitted whenever something in the network changes and there's a list of people online.

- `list`: A list of IDs of peers that are currently online in the network. You might not be connected to some of them directly.

### `presence.on('peer-data', data, id)`

Emitted whenever a peer updates their state.

- `data` is an object representing the peer's state
- `id` is the id of the peer in the network

### `presence.on('peer-add', id)`

Emitted whenever a peer has been connected to.

- `id` is the id of the peer in the network

### `presence.on('peer-remove', id)`

Emitted when you lose a connection to a peer.

- `id` is the id of the peer in the network.

### `presence.on('peer-add-seen', source, destination)

Emitted when you get notified that a peer in the network has connected to someone.

### `presence.on('peer-remove-seen', source, destination)

Emitted when you get notified that a peer in the network has disconnected from someone.

### `presence.online`

The current list of known online peers. This gets updated every time we get network events.

### `presence.data`

Get the current data being sent over to other peers.

### `presence.setData(data)`

Update the data being advertised to the rest of the network.

- `data`: An object that other peers in the network will see for this user.

### `const data = presence.getPeerData(id)`

Get the data being advertised by a specific peer.

- `id`: The ID of the peer you want to get data from
- `data`: An object with the data the peer id advertising. `null` if it's an invalid peer.

## How it works

- Peers keep an internal graph with the state of other peers
- Communication is facilitatied with flooding broadcasts over the hypercore replicaiton protocol
- When peers first boot up, they will ask their first peer for a copy of their graph to bootstrap
- From there, peers will broadcast whenever they've connected or disconnected from somebody.
- Other peers will listen to these messages and update their local graphs
- The data tracked per peer is their list of outgoing connections
- A peer is considered `online` if there are connections going from the current peer to them
- This should be calculated every time the connections change
- Peers that are no longer `online` will be pruned from the graph

---

## Credits

Ce logiciel a été créé dans le cadre du projet de plateforme virtuelle de création autochtone P2P Natakanu. Une réalisation de Wapikoni Mobile, Uhu Labos Nomades et du Bureau de l'engagement communautaire de l'université Concordia. Projet financé dans le cadre de l'Entente sur le développement culturel de Montréal conclue entre la Ville de Montréal et gouvernement du Québec.

---

This software was created as part of Natakanu, a P2P indigenous  platform produced by Wapikoni Mobile, Uhu Labos Nomades and the Office of Community Engagement at Concordia University. Project funded under the Montreal cultural development agreement between the city of Montreal and the government of Quebec.

<img src="quebec.png" width="395" alt="Quebec Province Logo" />
<img src="montreal.jpg" width="395" alt="Montreal City Logo" />
