import * as Crypto from 'expo-crypto';
import type { IdGenerator } from '@/core/application/runtime-ports';

export class ExpoIdGenerator implements IdGenerator {
  public next(): string { return Crypto.randomUUID(); }
}
