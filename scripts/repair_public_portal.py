from pathlib import Path

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
    (
        '''      setRequestSent(true);
      setForm({ name: "", phone: "", whatsapp: "", date: "", time: "", message: "", website: "" });''',
        '''      const whatsappMessage = [
        "Hello Mohammed, I would like to request a property viewing.",
        `Property: ${selected.title}`,
        `Reference: ${selected.referenceCode}`,
        `Price: ${formatPrice(selected.price, selected.currency)}`,
        `Location: ${locationLabel(selected) || selected.country}`,
        `Name: ${form.name}`,
        `Phone: ${form.phone}`,
        `WhatsApp: ${form.whatsapp || form.phone}`,
        `Preferred date: ${form.date}`,
        `Preferred time: ${form.time}`,
        form.message ? `Message: ${form.message}` : "",
      ].filter(Boolean).join("\\n");
      const nextWhatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
      setWhatsappUrl(nextWhatsappUrl);
      setRequestSent(true);
      setForm({ name: "", phone: "", whatsapp: "", date: "", time: "", message: "", website: "" });
      window.setTimeout(() => window.open(nextWhatsappUrl, "_blank", "noopener,noreferrer"), 0);''',
    ),
    (
        '''              {requestSent && <div className="mt-7 rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white"><Check size={24} /></div><p className="mt-4 text-lg font-black text-emerald-900">Viewing request sent successfully</p><p className="mt-2 text-sm leading-6 text-emerald-800">Thank you. Our team has received your request and will contact you shortly to confirm the appointment.</p></div>}''',
        '''              {requestSent && <div className="mt-7 rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white"><Check size={24} /></div><p className="mt-4 text-lg font-black text-emerald-900">Viewing request sent successfully</p><p className="mt-2 text-sm leading-6 text-emerald-800">Your request is saved. WhatsApp is ready with the property and viewing details so you can send them directly to our team.</p><a href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-black text-white shadow-sm hover:brightness-95"><span className="text-lg">◉</span> Send details to WhatsApp</a></div>}''',
    ),
    (
        '''  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeProperty();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);''',
        '''  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeProperty();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selected]);''',
    ),
    (
        'fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6',
        'fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6',
    ),
    (
        'className="max-h-[78vh] overflow-y-auto p-6 sm:p-8"',
        'className="max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain p-6 sm:p-8"',
    ),
]

for old, new in replacements:
    if old in text:
        text = text.replace(old, new, 1)

path.write_text(text)
