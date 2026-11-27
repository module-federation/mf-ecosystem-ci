import { loadRemote } from '@module-federation/enhanced/runtime';
import { createRemoteAppComponent } from '@module-federation/bridge-react';
import { Link, Route, Routes } from 'react-router-dom';

const Fallback = ({ error }: { error: Error }) => (
  <div data-testid="remote-error">remote failed: {error?.message}</div>
);

const Remote1App = createRemoteAppComponent({
  loader: () => loadRemote('remote1/export-app'),
  fallback: Fallback,
  loading: <div data-testid="remote-loading">loading remote1...</div>,
});

const App = () => (
  <div>
    <h1>Bridge React host</h1>
    <nav>
      <Link to="/" data-testid="host-home-link">Host home</Link> |{' '}
      <Link to="/remote1" data-testid="host-remote1-link">Remote1</Link> |{' '}
      <Link to="/remote1/detail" data-testid="host-remote1-detail-link">Remote1 detail</Link> |{' '}
      <Link to="/memory" data-testid="host-memory-link">Memory route</Link>
    </nav>
    <Routes>
      <Route path="/" element={<h2>Host home page</h2>} />
      <Route
        path="/remote1/*"
        element={
          <div data-testid="remote1-slot">
            <Remote1App name="Ming" age={12} />
          </div>
        }
      />
      <Route
        path="/memory/*"
        element={
          <div data-testid="memory-slot">
            <Remote1App name="Memory" age={1} memoryRoute={{ entryPath: '/detail' }} />
          </div>
        }
      />
    </Routes>
  </div>
);

export default App;
