import React from 'react';
import { render, screen } from '@testing-library/react';
import SocialLogin from '../../SocialLogin';

jest.mock('../../logo/google logo.png', () => 'google.png');

describe('SocialLogin', () => {
  it('renders Register with Google heading', () => {
    render(<SocialLogin />);
    expect(screen.getByText('Register with Google')).toBeInTheDocument();
  });

  it('has Google button', () => {
    render(<SocialLogin />);
    expect(screen.getByLabelText(/Register with Google/i)).toBeInTheDocument();
  });
});
