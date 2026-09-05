from pathlib import Path
import re

path = Path("src/pages/PublicPropertiesPage.tsx")
text = path.read_text()
replacement = '''async function signPaths(paths: string[]) {
  if (!paths.length) return new Map<string, string>();
  const supabase = requireSupabase();
  return new Map(paths.map((path) => [path, supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl]));
}

export function PublicPropertiesPage'''
pattern = r'async function signPaths\(paths: string\[\]\) \{.*?\n\}\n\nexport function PublicPropertiesPage'
updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
if count != 1:
    raise SystemExit("Could not locate public photo URL helper")
path.write_text(updated)
