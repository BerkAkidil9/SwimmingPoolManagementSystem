import React from 'react';
import { render, screen } from '@testing-library/react';
import SocialLogin from '../../SocialLogin';

jest.mock('../../logo/google logo.png', () => 'google.png');
jest.mock('../../logo/github logo.png', () => 'github.png');
jest.mock('../../logo/facebook logo.png', () => 'facebook.png');

describe('SocialLogin', () => {
  it('renders Register with Social Media heading', () => {
    render(<SocialLogin />);
    expect(screen.getByText('Register with Social Media')).toBeInTheDocument();
  });

  it('has Google, GitHub, Facebook buttons', () => {
    render(<SocialLogin />);
    expect(screen.getByLabelText(/Register with Google/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Register with GitHub/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Register with Facebook/i)).toBeInTheDocument();
  });
});
