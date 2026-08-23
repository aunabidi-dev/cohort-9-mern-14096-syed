import { render, screen } from '@testing-library/react';
import AppLayout from '../AppLayout';
import HomePage from '../../../pages/HomePage';
import App from '../../../App';

jest.mock('../../../router/Router', () => ({
  Router: () => <div data-testid="app-router-mock">Router Mock</div>,
}));

describe('Layout and General Pages', () => {
  it('renders AppLayout with logo and children', () => {
    render(
      <AppLayout>
        <p>Main content area</p>
      </AppLayout>,
    );

    expect(screen.getByText('Notes App')).toBeInTheDocument();
    expect(screen.getByText('Main content area')).toBeInTheDocument();
  });

  it('renders HomePage with header and description', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: 'Notes App' })).toBeInTheDocument();
    expect(screen.getByText('Your personal space to capture and organize notes.')).toBeInTheDocument();
  });

  it('renders root App component with router container', () => {
    render(<App />);

    expect(screen.getByTestId('app-router-mock')).toBeInTheDocument();
  });
});
