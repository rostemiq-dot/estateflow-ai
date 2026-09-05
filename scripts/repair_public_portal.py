from pathlib import Path
import re

path = Path("src/pages/PublicPropertiesPage.tsx")
text = path.read_text()

replacements = [
    (
        '''async function signPaths(paths: string[]) {
    if (!paths.length) return new Map<string, string>();
    try {
      const { data, error } = await requireSupabase().storage
        .from(BUCKET)
        .createSignedUrls(paths, SIGNED_URL_TTL);
      if (error || !data) return new Map<string, string>();
      return new Map(paths.map((path, index) => [path, data[index]?.signedUrl ?? ""]));
    } catch {
      return new Map<string, string>();
    }
  }''',
        '''async function signPaths(paths: string[]) {
    if (!paths.length) return new Map<string, string>();
    const supabase = requireSupabase();
    return new Map(paths.map((path) => [path, supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl]));
  }''',
    ),
    (
        '  const [requestError, setRequestError] = useState("");\n',
        '  const [requestError, setRequestError] = useState("");\n  const [whatsappUrl, setWhatsappUrl] = useState("");\n',
    ),
    (
        'const BUCKET = "property-media";\nconst SIGNED_URL_TTL = 60 * 60;\n',
        'const BUCKET = "property-media";\nconst WHATSAPP_NUMBER = "9647503975384";\n',
    ),
]

for old, new in replacements:
    if old in text:
        text = text.replace(old, new, 1)

# Remove duplicate declarations/blocks created by earlier repair attempts.
text = re.sub(r'(  const \[whatsappUrl, setWhatsappUrl\] = useState\(""\);\n)+', '  const [whatsappUrl, setWhatsappUrl] = useState("");\n', text)

# If the viewing success block already contains two identical WhatsApp payloads,
# keep only the first payload and one browser-open call.
payload = re.compile(
    r'''      const whatsappMessage = \[\n.*?      setWhatsappUrl\(nextWhatsappUrl\);\n''',
    re.S,
)
matches = list(payload.finditer(text))
if len(matches) > 1:
    first = matches[0]
    second = matches[1]
    text = text[:first.end()] + text[second.end():]

text = re.sub(
    r'(      window\.setTimeout\(\(\) => window\.open\(nextWhatsappUrl, "_blank", "noopener,noreferrer"\), 0\);\n)+',
    '      window.setTimeout(() => window.open(nextWhatsappUrl, "_blank", "noopener,noreferrer"), 0);\n',
    text,
)

path.write_text(text)
