import {
  isNavItem,
  isNavGroup,
  isNavItemActive,
  isNavGroupActive,
  navigationRegistry,
  NavItem,
  NavGroup,
} from '../config/navigation';
import { Table, FileText } from 'lucide-react';

describe('Navigation Helpers & Types', () => {
  const dummyItem: NavItem = {
    id: 'test-item',
    name: 'Test Item',
    href: '/test',
    icon: Table,
    aliasHrefs: ['/test-alias'],
  };

  const dummyExactItem: NavItem = {
    id: 'test-exact',
    name: 'Exact Item',
    href: '/exact',
    icon: Table,
    matchExact: true,
  };

  const dummyGroup: NavGroup = {
    id: 'test-group',
    name: 'Test Group',
    icon: FileText,
    items: [dummyItem, dummyExactItem],
  };

  describe('Type Guards', () => {
    test('isNavItem identifies leaf items correctly', () => {
      expect(isNavItem(dummyItem)).toBe(true);
      expect(isNavItem(dummyGroup)).toBe(false);
    });

    test('isNavGroup identifies group items correctly', () => {
      expect(isNavGroup(dummyGroup)).toBe(true);
      expect(isNavGroup(dummyItem)).toBe(false);
    });
  });

  describe('isNavItemActive', () => {
    test('matches exact href', () => {
      expect(isNavItemActive(dummyItem, '/test')).toBe(true);
      expect(isNavItemActive(dummyItem, '/other')).toBe(false);
    });

    test('matches alias hrefs', () => {
      expect(isNavItemActive(dummyItem, '/test-alias')).toBe(true);
    });

    test('matches sub-paths when matchExact is not set', () => {
      expect(isNavItemActive(dummyItem, '/test/sub-page')).toBe(true);
    });

    test('does not match sub-paths when matchExact is true', () => {
      expect(isNavItemActive(dummyExactItem, '/exact')).toBe(true);
      expect(isNavItemActive(dummyExactItem, '/exact/sub-page')).toBe(false);
    });

    test('handles empty or null pathname gracefully', () => {
      expect(isNavItemActive(dummyItem, '')).toBe(false);
    });
  });

  describe('isNavGroupActive', () => {
    test('returns true if any child item is active', () => {
      expect(isNavGroupActive(dummyGroup, '/test')).toBe(true);
      expect(isNavGroupActive(dummyGroup, '/test-alias')).toBe(true);
      expect(isNavGroupActive(dummyGroup, '/exact')).toBe(true);
    });

    test('returns false if no child item is active', () => {
      expect(isNavGroupActive(dummyGroup, '/unknown-route')).toBe(false);
    });
  });

  describe('navigationRegistry verification', () => {
    test('registry contains all expected groups and leaf items', () => {
      expect(navigationRegistry.length).toBeGreaterThan(0);
      const budgetGroup = navigationRegistry.find((e) => e.id === 'budgets');
      expect(budgetGroup).toBeDefined();
      expect(isNavGroup(budgetGroup!)).toBe(true);
      if (budgetGroup && isNavGroup(budgetGroup)) {
        expect(budgetGroup.items.map((i) => i.id)).toContain('budgets-matrix');
        expect(budgetGroup.items.map((i) => i.id)).toContain('budgets-control');
      }

      const reportGroup = navigationRegistry.find((e) => e.id === 'reports');
      expect(reportGroup).toBeDefined();
      expect(isNavGroup(reportGroup!)).toBe(true);
      if (reportGroup && isNavGroup(reportGroup)) {
        expect(reportGroup.items.map((i) => i.id)).toContain('reports-balance-sheet');
        expect(reportGroup.items.map((i) => i.id)).toContain('reports-income-statement');
      }
    });

    test('handles deep links with aliases in registry correctly', () => {
      const budgetGroup = navigationRegistry.find((e) => e.id === 'budgets') as NavGroup;
      expect(isNavGroupActive(budgetGroup, '/budgets')).toBe(true);
      expect(isNavGroupActive(budgetGroup, '/budgets/matrix')).toBe(true);
      expect(isNavGroupActive(budgetGroup, '/budgets/control')).toBe(true);

      const reportGroup = navigationRegistry.find((e) => e.id === 'reports') as NavGroup;
      expect(isNavGroupActive(reportGroup, '/reports/income-statement/forecast')).toBe(true);
      expect(isNavGroupActive(reportGroup, '/reports/forecast')).toBe(true);
    });
  });
});
