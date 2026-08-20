import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const mockAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { PreviewProvider, usePreview } from '../context/PreviewContext';
import { PreviewBanner } from '../components/public/PreviewBanner';

const Probe = () => {
  const { isPreview, params } = usePreview();
  const location = useLocation();
  return (
    <>
      <span data-testid="is-preview">{String(isPreview)}</span>
      <span data-testid="params">{JSON.stringify(params ?? null)}</span>
      <span data-testid="search">{location.search}</span>
    </>
  );
};

const renderAt = (url: string, authenticated = true) => {
  mockAuth.mockReturnValue({ isAuthenticated: authenticated });
  return render(
    <MemoryRouter initialEntries={[url]}>
      <PreviewProvider>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <PreviewBanner />
                <Probe />
              </>
            }
          />
        </Routes>
      </PreviewProvider>
    </MemoryRouter>,
  );
};

describe('preview mode', () => {
  it('is off on a normal URL', () => {
    renderAt('/');

    expect(screen.getByTestId('is-preview')).toHaveTextContent('false');
    expect(screen.getByTestId('params')).toHaveTextContent('null');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('turns on with ?preview=1 and forwards the flag to the API', () => {
    renderAt('/?preview=1');

    expect(screen.getByTestId('is-preview')).toHaveTextContent('true');
    expect(screen.getByTestId('params')).toHaveTextContent('{"preview":"true"}');
  });

  it('accepts ?preview=true as well', () => {
    renderAt('/?preview=true');
    expect(screen.getByTestId('is-preview')).toHaveTextContent('true');
  });

  it('ignores an unrelated value', () => {
    renderAt('/?preview=maybe');
    expect(screen.getByTestId('is-preview')).toHaveTextContent('false');
  });

  it('shows an unmistakable banner while previewing', () => {
    renderAt('/?preview=1');

    expect(screen.getByRole('status')).toHaveTextContent(/Mode prévisualisation/i);
  });

  it('tells a signed-out visitor why they see the published site', () => {
    renderAt('/?preview=1', false);

    expect(screen.getByRole('status')).toHaveTextContent(/connectez-vous/i);
  });

  it('leaves preview without losing the other query parameters', async () => {
    renderAt('/?page=2&preview=1');

    await userEvent.click(screen.getByRole('button', { name: /Quitter/i }));

    expect(screen.getByTestId('search')).toHaveTextContent('?page=2');
    expect(screen.getByTestId('is-preview')).toHaveTextContent('false');
  });
});
