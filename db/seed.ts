import { BunContext } from "@effect/platform-bun";
import { SqlClient } from "@effect/sql";
import { Console, Effect, Layer } from "effect";
import { DatabaseLive } from "./client";

const seed = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* sql`DELETE FROM qa_entries`;
  yield* sql`DELETE FROM applications`;

  yield* sql`
    INSERT INTO applications (id, company, role, url, status, job_description, salary_range, location, platform, notes, applied_at, next_action, next_action_date)
    VALUES
      ('a0000000-0000-0000-0000-000000000001', 'Acme Corp', 'Senior Backend Engineer', 'https://acme.com/careers/123', 'interviewing',
       '## About the Role

We''re looking for a Senior Backend Engineer to build scalable APIs with TypeScript and PostgreSQL.

### Requirements
- 5+ years backend development
- Strong TypeScript/Node.js experience
- PostgreSQL and event-driven architecture
- Experience with CI/CD pipelines

### What We Offer
- Competitive salary and equity
- Remote-first culture
- Learning budget',
       '150k-180k', 'Remote (US)', 'LinkedIn',
       'Had a great initial call with hiring manager. Technical round scheduled.',
       '2026-02-10', 'Prepare system design examples', '2026-03-05'),

      ('a0000000-0000-0000-0000-000000000002', 'StartupXYZ', 'Full Stack Developer', 'https://startupxyz.com/jobs/456', 'applied',
       '## Full Stack Developer

Join our small team building the next generation of developer tools.

### Stack
- React + TypeScript
- Node.js + Express
- PostgreSQL + Redis

### Ideal Candidate
- 3+ years full-stack experience
- Passion for developer experience',
       '120k-150k', 'San Francisco, CA', 'Hacker News',
       'Applied through HN Who is Hiring thread.',
       '2026-02-20', 'Follow up if no response', '2026-03-06'),

      ('a0000000-0000-0000-0000-000000000003', 'BigTech Inc', 'Staff Software Engineer', 'https://bigtech.com/careers/789', 'screening',
       'Lead technical initiatives across multiple teams. Strong distributed systems background required.',
       '200k-250k', 'Seattle, WA (Hybrid)', 'Referral',
       'Referred by former colleague. Recruiter screen completed.',
       '2026-02-15', 'Complete take-home assessment', '2026-03-01'),

      ('a0000000-0000-0000-0000-000000000004', 'DataFlow', 'Platform Engineer', 'https://dataflow.io/jobs/101', 'offer',
       'Design and maintain our Kubernetes-based platform. Terraform, Go, and observability experience.',
       '160k-190k', 'Remote (Global)', 'Company Website',
       'Offer received! Negotiating on equity.',
       '2026-01-25', 'Respond to offer', '2026-03-01'),

      ('a0000000-0000-0000-0000-000000000005', 'CoolStartup', 'Engineering Manager', NULL, 'draft',
       NULL, '170k-200k', 'New York, NY', NULL,
       'Heard about this role from a friend. Need to research more.',
       NULL, 'Research company and role', '2026-03-10'),

      ('a0000000-0000-0000-0000-000000000006', 'DevTools Co', 'Developer Advocate', 'https://devtools.co/careers/202', 'rejected',
       'Create content, speak at conferences, and help developers succeed with our platform.',
       '130k-160k', 'Remote (US)', 'Twitter',
       'Got a generic rejection email after second round.',
       '2026-01-10', NULL, NULL),

      ('a0000000-0000-0000-0000-000000000007', 'CloudNative Ltd', 'SRE Lead', 'https://cloudnative.ltd/jobs/303', 'withdrawn',
       'Lead the SRE team. On-call rotation, incident management, reliability engineering.',
       '180k-220k', 'Austin, TX', 'LinkedIn',
       'Withdrew after learning about on-call expectations.',
       '2026-02-01', NULL, NULL)
  `;

  yield* Console.log("Seeded 7 sample applications.");

  yield* sql`
    INSERT INTO qa_entries (application_id, question, answer, tags)
    VALUES
      ('a0000000-0000-0000-0000-000000000001', 'Describe your experience with event-driven architecture.',
       'I designed and built an event-driven order processing system using Kafka and TypeScript. Events were published for order creation, payment processing, and fulfillment, allowing each service to react independently. This reduced coupling and improved system resilience — when the payment service had downtime, orders queued up and processed automatically on recovery.',
       ARRAY['technical', 'system-design']),

      ('a0000000-0000-0000-0000-000000000001', 'What is your approach to API design?',
       'I follow a contract-first approach: define the API schema (OpenAPI/Effect Schema) before implementation. I prefer RESTful conventions with consistent error responses and pagination. For complex operations, I use CQRS patterns to separate reads from writes.',
       ARRAY['technical']),

      ('a0000000-0000-0000-0000-000000000001', 'Why are you interested in this role?',
       '',
       ARRAY['behavioral']),

      ('a0000000-0000-0000-0000-000000000002', 'Tell us about a project you are most proud of.',
       'I built a real-time collaborative code editor that supports 50+ concurrent users. The key technical challenge was conflict resolution — I implemented a CRDT-based approach instead of OT, which simplified the architecture significantly while handling network partitions gracefully.',
       ARRAY['behavioral', 'technical']),

      ('a0000000-0000-0000-0000-000000000002', 'What excites you about developer tools?',
       'I believe great developer tools are force multipliers. A well-designed CLI or library can save thousands of hours across an engineering org. I am particularly excited about AI-assisted development tooling and how it can reduce the gap between intent and implementation.',
       ARRAY['behavioral']),

      ('a0000000-0000-0000-0000-000000000003', 'Describe a time you led a technical decision that others disagreed with.',
       'When our team was choosing between microservices and a modular monolith, I advocated for the monolith. The team was split — several engineers wanted microservices for resume-driven reasons. I presented data on our team size (8 engineers), deployment complexity, and operational overhead. We went with the monolith and shipped 3x faster in the first quarter.',
       ARRAY['leadership', 'behavioral']),

      ('a0000000-0000-0000-0000-000000000004', 'What is your experience with Kubernetes?',
       'I have managed production Kubernetes clusters (EKS and GKE) for 3 years. I have authored Helm charts, implemented GitOps workflows with ArgoCD, and built custom operators for our internal platform. I also led our migration from Docker Swarm to Kubernetes, reducing deployment failures by 80%.',
       ARRAY['technical', 'infrastructure']),

      ('a0000000-0000-0000-0000-000000000004', 'How do you approach on-call and incident management?',
       'I believe in blameless postmortems and actionable runbooks. I set up PagerDuty rotations with proper escalation policies, ensure every alert has a corresponding runbook, and track MTTR/MTTD metrics. I also run quarterly game days to test our incident response procedures.',
       ARRAY['leadership', 'infrastructure'])
  `;

  yield* Console.log("Seeded 8 sample Q&A entries.");
});

const MainLive = Layer.mergeAll(DatabaseLive, BunContext.layer);

Effect.runPromise(seed.pipe(Effect.provide(MainLive)));
