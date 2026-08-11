import type { ReactElement } from 'react';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/HomePage';
import './App.css';

function App(): ReactElement {
  return (
    <AppLayout>
      <HomePage />
    </AppLayout>
  );
}

export default App;
