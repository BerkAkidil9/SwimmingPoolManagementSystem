import React from 'react';
import { render, screen } from '@testing-library/react';
import Terms from '../../Terms';

describe('Terms', () => {
  it('renders terms content', () => {
    render(<Terms />);
    expect(screen.getByText('Terms and Conditions')).toBeInTheDocument();
  });
});
