import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionMode } from '@sistema-contable/shared';
import { ModeSelector } from '../components/transactions/ModeSelector';

describe('ModeSelector Component (T005)', () => {
  const defaultProps = {
    value: TransactionMode.QUICK,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders both mode options ("Transacción Rápida" and "Asiento Libre")', () => {
    render(<ModeSelector {...defaultProps} />);

    const quickBtn = screen.getByRole('tab', { name: /transacción rápida/i });
    const freeJournalBtn = screen.getByRole('tab', { name: /asiento libre/i });

    expect(quickBtn).toBeInTheDocument();
    expect(freeJournalBtn).toBeInTheDocument();
  });

  test('highlights active state for QUICK mode and sets accessible ARIA attributes', () => {
    render(<ModeSelector value={TransactionMode.QUICK} onChange={jest.fn()} />);

    const quickBtn = screen.getByRole('tab', { name: /transacción rápida/i });
    const freeJournalBtn = screen.getByRole('tab', { name: /asiento libre/i });

    expect(quickBtn).toHaveAttribute('aria-selected', 'true');
    expect(quickBtn).toHaveAttribute('aria-pressed', 'true');
    expect(freeJournalBtn).toHaveAttribute('aria-selected', 'false');
    expect(freeJournalBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('highlights active state for FREE_JOURNAL mode and sets accessible ARIA attributes', () => {
    render(<ModeSelector value={TransactionMode.FREE_JOURNAL} onChange={jest.fn()} />);

    const quickBtn = screen.getByRole('tab', { name: /transacción rápida/i });
    const freeJournalBtn = screen.getByRole('tab', { name: /asiento libre/i });

    expect(quickBtn).toHaveAttribute('aria-selected', 'false');
    expect(quickBtn).toHaveAttribute('aria-pressed', 'false');
    expect(freeJournalBtn).toHaveAttribute('aria-selected', 'true');
    expect(freeJournalBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('calls onChange callback with FREE_JOURNAL when clicking Asiento Libre', () => {
    const onChangeMock = jest.fn();
    render(<ModeSelector value={TransactionMode.QUICK} onChange={onChangeMock} />);

    const freeJournalBtn = screen.getByRole('tab', { name: /asiento libre/i });
    fireEvent.click(freeJournalBtn);

    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith(TransactionMode.FREE_JOURNAL);
  });

  test('calls onChange callback with QUICK when clicking Transacción Rápida', () => {
    const onChangeMock = jest.fn();
    render(<ModeSelector value={TransactionMode.FREE_JOURNAL} onChange={onChangeMock} />);

    const quickBtn = screen.getByRole('tab', { name: /transacción rápida/i });
    fireEvent.click(quickBtn);

    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith(TransactionMode.QUICK);
  });

  test('supports legacy currentMode and onModeChange props seamlessly', () => {
    const onModeChangeMock = jest.fn();
    render(<ModeSelector currentMode={TransactionMode.QUICK} onModeChange={onModeChangeMock} />);

    const freeJournalBtn = screen.getByRole('tab', { name: /asiento libre/i });
    fireEvent.click(freeJournalBtn);

    expect(onModeChangeMock).toHaveBeenCalledTimes(1);
    expect(onModeChangeMock).toHaveBeenCalledWith(TransactionMode.FREE_JOURNAL);
  });

  test('handles disabled state properly by disabling buttons and preventing onChange', () => {
    const onChangeMock = jest.fn();
    render(<ModeSelector value={TransactionMode.QUICK} onChange={onChangeMock} disabled={true} />);

    const quickBtn = screen.getByRole('tab', { name: /transacción rápida/i });
    const freeJournalBtn = screen.getByRole('tab', { name: /asiento libre/i });

    expect(quickBtn).toBeDisabled();
    expect(freeJournalBtn).toBeDisabled();

    fireEvent.click(freeJournalBtn);
    expect(onChangeMock).not.toHaveBeenCalled();
  });

  test('applies custom className to the root container', () => {
    const { container } = render(
      <ModeSelector
        value={TransactionMode.QUICK}
        onChange={jest.fn()}
        className="custom-test-class"
      />,
    );

    expect(container.firstChild).toHaveClass('custom-test-class');
  });
});
