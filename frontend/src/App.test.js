import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the main heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/user registration/i);
  expect(headingElement).toBeInTheDocument();
});

test('renders the Register component', () => {
  render(<App />);
  const registerForm = screen.getByRole('form', { name: /registration form/i });
  expect(registerForm).toBeInTheDocument();
});

test('renders the SocialLogin component', () => {
  render(<App />);
  const socialLoginTitle = screen.getByText(/register with social media/i);
  expect(socialLoginTitle).toBeInTheDocument();
});

test('renders Terms and Conditions route', () => {
  render(<App />);
  const termsLink = screen.getByRole('link', { name: /terms and conditions/i });
  expect(termsLink).toBeInTheDocument();
});

