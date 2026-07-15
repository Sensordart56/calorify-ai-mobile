import type { Clock } from '@/core/application/runtime-ports';

export class ExpoClock implements Clock {
  public utcNow(): string { return new Date().toISOString(); }
  public localDate(): string {
    const date = new Date();
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  }
  public timezoneOffsetMinutes(): number { return -new Date().getTimezoneOffset(); }
}
