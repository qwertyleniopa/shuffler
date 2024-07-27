import Peer, { DataConnection } from 'peerjs';
import { useSearchParams } from '@solidjs/router';
import { createSignal, For } from 'solid-js';
import { ClientMessage, ServerMessage } from '../lib/messages';

function Client() {
  const [searchParams] = useSearchParams();

  const peer = new Peer();

  const [heldCards, setHeldCards] = createSignal<string[]>([]);
  const [host, setHost] = createSignal<DataConnection | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = createSignal<number | null>(
    null,
  );

  peer.once('open', () => {
    if (searchParams.hostId) {
      const host = peer.connect(searchParams.hostId);
      setHost(host);

      host.on('data', data => handleHostData(data as ServerMessage));
      host.once('close', () =>
        window.location.replace(
          `${window.location.origin}/shuffler/#/disconnect`,
        ),
      );
    } else {
      window.location.replace(`${window.location.origin}/shuffler/`);
    }
  });

  window.addEventListener('beforeunload', () => {
    host()?.close();
  });

  function handleUpdateCards(data: ServerMessage) {
    setHeldCards(data.data);
    setSelectedCardIndex(null);
  }

  function handleDrawCardButtonClick() {
    send({ name: 'drawCard' });
  }

  function handleUseCardButtonClick() {
    if (selectedCardIndex() === null) {
      throw new Error('Attempted to use card without selecting one.');
    }

    send({
      name: 'useCard',
      data: selectedCardIndex()!,
    });
  }

  function handleHostData(data: ServerMessage) {
    switch (data.name) {
      case 'updateCards':
        handleUpdateCards(data);
        break;

      default:
        throw new Error('Received unknown message from host!');
    }
  }

  function send(data: ClientMessage) {
    if (!host()) {
      throw new Error('Attempted to send data without host connection.');
    }

    host()!.send(data);
  }

  return (
    <div class="m-auto flex max-w-4xl flex-col gap-6 p-3">
      <h1 class="text-3xl font-bold">client page</h1>

      <div class="flex flex-col gap-2">
        <h2 class="text-xl font-bold">held cards</h2>

        <ol class="flex flex-col gap-1">
          <For each={heldCards()}>
            {(item, index) => (
              <li class="flex gap-2">
                <p>"{item}"</p>

                <button
                  class="ml-2 bg-slate-300 active:bg-slate-400"
                  onClick={() =>
                    selectedCardIndex() !== index()
                      ? setSelectedCardIndex(index)
                      : setSelectedCardIndex(null)
                  }
                >
                  {selectedCardIndex() === index() ? 'deselect' : 'select'}
                </button>
              </li>
            )}
          </For>
        </ol>
      </div>

      <div class="flex flex-col gap-2">
        <h2 class="text-xl font-bold">controls</h2>

        <button
          class="bg-slate-300 active:bg-slate-400"
          onClick={handleDrawCardButtonClick}
        >
          draw card
        </button>
        <button
          class="bg-slate-300 active:bg-slate-400"
          onClick={handleUseCardButtonClick}
        >
          use card
        </button>
      </div>
    </div>
  );
}

export default Client;
