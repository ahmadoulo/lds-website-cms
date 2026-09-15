import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Modal } from '../components/ui/Modal';

/** A dialog holding a form, with a confirmation dialog nested inside it. */
const Nested = () => {
  const [outer, setOuter] = useState(true);
  const [inner, setInner] = useState(false);

  return (
    <Modal isOpen={outer} onClose={() => setOuter(false)} title="Catégories">
      <input aria-label="Nom" />
      <button type="button" onClick={() => setInner(true)}>
        Supprimer
      </button>

      <Modal isOpen={inner} onClose={() => setInner(false)} title="Confirmer">
        <button type="button">Confirmer la suppression</button>
      </Modal>
    </Modal>
  );
};

describe('modal', () => {
  it('names itself after its own visible heading', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Modifier le domaine">
        <p>Corps</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Modifier le domaine' });
    const heading = within(dialog).getByRole('heading', { name: 'Modifier le domaine' });
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('lets the keyboard reach the scrollable body', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Texte long">
        <p>Un corps qui dépasse.</p>
      </Modal>,
    );

    // Without a tabindex the body can only be scrolled with a pointer.
    const body = screen.getByText('Un corps qui dépasse.').parentElement!;
    expect(body).toHaveAttribute('tabindex', '0');
  });

  it('keeps Tab inside the dialog', async () => {
    const user = userEvent.setup();
    render(
      <Modal isOpen onClose={() => {}} title="Piège" footer={<button type="button">Enregistrer</button>}>
        <input aria-label="Champ" />
      </Modal>,
    );

    const save = screen.getByRole('button', { name: 'Enregistrer' });
    save.focus();
    await user.tab();

    // The ring wraps round rather than escaping to the page behind.
    expect(document.body.contains(document.activeElement)).toBe(true);
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('closes only the dialog on top when two are stacked', async () => {
    const user = userEvent.setup();
    render(<Nested />);

    await user.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(2);

    await user.keyboard('{Escape}');

    // The confirmation goes; the form behind it stays, with what was typed.
    const remaining = screen.getAllByRole('dialog');
    expect(remaining).toHaveLength(1);
    expect(within(remaining[0]).getByRole('heading', { name: 'Catégories' })).toBeInTheDocument();
  });

  it('does not treat a nested dialog button as its own last tab stop', async () => {
    const user = userEvent.setup();
    render(<Nested />);

    await user.click(screen.getByRole('button', { name: 'Supprimer' }));

    const confirm = screen.getByRole('button', { name: 'Confirmer la suppression' });
    confirm.focus();
    await user.tab();

    // The focus stays in the confirmation, not in the form that contains it.
    const inner = confirm.closest('[role="dialog"]')!;
    expect(inner.contains(document.activeElement)).toBe(true);
  });

  it('keeps the page locked while a dialog is still open underneath', async () => {
    const user = userEvent.setup();
    render(<Nested />);

    await user.click(screen.getByRole('button', { name: 'Supprimer' }));
    await user.keyboard('{Escape}');

    // The confirmation closed but the form behind it did not: the page must
    // stay locked, or it scrolls away under an open dialog.
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores the page scroll once closed', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [open, setOpen] = useState(true);
      return (
        <Modal isOpen={open} onClose={() => setOpen(false)} title="Fermable">
          <p>Corps</p>
        </Modal>
      );
    };

    render(<Harness />);
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });
});
