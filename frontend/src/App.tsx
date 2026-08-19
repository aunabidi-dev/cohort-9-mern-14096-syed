import type { ReactElement } from 'react';
import { Router } from './router/Router';
import './App.css';

function App(): ReactElement {
  return (
    <div className="app-root">
      <Router />
    </div>
  );
}

export default App;
