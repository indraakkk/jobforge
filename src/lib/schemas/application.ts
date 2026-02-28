import { Schema } from "effect";

// pg driver returns Date objects for timestamptz/date columns
const DateToString = Schema.transform(
  Schema.Union(Schema.DateFromSelf, Schema.String),
  Schema.String,
  {
    decode: (val) => (val instanceof Date ? val.toISOString() : val),
    encode: (val) => val,
  },
);

export const ApplicationStatus = Schema.Literal(
  "draft",
  "applied",
  "screening",
  "interviewing",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
);
export type ApplicationStatus = typeof ApplicationStatus.Type;

export class Application extends Schema.Class<Application>("Application")({
  id: Schema.String,
  company: Schema.String,
  role: Schema.String,
  url: Schema.NullOr(Schema.String),
  status: ApplicationStatus,
  job_description: Schema.NullOr(Schema.String),
  salary_range: Schema.NullOr(Schema.String),
  location: Schema.NullOr(Schema.String),
  platform: Schema.NullOr(Schema.String),
  contact_name: Schema.NullOr(Schema.String),
  contact_email: Schema.NullOr(Schema.String),
  notes: Schema.NullOr(Schema.String),
  applied_at: Schema.NullOr(DateToString),
  next_action: Schema.NullOr(Schema.String),
  next_action_date: Schema.NullOr(DateToString),
  created_at: DateToString,
  updated_at: DateToString,
}) {}

export class CreateApplication extends Schema.Class<CreateApplication>("CreateApplication")({
  company: Schema.String,
  role: Schema.String,
  url: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  status: Schema.optionalWith(ApplicationStatus, { default: () => "draft" as const }),
  job_description: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  salary_range: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  location: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  platform: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  contact_name: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  contact_email: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  notes: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  applied_at: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  next_action: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  next_action_date: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
}) {}

export class UpdateApplication extends Schema.Class<UpdateApplication>("UpdateApplication")({
  company: Schema.optional(Schema.String),
  role: Schema.optional(Schema.String),
  url: Schema.optional(Schema.NullOr(Schema.String)),
  status: Schema.optional(ApplicationStatus),
  job_description: Schema.optional(Schema.NullOr(Schema.String)),
  salary_range: Schema.optional(Schema.NullOr(Schema.String)),
  location: Schema.optional(Schema.NullOr(Schema.String)),
  platform: Schema.optional(Schema.NullOr(Schema.String)),
  contact_name: Schema.optional(Schema.NullOr(Schema.String)),
  contact_email: Schema.optional(Schema.NullOr(Schema.String)),
  notes: Schema.optional(Schema.NullOr(Schema.String)),
  applied_at: Schema.optional(Schema.NullOr(Schema.String)),
  next_action: Schema.optional(Schema.NullOr(Schema.String)),
  next_action_date: Schema.optional(Schema.NullOr(Schema.String)),
}) {}

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

export interface ApplicationFilters {
  readonly status?: ApplicationStatus;
  readonly search?: string;
}

export interface ApplicationSort {
  readonly field: "company" | "role" | "status" | "applied_at" | "created_at" | "updated_at";
  readonly direction: "asc" | "desc";
}

export interface ApplicationStats {
  readonly total: number;
  readonly byStatus: Record<string, number>;
}
