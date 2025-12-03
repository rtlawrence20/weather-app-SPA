import { useState } from "react";

export default function LocationForm({
  defaultValue = "",
  onSubmitLocation,
  onUseMyLocation,
  loading,
}) {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmitLocation(value.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4"
    >
      {/* Label + input */}
      <label className="flex-1 flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          City or ZIP
        </span>
        <input
          type="text"
          placeholder="e.g. 80202 or Denver"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={loading}
          className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm placeholder:text-slate-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:opacity-60"
        />
      </label>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-slate-900 shadow hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600 transition-colors"
        >
          {loading ? "Fetching…" : "Get Forecast"}
        </button>

        <button
          type="button"
          onClick={onUseMyLocation}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl border border-slate-500 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
        >
          Use My Location
        </button>
      </div>
    </form>
  );
}
