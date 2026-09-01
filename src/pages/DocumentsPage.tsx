import {
  Download,
  Eye,
  File,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import {
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
  type DocumentMetadata,
  type EntityType,
} from "../features/documents/document-data";
import {
  deleteDocumentFile,
  getDocumentFile,
  loadDocumentMetadata,
  putDocumentFile,
  saveDocumentMetadata,
  validateDocument,
} from "../features/documents/document-storage";
export function DocumentsPage() {
  const [items, setItems] = useState(loadDocumentMetadata),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState<"All" | DocumentCategory>("All"),
    [filterEntity, setFilterEntity] = useState<"All" | EntityType>("All"),
    [sort, setSort] = useState<"recent" | "name" | "size">("recent"),
    [entity, setEntity] = useState<EntityType>("Deal"),
    [entityId, setEntityId] = useState(""),
    [uploadCategory, setUploadCategory] = useState<DocumentCategory>("Other"),
    [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const filtered = items
    .filter(
      (d) =>
        (category === "All" || d.category === category) &&
        (filterEntity === "All" || d.entityType === filterEntity) &&
        (!search || d.name.toLowerCase().includes(search.toLowerCase())),
    )
    .sort((first, second) =>
      sort === "name"
        ? first.name.localeCompare(second.name)
        : sort === "size"
          ? second.size - first.size
          : second.updatedAt.localeCompare(first.updatedAt),
    );
  async function upload(file?: File) {
    if (!file) return;
    const validation = validateDocument(file);
    if (validation) {
      setError(validation);
      return;
    }
    if (!entityId.trim()) {
      setError("Enter the linked record ID before uploading.");
      return;
    }
    const now = new Date().toISOString(),
      id = `DOC-${now.replace(/\D/g, "")}`;
    try {
      await putDocumentFile(id, file);
      const meta: DocumentMetadata = {
        id,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        category: uploadCategory,
        entityType: entity,
        entityId: entityId.trim(),
        createdAt: now,
        updatedAt: now,
      };
      const next = [meta, ...items];
      saveDocumentMetadata(next);
      setItems(next);
      setError("");
    } catch {
      setError("The document could not be stored in this browser.");
    }
  }
  async function download(d: DocumentMetadata) {
    const blob = await getDocumentFile(d.id);
    if (!blob) {
      setError("The stored file is unavailable.");
      return;
    }
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = d.name;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function preview(d: DocumentMetadata) {
    const blob = await getDocumentFile(d.id);
    if (!blob) {
      setError("The stored file is unavailable.");
      return;
    }
    if (!blob.type.startsWith("image/") && blob.type !== "application/pdf") {
      setError(
        "Preview is available for PDF and image files. Download this file to open it.",
      );
      return;
    }
    window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
  }
  function replace(d: DocumentMetadata) {
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = ".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx";
    picker.onchange = async () => {
      const file = picker.files?.[0];
      if (!file) return;
      const validation = validateDocument(file);
      if (validation) {
        setError(validation);
        return;
      }
      await putDocumentFile(d.id, file);
      const next = items.map((item) =>
        item.id === d.id
          ? {
              ...item,
              name: file.name,
              mimeType: file.type,
              size: file.size,
              updatedAt: new Date().toISOString(),
            }
          : item,
      );
      saveDocumentMetadata(next);
      setItems(next);
      setError("");
    };
    picker.click();
  }
  async function remove(d: DocumentMetadata) {
    if (!window.confirm(`Delete ${d.name}? This cannot be undone.`)) return;
    await deleteDocumentFile(d.id);
    const next = items.filter((x) => x.id !== d.id);
    saveDocumentMetadata(next);
    setItems(next);
  }
  return (
    <DashboardShell>
      <section>
        <p className="text-sm font-semibold text-amber-700">SHARED FILES</p>
        <h1 className="mt-2 text-3xl font-bold">Document Center</h1>
        <p className="mt-2 text-slate-600">
          Files remain in this browser through IndexedDB; metadata stays linked
          to existing records.
        </p>
      </section>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700"
        >
          {error}
        </p>
      )}
      <section className="mt-6 grid gap-3 rounded-2xl bg-white p-4 lg:grid-cols-5">
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value as EntityType)}
          className="min-h-12 rounded-xl border px-3"
        >
          {["Property", "Client", "Deal", "Contract", "Offer", "Payment"].map(
            (x) => (
              <option key={x}>{x}</option>
            ),
          )}
        </select>
        <input
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          placeholder="Linked record ID"
          className="min-h-12 rounded-xl border px-4"
        />
        <select
          value={uploadCategory}
          onChange={(e) =>
            setUploadCategory(e.target.value as DocumentCategory)
          }
          className="min-h-12 rounded-xl border px-3"
        >
          {DOCUMENT_CATEGORIES.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <input
          ref={ref}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx"
          onChange={(e) => upload(e.target.files?.[0])}
        />
        <button
          onClick={() => ref.current?.click()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 font-bold"
        >
          <Upload size={17} /> Upload
        </button>
        <p className="self-center text-xs text-slate-500">
          PDF, images, DOCX, XLSX · 10 MB max
        </p>
      </section>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative flex-1">
          <Search
            className="absolute left-4 top-3.5 text-slate-400"
            size={18}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-12 w-full rounded-xl border bg-white pl-11"
            placeholder="Search documents"
          />
        </label>
        <select
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as "All" | DocumentCategory)
          }
          className="min-h-12 rounded-xl border bg-white px-4"
        >
          <option>All</option>
          {DOCUMENT_CATEGORIES.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          value={filterEntity}
          onChange={(e) =>
            setFilterEntity(e.target.value as "All" | EntityType)
          }
          className="min-h-12 rounded-xl border bg-white px-4"
        >
          <option>All</option>
          {["Property", "Client", "Deal", "Contract", "Offer", "Payment"].map(
            (x) => (
              <option key={x}>{x}</option>
            ),
          )}
        </select>
        <select
          value={sort}
          onChange={(e) =>
            setSort(e.target.value as "recent" | "name" | "size")
          }
          className="min-h-12 rounded-xl border bg-white px-4"
        >
          <option value="recent">Recently updated</option>
          <option value="name">Name</option>
          <option value="size">Largest file</option>
        </select>
      </section>
      <p className="mt-4 text-sm font-semibold text-slate-500">
        {filtered.length} documents
      </p>
      <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((d) => (
          <article key={d.id} className="rounded-2xl border bg-white p-5">
            <File className="text-amber-600" />
            <input
              aria-label="Document name"
              value={d.name}
              onChange={(e) => {
                const next = items.map((x) =>
                  x.id === d.id
                    ? {
                        ...x,
                        name: e.target.value,
                        updatedAt: new Date().toISOString(),
                      }
                    : x,
                );
                saveDocumentMetadata(next);
                setItems(next);
              }}
              className="mt-3 w-full rounded-lg border px-2 py-1 font-bold"
            />
            <p className="mt-2 text-sm text-slate-500">
              {d.category} · {d.entityType} {d.entityId}
              <br />
              {Math.ceil(d.size / 1024)} KB
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => preview(d)}
                className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-slate-100"
                aria-label="Preview"
              >
                <Eye size={17} />
              </button>
              <button
                onClick={() => download(d)}
                className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-slate-100"
                aria-label="Download"
              >
                <Download size={17} />
              </button>
              <button
                onClick={() => replace(d)}
                className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-slate-100"
                aria-label="Replace"
              >
                <RefreshCw size={17} />
              </button>
              <button
                onClick={() => remove(d)}
                className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-rose-50 text-rose-600"
                aria-label="Delete"
              >
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
        {!filtered.length && (
          <p className="rounded-2xl border border-dashed bg-white p-10 text-center text-slate-500 md:col-span-2">
            No uploaded documents match these filters.
          </p>
        )}
      </section>
    </DashboardShell>
  );
}
