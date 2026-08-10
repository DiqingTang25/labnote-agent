import { createClient } from "@supabase/supabase-js";
import { ALL_PRESET_TEMPLATES } from "../src/lib/templates/presets";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const rows = ALL_PRESET_TEMPLATES.map((template) => ({
  id: template.id,
  name: template.name,
  experiment_type: template.experimentType,
  domain: template.domain,
  version: template.version,
  field_groups: template.fieldGroups,
  is_preset: true,
  created_by: null,
  updated_at: new Date().toISOString(),
}));

const { error } = await supabase
  .from("templates")
  .upsert(rows, { onConflict: "id" });

if (error) throw error;

const { count, error: countError } = await supabase
  .from("templates")
  .select("id", { count: "exact", head: true })
  .eq("is_preset", true);

if (countError) throw countError;
if (count !== ALL_PRESET_TEMPLATES.length) {
  throw new Error(`Expected ${ALL_PRESET_TEMPLATES.length} preset templates, found ${count ?? 0}`);
}

console.log(`Seeded and verified ${count} preset templates.`);
