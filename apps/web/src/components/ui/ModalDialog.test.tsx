import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { ModalDialog } from './ModalDialog.js';

function Harness(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Mở biểu mẫu
      </button>
      <ModalDialog open={open} title="Biểu mẫu thử" onClose={() => setOpen(false)}>
        <label htmlFor="modal-test-name">Tên</label>
        <input
          id="modal-test-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <label htmlFor="modal-test-note">Ghi chú</label>
        <input
          id="modal-test-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </ModalDialog>
    </>
  );
}

describe('ModalDialog', () => {
  it('moves focus into the dialog, closes with Escape and restores page focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Mở biểu mẫu' });

    await user.click(opener);

    expect(screen.getByRole('dialog', { name: 'Biểu mẫu thử' })).toBeVisible();
    await waitFor(() => expect(screen.getByLabelText('Tên')).toHaveFocus());
    expect(document.body).toHaveStyle({ overflow: 'hidden' });

    await user.click(screen.getByLabelText('Ghi chú'));
    await user.type(screen.getByLabelText('Ghi chú'), 'Không đổi focus');
    expect(screen.getByLabelText('Ghi chú')).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
    expect(opener).toHaveFocus();
  });
});
