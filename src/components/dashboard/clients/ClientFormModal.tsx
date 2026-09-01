import { Check, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  CLIENT_STAGES,
  type Client,
  type ClientPurpose,
  type ClientStage,
} from "../../../features/clients/client-data";
import { createClientId } from "../../../features/clients/client-storage";
import {
  PROPERTY_CURRENCIES,
  PROPERTY_TYPES,
  type PropertyCurrency,
  type PropertyType,
} from "../../../features/properties/property-data";

type ClientFormModalProps = {
  client?: Client;
  existingClients: readonly Pick<Client, "id">[];
  onClose: () => void;
  onSave: (client: Client) => boolean;
};

const inputClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100";

function toDateTimeInput(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function createSmartSummary(stage: ClientStage, propertyTypes: PropertyType[]) {
  const typeLabel =
    propertyTypes.length === 0
      ? "Flexible property type"
      : propertyTypes.join(" / ");

  switch (stage) {
    case "Negotiating":
      return `Active negotiation · ${typeLabel}`;
    case "Viewing":
      return `Viewing-ready client · ${typeLabel}`;
    case "Qualified":
      return `Budget and requirements confirmed · ${typeLabel}`;
    case "Contacted":
      return `Initial contact completed · ${typeLabel}`;
    case "Closed":
      return `Client journey completed · ${typeLabel}`;
    case "New Lead":
    default:
      return `New enquiry · ${typeLabel}`;
  }
}

function createRecommendedAction(stage: ClientStage) {
  switch (stage) {
    case "Negotiating":
      return "Confirm offer terms and prepare the next deal step.";
    case "Viewing":
      return "Schedule or confirm the strongest property viewing.";
    case "Qualified":
      return "Share the top matching properties and request feedback.";
    case "Contacted":
      return "Confirm budget, areas, property type, and move-in timing.";
    case "Closed":
      return "Keep the completed client record for future referrals.";
    case "New Lead":
    default:
      return "Contact the client and qualify their requirements.";
  }
}

export function ClientFormModal({
  client,
  existingClients,
  onClose,
  onSave,
}: ClientFormModalProps) {
  const [name, setName] = useState(client?.name ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [purpose, setPurpose] = useState<ClientPurpose>(
    client?.purpose ?? "Buy",
  );
  const [budgetMin, setBudgetMin] = useState(
    client ? String(client.budgetMin) : "",
  );
  const [budgetMax, setBudgetMax] = useState(
    client ? String(client.budgetMax) : "",
  );
  const [currency, setCurrency] = useState<PropertyCurrency>(
    client?.currency ?? "USD",
  );
  const [areas, setAreas] = useState(client?.preferredAreas.join(", ") ?? "");
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>(
    client?.propertyTypes ?? [],
  );
  const [minBedrooms, setMinBedrooms] = useState(
    client ? String(client.minBedrooms) : "0",
  );
  const [needs, setNeeds] = useState(client?.propertyNeeds ?? "");
  const [stage, setStage] = useState<ClientStage>(client?.stage ?? "New Lead");
  const [followUpAt, setFollowUpAt] = useState(
    toDateTimeInput(client?.followUpAt ?? ""),
  );
  const [error, setError] = useState("");

  function togglePropertyType(propertyType: PropertyType) {
    setPropertyTypes((currentTypes) =>
      currentTypes.includes(propertyType)
        ? currentTypes.filter((type) => type !== propertyType)
        : [...currentTypes, propertyType],
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const minimumBudget = Number(budgetMin);
    const maximumBudget = Number(budgetMax);

    if (maximumBudget < minimumBudget) {
      setError(
        "Maximum budget must be equal to or higher than minimum budget.",
      );
      return;
    }

    const now = new Date().toISOString();
    const followUpDate = followUpAt ? new Date(followUpAt) : null;
    const savedClient: Client = {
      id: client?.id ?? createClientId(existingClients),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || "No email added",
      purpose,
      budgetMin: minimumBudget,
      budgetMax: maximumBudget,
      currency,
      preferredAreas: areas
        .split(",")
        .map((area) => area.trim())
        .filter(Boolean),
      propertyTypes,
      minBedrooms: Number(minBedrooms),
      propertyNeeds: needs.trim() || "Property needs not added yet",
      stage,
      leadScore: client?.leadScore ?? 50,
      assignedAgent: client?.assignedAgent ?? "Mohammed",
      followUp: followUpDate
        ? new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }).format(followUpDate)
        : "Set follow-up time",
      followUpAt: followUpDate?.toISOString() ?? "",
      smartSummary: createSmartSummary(stage, propertyTypes),
      recommendedAction: createRecommendedAction(stage),
      createdAt: client?.createdAt ?? now,
      updatedAt: now,
    };

    if (onSave(savedClient)) {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
      <div className="mx-auto flex min-h-full max-w-4xl items-center">
        <form
          aria-labelledby="client-form-title"
          aria-modal="true"
          role="dialog"
          onSubmit={handleSubmit}
          className="my-6 w-full overflow-hidden rounded-3xl bg-slate-50 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-5 border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                {client ? "Client workspace" : "New client"}
              </p>
              <h2
                id="client-form-title"
                className="mt-1 text-2xl font-bold text-slate-950"
              >
                {client ? "Edit client profile" : "Add client profile"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Save exact requirements so smart matching can do useful work.
              </p>
            </div>

            <button
              aria-label="Close client form"
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </div>

          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-slate-950">Contact and pipeline</h3>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Full name *
                  </span>
                  <input
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Client name"
                    className={inputClassName}
                  />
                </label>

                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Phone number *
                  </span>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+964 750..."
                    className={inputClassName}
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Email address
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="client@email.com"
                    className={inputClassName}
                  />
                </label>

                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Looking to
                  </span>
                  <select
                    value={purpose}
                    onChange={(event) =>
                      setPurpose(event.target.value as ClientPurpose)
                    }
                    className={inputClassName}
                  >
                    <option value="Buy">Buy a property</option>
                    <option value="Rent">Rent a property</option>
                  </select>
                </label>

                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Pipeline stage
                  </span>
                  <select
                    value={stage}
                    onChange={(event) =>
                      setStage(event.target.value as ClientStage)
                    }
                    className={inputClassName}
                  >
                    {CLIENT_STAGES.map((clientStage) => (
                      <option key={clientStage} value={clientStage}>
                        {clientStage}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Next follow-up
                  </span>
                  <input
                    type="datetime-local"
                    value={followUpAt}
                    onChange={(event) => setFollowUpAt(event.target.value)}
                    className={inputClassName}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-slate-950">
                Property requirements
              </h3>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Currency
                  </span>
                  <select
                    value={currency}
                    onChange={(event) =>
                      setCurrency(event.target.value as PropertyCurrency)
                    }
                    className={inputClassName}
                  >
                    {PROPERTY_CURRENCIES.map((propertyCurrency) => (
                      <option key={propertyCurrency} value={propertyCurrency}>
                        {propertyCurrency}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Minimum bedrooms
                  </span>
                  <input
                    min="0"
                    type="number"
                    value={minBedrooms}
                    onChange={(event) => setMinBedrooms(event.target.value)}
                    className={inputClassName}
                  />
                </label>

                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Minimum budget *
                  </span>
                  <input
                    required
                    min="0"
                    type="number"
                    value={budgetMin}
                    onChange={(event) => setBudgetMin(event.target.value)}
                    className={inputClassName}
                  />
                </label>

                <label>
                  <span className="text-sm font-semibold text-slate-700">
                    Maximum budget *
                  </span>
                  <input
                    required
                    min="0"
                    type="number"
                    value={budgetMax}
                    onChange={(event) => setBudgetMax(event.target.value)}
                    className={inputClassName}
                  />
                </label>

                <fieldset className="sm:col-span-2">
                  <legend className="text-sm font-semibold text-slate-700">
                    Property types
                  </legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {PROPERTY_TYPES.map((propertyType) => {
                      const isSelected = propertyTypes.includes(propertyType);

                      return (
                        <button
                          key={propertyType}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => togglePropertyType(propertyType)}
                          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${
                            isSelected
                              ? "border-amber-400 bg-amber-50 text-amber-900"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {isSelected && <Check aria-hidden="true" size={15} />}
                          {propertyType}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Leave all unselected when the client is open to any type.
                  </p>
                </fieldset>

                <label className="sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Preferred areas
                  </span>
                  <input
                    value={areas}
                    onChange={(event) => setAreas(event.target.value)}
                    placeholder="Ankawa, Empire World"
                    className={inputClassName}
                  />
                  <span className="mt-1 block text-xs text-slate-400">
                    Separate each area with a comma.
                  </span>
                </label>

                <label className="sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">
                    Extra needs
                  </span>
                  <textarea
                    rows={3}
                    value={needs}
                    onChange={(event) => setNeeds(event.target.value)}
                    placeholder="Furnished, garden, parking, move-in date..."
                    className={`${inputClassName} resize-y`}
                  />
                </label>
              </div>
            </section>
          </div>

          {error && (
            <p
              role="alert"
              className="mx-5 mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 sm:mx-7"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-5 sm:flex-row sm:justify-end sm:px-7">
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-12 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              {client ? "Save changes" : "Create client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
