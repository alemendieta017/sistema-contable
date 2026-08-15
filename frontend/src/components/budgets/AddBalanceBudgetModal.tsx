'use client';

import React from 'react';
import { BudgetAccountModal } from './BudgetAccountModal';
import { CashFlowDirection, BudgetMatrixSectionKey } from '@sistema-contable/shared';

export interface AddBalanceBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetBlock: 'ASSET' | 'LIABILITY' | BudgetMatrixSectionKey | string;
  onAdd: (
    account: { id: string; name: string; code: string; type: string },
    subRowLabel: string,
    cashFlowDirection: CashFlowDirection,
  ) => void;
}

/**
 * @deprecated Use BudgetAccountModal instead.
 */
export const AddBalanceBudgetModal: React.FC<AddBalanceBudgetModalProps> = ({
  isOpen,
  onClose,
  targetBlock,
  onAdd,
}) => {
  return (
    <BudgetAccountModal
      isOpen={isOpen}
      onClose={onClose}
      targetSection={targetBlock}
      onSave={({ account, label, direction }) => {
        onAdd(account, label, direction);
      }}
    />
  );
};
