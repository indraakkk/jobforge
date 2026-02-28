import { BunContext } from "@effect/platform-bun";
import { SqlClient } from "@effect/sql";
import { Console, Effect, Layer } from "effect";
import { DatabaseLive } from "./client";

const seed = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`DELETE FROM applications`;

  yield* sql`
    INSERT INTO applications (company, role, url, status, job_description, salary_range, location, platform, notes, applied_at, next_action, next_action_date)
    VALUES
      ('Acme Corp', 'Senior Backend Engineer', 'https://acme.com/careers/123', 'interviewing',
       'Build scalable APIs with TypeScript and PostgreSQL. Experience with event-driven architecture preferred.',
       '150k-180k', 'Remote (US)', 'LinkedIn',
       'Had a great initial call with hiring manager. Technical round scheduled.',
       '2026-02-10', 'Prepare system design examples', '2026-03-05'),

      ('StartupXYZ', 'Full Stack Developer', 'https://startupxyz.com/jobs/456', 'applied',
       'Join our small team building the next generation of developer tools. React + Node.js stack.',
       '120k-150k', 'San Francisco, CA', 'Hacker News',
       'Applied through HN Who is Hiring thread.',
       '2026-02-20', 'Follow up if no response', '2026-03-06'),

      ('BigTech Inc', 'Staff Software Engineer', 'https://bigtech.com/careers/789', 'screening',
       'Lead technical initiatives across multiple teams. Strong distributed systems background required.',
       '200k-250k', 'Seattle, WA (Hybrid)', 'Referral',
       'Referred by former colleague. Recruiter screen completed.',
       '2026-02-15', 'Complete take-home assessment', '2026-03-01'),

      ('DataFlow', 'Platform Engineer', 'https://dataflow.io/jobs/101', 'offer',
       'Design and maintain our Kubernetes-based platform. Terraform, Go, and observability experience.',
       '160k-190k', 'Remote (Global)', 'Company Website',
       'Offer received! Negotiating on equity.',
       '2026-01-25', 'Respond to offer', '2026-03-01'),

      ('CoolStartup', 'Engineering Manager', NULL, 'draft',
       NULL, '170k-200k', 'New York, NY', NULL,
       'Heard about this role from a friend. Need to research more.',
       NULL, 'Research company and role', '2026-03-10'),

      ('DevTools Co', 'Developer Advocate', 'https://devtools.co/careers/202', 'rejected',
       'Create content, speak at conferences, and help developers succeed with our platform.',
       '130k-160k', 'Remote (US)', 'Twitter',
       'Got a generic rejection email after second round.',
       '2026-01-10', NULL, NULL),

      ('CloudNative Ltd', 'SRE Lead', 'https://cloudnative.ltd/jobs/303', 'withdrawn',
       'Lead the SRE team. On-call rotation, incident management, reliability engineering.',
       '180k-220k', 'Austin, TX', 'LinkedIn',
       'Withdrew after learning about on-call expectations.',
       '2026-02-01', NULL, NULL)
  `;

  yield* Console.log("Seeded 7 sample applications.");
});

const MainLive = Layer.mergeAll(DatabaseLive, BunContext.layer);

Effect.runPromise(seed.pipe(Effect.provide(MainLive)));
