import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../../pages/Login';
import axios from 'axios';

jest.mock('axios', () => ({ post: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.post.mockReset().mockResolvedValue({
      data: { isAuthenticated: true, user: { id: 42, role: 'user' } },
    });
    sessionStorage.clear();
  });

  function openLogin(entry = '/login') {
    render(<MemoryRouter initialEntries={[entry]}><LoginPage /></MemoryRouter>);
  }

  function signIn() {
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'member@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'SyntheticPassword123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  }

  it('renders login form', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  it('has login button', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    const loginBtn = screen.getByRole('button', { name: /Sign In/i });
    expect(loginBtn).toBeInTheDocument();
  });

  it.each(['/upload-health-report/42', '/health-report-upload?userId=42'])(
    'returns to the requested report page after password login: %s', async target => {
      openLogin(`/login?returnTo=${encodeURIComponent(target)}`);
      signIn();
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(target, { replace: true }));
      expect(JSON.parse(sessionStorage.getItem('user')).id).toBe(42);
    },
  );

  it('supports the report destination preserved in router state', async () => {
    openLogin({ pathname: '/login', state: { from: '/upload-health-report/42' } });
    signIn();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/upload-health-report/42', { replace: true }));
  });

  it('preserves the destination when the login request retries after a timeout', async () => {
    axios.post.mockRejectedValueOnce({ code: 'ECONNABORTED' });
    openLogin('/login?returnTo=%2Fupload-health-report%2F42');
    signIn();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/upload-health-report/42', { replace: true }));
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  it('ignores external, malformed and unrelated return destinations', async () => {
    const destinations = [
      'https://example.com', '//example.com', '/\\example.com', '/admin',
      '/upload-health-report/42\n', '/upload-health-report/42?next=https://example.com',
      '/upload-health-report/%2f%2fexample.com',
    ];
    for (const target of destinations) {
      const { unmount } = render(
        <MemoryRouter initialEntries={['/login?returnTo=' + encodeURIComponent(target)]}>
          <LoginPage />
        </MemoryRouter>,
      );
      mockNavigate.mockClear();
      signIn();
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/home'));
      unmount();
    }
  });

  it('keeps normal login navigation when no report destination is supplied', async () => {
    openLogin();
    signIn();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/home'));
  });
});
