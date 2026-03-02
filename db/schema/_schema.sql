\restrict UAypowvsxOYykYdjPLAmzA3j6hh9GybfpidXcijDxDACawQXQr3qFeLQpXqFZaw

CREATE FUNCTION public.qa_search_vector_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.question, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.answer, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
      RETURN NEW;
    END;
    $$;

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company text NOT NULL,
    role text NOT NULL,
    url text,
    status text DEFAULT 'draft'::text NOT NULL,
    job_description text,
    salary_range text,
    location text,
    platform text,
    contact_name text,
    contact_email text,
    notes text,
    applied_at timestamp with time zone,
    next_action text,
    next_action_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT applications_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'applied'::text, 'screening'::text, 'interviewing'::text, 'offer'::text, 'accepted'::text, 'rejected'::text, 'withdrawn'::text])))
);

CREATE TABLE public.effect_sql_migrations (
    migration_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL
);

CREATE TABLE public.qa_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    question text NOT NULL,
    answer text DEFAULT ''::text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    search_vector tsvector,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.effect_sql_migrations
    ADD CONSTRAINT effect_sql_migrations_pkey PRIMARY KEY (migration_id);

ALTER TABLE ONLY public.qa_entries
    ADD CONSTRAINT qa_entries_pkey PRIMARY KEY (id);

CREATE INDEX idx_qa_entries_application_id ON public.qa_entries USING btree (application_id);

CREATE INDEX idx_qa_entries_search_vector ON public.qa_entries USING gin (search_vector);

CREATE INDEX idx_qa_entries_tags ON public.qa_entries USING gin (tags);

CREATE TRIGGER qa_search_vector_trigger BEFORE INSERT OR UPDATE ON public.qa_entries FOR EACH ROW EXECUTE FUNCTION public.qa_search_vector_update();

ALTER TABLE ONLY public.qa_entries
    ADD CONSTRAINT qa_entries_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

\unrestrict UAypowvsxOYykYdjPLAmzA3j6hh9GybfpidXcijDxDACawQXQr3qFeLQpXqFZaw

\restrict QdvyjweddGFSI2ahJoh4UUVlZ9qkAe2CgirMFteb29qFDdslUdHIG1GNYzwJ4Qj

INSERT INTO public.effect_sql_migrations (migration_id, created_at, name) VALUES (1, '2026-02-28 10:27:27.660566+00', 'create_applications');
INSERT INTO public.effect_sql_migrations (migration_id, created_at, name) VALUES (2, '2026-03-02 09:09:30.954471+00', 'create_qa_entries');
INSERT INTO public.effect_sql_migrations (migration_id, created_at, name) VALUES (3, '2026-03-02 09:09:30.954471+00', 'add_fts_trigger');

\unrestrict QdvyjweddGFSI2ahJoh4UUVlZ9qkAe2CgirMFteb29qFDdslUdHIG1GNYzwJ4Qj