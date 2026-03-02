import { Schema } from "effect";

// pg driver returns Date objects for timestamptz/date columns
export const DateToString = Schema.transform(
  Schema.Union(Schema.DateFromSelf, Schema.String),
  Schema.String,
  {
    decode: (val) => (val instanceof Date ? val.toISOString() : val),
    encode: (val) => val,
  },
);

export class PaginatedResult<T> {
  constructor(
    public readonly items: ReadonlyArray<T>,
    public readonly total: number,
    public readonly page: number,
    public readonly pageSize: number,
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }
}

export const FETCH_ALL_PAGE_SIZE = 200;
