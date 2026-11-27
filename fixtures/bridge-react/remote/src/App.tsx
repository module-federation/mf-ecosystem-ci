import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';

export interface AppProps {
  name?: string;
  age?: number;
}

// No basename here: when rendered through the bridge, the aliased BrowserRouter
// (bridge-react-webpack-plugin) takes the basename / memory route from the host.
const App = ({ name, age }: AppProps) => (
  <BrowserRouter>
    <ul>
      <li>
        <Link to="/" data-testid="remote-home-link">Remote home</Link>
      </li>
      <li>
        <Link to="/detail" data-testid="remote-detail-link">Remote detail</Link>
      </li>
    </ul>
    <Routes>
      <Route
        path="/"
        element={
          <div>
            <h2>Remote1 home page</h2>
            <p data-testid="remote-props">
              name: {name}, age: {age}
            </p>
          </div>
        }
      />
      <Route path="/detail" element={<h2>Remote1 detail page</h2>} />
    </Routes>
  </BrowserRouter>
);

export default App;
