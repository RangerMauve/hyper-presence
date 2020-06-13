# hyper-presence
Detect who's actively online using gossip over hypercore-protocol

## How it works

- Peers keep an internal graph with the state of other peers
- Communication is facilitatied with flooding broadcasts over the hypercore replicaiton protocol
- When peers first boot up, they will ask their first peer for a copy of their graph to bootstrap
- From there, peers will broadcast whenever they've connected or disconnected from somebody.
- Other peers will listen to these messages and update their local graphs
- The data tracked per peer is their list of outgoing connections
- A peer is considered `online` if there are connections going from the current peer to them
- This should be calculated every time the connections change
- Peers that are no longer `online` should be pruned from the graph
