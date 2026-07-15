export interface IdGenerator { next(): string; }
export interface Clock { utcNow(): string; localDate(): string; timezoneOffsetMinutes(): number; }
