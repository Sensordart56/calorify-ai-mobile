import { ExpoIdGenerator } from './expo-id-generator';
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => '123e4567-e89b-42d3-a456-426614174000') }));
test('returns a canonical UUIDv4 from Expo Crypto', () => {
  expect(new ExpoIdGenerator().next()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
