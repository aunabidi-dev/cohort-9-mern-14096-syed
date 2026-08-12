import type { ReactElement, ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayout({ children }: AppLayoutProps): ReactElement {
  return (
    <div className="app">
      <header className="app-header">
        <span className="app-logo">Notes App</span>
      </header>
      {children}
    </div>
  );
}

export default AppLayout;
