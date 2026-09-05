-- Create table to track audit doc versions derived from an immutable base DOCX

CREATE TABLE IF NOT EXISTS public.audit_doc_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link back to the audited saved rasm (AuditHub context)
  saved_rasm_id uuid NOT NULL,

  -- Immutable base document (judge-accepted DOCX)
  base_doc_url text NOT NULL,
  base_doc_sha256 text,

  -- Edits as a deterministic, versionable patch
  patch_json jsonb NOT NULL,
  patch_sha256 text,

  -- Server-generated artifacts
  final_docx_url text,
  final_pdf_url text,
  final_docx_sha256 text,
  final_pdf_sha256 text,

  status text NOT NULL DEFAULT 'draft',

  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),

  supersedes_version_id uuid,

  CONSTRAINT audit_doc_versions_status_check CHECK (status IN ('draft', 'finalized')),
  CONSTRAINT audit_doc_versions_supersedes_fk FOREIGN KEY (supersedes_version_id)
    REFERENCES public.audit_doc_versions(id)
    ON DELETE SET NULL
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS audit_doc_versions_saved_rasm_id_idx ON public.audit_doc_versions(saved_rasm_id);
CREATE INDEX IF NOT EXISTS audit_doc_versions_status_idx ON public.audit_doc_versions(status);
CREATE INDEX IF NOT EXISTS audit_doc_versions_created_at_idx ON public.audit_doc_versions(created_at DESC);

-- Permissions
-- Backend uses the Supabase service role key; new tables may not automatically grant privileges.
GRANT USAGE ON SCHEMA public TO service_role;
REVOKE ALL ON TABLE public.audit_doc_versions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_doc_versions TO service_role;
