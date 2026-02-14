import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrivacyPolicy from '../../components/PrivacyPolicy/PrivacyPolicy';

describe('PrivacyPolicy', () => {
  it('renders Privacy Policy heading', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicy />
      </MemoryRouter>
    );
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });
});
