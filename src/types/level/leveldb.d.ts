export class LevelDBIterator {
  next(): Promise<string>
  end(): Promise<void>
}

export class LevelDB {
  put(key: string, value: string): Promise<void>;
  get(key: string): Promise<string>;
  del(key: string): Promise<void>;

  close(): Promise<void>;
  iterator(options: Record<string, unknown>): Promise<LevelDBIterator>
}

export function level(localtion: string): LevelDB;
