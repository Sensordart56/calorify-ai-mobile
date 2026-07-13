import { primarySections } from '@/core/navigation/primary-sections';

describe('primarySections', () => {
  test('uses unique routes with accessible labels', () => {
    const routes = primarySections.map(({ route }) => route);

    expect(new Set(routes).size).toBe(routes.length);
    expect(primarySections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ route: 'index', accessibilityLabel: expect.any(String) }),
        expect.objectContaining({ route: 'settings', accessibilityLabel: expect.any(String) }),
      ]),
    );
    expect(primarySections.every(({ accessibilityLabel }) => accessibilityLabel.length > 0)).toBe(
      true,
    );
  });
});
