import Peer, { DataConnection } from 'peerjs';
import { createSignal, For } from 'solid-js';
import { ClientMessage, ServerMessage } from '../lib/messages';
import { DECK_TEMPLATE } from '../lib/deck_template';

function Host() {
  const peer = new Peer();

  const [clientCards, setClientCards] = createSignal(
    new Map<string, string[]>(),
    { equals: false },
  );
  const [discardPile, setDiscardPile] = createSignal<string[]>([]);
  const [drawPile, setDrawPile] = createSignal(shuffle(generateDeck()));
  const [inUseMap, setInUseMap] = createSignal(new Map<string, number>(), {
    equals: false,
  });
  const [logs, setLogs] = createSignal('');
  const [peerId, setPeerId] = createSignal<string | null>(null);

  const joinLink = () => getJoinLink(peerId());

  peer.once('open', id => {
    setPeerId(id);
    log(`Socket open! ID: ${id}.`);
  });

  peer.on('connection', conn => {
    conn.on('data', data => handleClientData(conn, data as ClientMessage));

    conn.on('close', () => {
      log(`Connection closed! ID: ${conn.peer}.`);
    });

    conn.on('error', err => {
      log(`Connection error! ID: ${conn.peer}, Error: ${err.message}.`);
    });

    setClientCards(clientCards => {
      clientCards.set(conn.peer, []);
      return clientCards;
    });
    log(`New connection! ID: ${conn.peer}.`);
  });

  window.addEventListener('beforeunload', () => {
    peer.destroy();
  });

  function handleClientData(conn: DataConnection, data: ClientMessage) {
    switch (data.name) {
      case 'drawCard':
        handleDrawCard(conn);
        break;

      case 'useCard':
        handleUseCard(conn, data.data);
        break;

      default:
        log('Received unknown message from client!');
        break;
    }

    log(`Received data from ${conn.peer}. Data: ${JSON.stringify(data)}.`);
  }

  function handleCopyButtonClick() {
    navigator.clipboard.writeText(joinLink()).catch(() => {
      log('Failed to copy join link to clipboard!');
    });
  }

  function handleDrawCard(conn: DataConnection) {
    if (drawPile().length === 0) {
      return;
    }

    const drawnCard = drawPile().pop()!;
    setDrawPile([...drawPile()]);
    setCardsOf(conn.peer, [...getCardsOf(conn.peer), drawnCard]);

    send(conn, {
      name: 'updateCards',
      data: getCardsOf(conn.peer),
    });
  }

  function handleUseCard(conn: DataConnection, index: number) {
    const clientCards = getCardsOf(conn.peer);

    if (index < 0 || index >= clientCards.length) {
      log(`Attempted to use card with invalid index. ID: ${conn.peer}.`);
      return;
    }

    const usedCard = clientCards.splice(index, 1)[0];
    setCardsOf(conn.peer, clientCards);
    setInUseMap(inUseMap => {
      if (inUseMap.has(usedCard)) {
        inUseMap.set(usedCard, inUseMap.get(usedCard)! + 1);
      } else {
        inUseMap.set(usedCard, 1);
      }

      return inUseMap;
    });

    send(conn, {
      name: 'updateCards',
      data: getCardsOf(conn.peer),
    });
  }

  function discardUsedCard(type: string) {
    setInUseMap(inUseMap => {
      if (!inUseMap.has(type)) {
        throw new Error('Attempted to discard card not in use.');
      }

      inUseMap.set(type, inUseMap.get(type)! - 1);
      setDiscardPile([...discardPile(), type]);
      return inUseMap;
    });

    if (drawPile().length === 0) {
      setDrawPile(shuffle([...discardPile()]));
      setDiscardPile([]);
    }
  }

  function getCardsOf(peerId: string) {
    const cards = clientCards().get(peerId);

    if (!cards) {
      log(`Attempted to get cards of unknown client. ID: ${peerId}.`);
      return [];
    }

    return cards;
  }

  function getJoinLink(id: string | null) {
    if (id === null) {
      return '';
    }

    return `${window.location.origin}/shuffler/#/join?hostId=${id}`;
  }

  function generateDeck() {
    const deck = [];

    for (const cardTemplate of DECK_TEMPLATE) {
      for (let i = 0; i < cardTemplate.count; i++) {
        deck.push(cardTemplate.name);
      }
    }

    return deck;
  }

  function log(str: string) {
    setLogs(`${str}\n` + logs());
  }

  function resetDeck() {
    setDrawPile(shuffle(generateDeck()));
    setDiscardPile([]);
    setInUseMap(new Map());

    for (const connArray of Object.values(peer.connections)) {
      const conn = connArray[0];

      setCardsOf(conn.peer, []);
      send(connArray[0], {
        name: 'updateCards',
        data: getCardsOf(conn.peer),
      });
    }
  }

  function send(conn: DataConnection, data: ServerMessage) {
    conn.send(data);
  }

  function setCardsOf(peerId: string, cards: string[]) {
    if (!clientCards().has(peerId)) {
      log(`Attempted to set cards of unknown client. ID: ${peerId}.`);
      return;
    }

    clientCards().set(peerId, cards);
    setClientCards(clientCards());
  }

  function shuffle<T>(deck: T[]) {
    const shuffledDeck = [...deck];

    for (let i = shuffledDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }

    return shuffledDeck;
  }

  return (
    <div class="m-auto flex max-w-4xl flex-col gap-6 p-3">
      <h1 class="text-3xl font-bold">host page</h1>

      <div class="flex flex-col gap-2">
        <h2 class="text-xl font-bold">join link</h2>

        <div class="flex justify-between gap-2">
          <input
            class="flex-1 bg-slate-100"
            type="text"
            value={joinLink()}
            readonly
          />
          <button
            class="bg-slate-300 active:bg-slate-400"
            onClick={handleCopyButtonClick}
          >
            copy
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <h2 class="text-xl font-bold">actions</h2>

        <button class="bg-slate-300 active:bg-slate-400" onClick={resetDeck}>
          reset deck
        </button>
      </div>

      <div class="flex flex-col gap-2">
        <h2 class="text-xl font-bold">deck status</h2>

        <div>
          <p>cards in draw pile: {drawPile().length}</p>
          <p>cards in discard pile: {discardPile().length}</p>
        </div>

        <div class="flex flex-col gap-1">
          <h3 class="font-bold">cards in use:</h3>
          <ol class="flex flex-col gap-1">
            <For each={Array.from(inUseMap().entries())}>
              {([type, count]) =>
                count > 0 && (
                  <li class="flex gap-2">
                    <p>"{type}"</p>
                    <p>{count}</p>
                    <button
                      class="ml-2 bg-slate-300 active:bg-slate-400"
                      onClick={() => discardUsedCard(type)}
                    >
                      discard one
                    </button>
                  </li>
                )
              }
            </For>
          </ol>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <h2 class="text-xl font-bold">log</h2>

        <textarea
          class="min-h-[20vh] w-full resize-none bg-slate-100"
          value={logs()}
          readonly
        />
      </div>
    </div>
  );
}

export default Host;
