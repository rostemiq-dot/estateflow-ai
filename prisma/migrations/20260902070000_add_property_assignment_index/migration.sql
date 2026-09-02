-- Add a covering index for property assignment lookups.
CREATE INDEX IF NOT EXISTS properties_assigned_agent_id_idx
  ON public.properties (assigned_agent_id);
