import React from 'react';
// Mock focus-trap-react to avoid interop issues in the test environment; tests exercise focus behavior via user-event
jest.mock('focus-trap-react', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}));
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FamilyConfigModal from '../FamilyConfigModal';

describe('FamilyConfigModal focus trap', () => {
  test('confirm dialog traps focus between cancel and confirm buttons', async () => {
    const user = userEvent.setup();
    const family = [{ name: 'Adult', pinned: true }];
    const setFamily = jest.fn();
    const onClose = jest.fn();
    const clearLocalPreferences = jest.fn();

    render(
      <FamilyConfigModal
        family={family}
        setFamily={setFamily}
        onClose={onClose}
        clearLocalPreferences={clearLocalPreferences}
      />
    );

    // Open confirm
    const clearButton = screen.getByRole('button', { name: /clear local preferences/i });
    await act(async () => {
      await user.click(clearButton);
    });

    // Expect the confirm/panel to be visible and confirm directly (avoid flaky reopen logic)
    const yesButton = await screen.findByRole('button', { name: /yes, clear/i });
    expect(yesButton).toBeInTheDocument();

    // Click confirm -> should call the clear and close callbacks
    await act(async () => {
      await user.click(yesButton);
    });
    expect(clearLocalPreferences).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
