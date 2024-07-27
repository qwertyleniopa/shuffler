/* @refresh reload */
import { render } from 'solid-js/web';
import { Route, HashRouter } from '@solidjs/router';

import './index.css';
import Client from './pages/Client.tsx';
import Disconnect from './pages/Disconnect.tsx';
import Host from './pages/Host.tsx';

render(
  () => (
    <HashRouter>
      <Route path="/" component={Host} />
      <Route path="/disconnect" component={Disconnect} />
      <Route path="/join" component={Client} />
    </HashRouter>
  ),
  document.getElementById('root')!,
);
