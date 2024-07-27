import { A } from '@solidjs/router';

function Disconnect() {
  return (
    <div class="m-auto flex max-w-4xl flex-col gap-6 p-3">
      <h1 class="text-3xl font-bold">disconnected!</h1>

      <p>
        either join from another link or{' '}
        <A class="text-slate-500 underline" href="/">
          host yourself
        </A>
        .
      </p>
    </div>
  );
}

export default Disconnect;
