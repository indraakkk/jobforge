import { z } from "zod/v4";
import { APPLICATION_STATUS_VALUES } from "~/lib/schemas/application";

export const applicationFormSchema = z.object({
  company: z.string().min(1, "Company is required"),
  role: z.string().min(1, "Role is required"),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  status: z.enum(APPLICATION_STATUS_VALUES),
  job_description: z.string().optional(),
  salary_range: z.string().optional(),
  location: z.string().optional(),
  platform: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email("Must be a valid email").optional().or(z.literal("")),
  notes: z.string().optional(),
  applied_at: z.string().optional(),
  next_action: z.string().optional(),
  next_action_date: z.string().optional(),
});

export type ApplicationFormValues = z.infer<typeof applicationFormSchema>;
