"use client";

import { useId, type ReactNode } from "react";
import type { NdaValues, Party } from "@/lib/nda/types";

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20";

function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {children(id)}
    </div>
  );
}

function YearsInput({ value, onChange, disabled, label }: { value: number; onChange: (n: number) => void; disabled: boolean; label: string }) {
  return (
    <input
      type="number"
      min={1}
      step={1}
      aria-label={label}
      disabled={disabled}
      value={Number.isNaN(value) ? "" : value}
      onChange={(e) => onChange(e.target.valueAsNumber)}
      className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100 disabled:text-slate-400"
    />
  );
}

const optionClass = "flex items-center gap-2 text-sm";

type Props = {
  values: NdaValues;
  onChange: (update: (values: NdaValues) => NdaValues) => void;
};

/** The form for the key terms of the Mutual NDA. */
export function NdaForm({ values, onChange }: Props) {
  const set = <K extends keyof NdaValues>(key: K, value: NdaValues[K]) =>
    onChange((v) => ({ ...v, [key]: value }));

  const setParty = (index: 0 | 1, key: keyof Party, value: string) =>
    onChange((v) => {
      const parties: NdaValues["parties"] = [{ ...v.parties[0] }, { ...v.parties[1] }];
      parties[index][key] = value;
      return { ...v, parties };
    });

  return (
    <form className="mt-4 space-y-5" onSubmit={(e) => e.preventDefault()}>
      <Field label="Purpose" hint="How Confidential Information may be used">
        {(id) => (
          <textarea id={id} rows={3} className={inputClass} value={values.purpose} onChange={(e) => set("purpose", e.target.value)} />
        )}
      </Field>

      <Field label="Effective Date">
        {(id) => (
          <input id={id} type="date" className={inputClass} value={values.effectiveDate} onChange={(e) => set("effectiveDate", e.target.value)} />
        )}
      </Field>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">MNDA Term</legend>
        <p className="text-xs text-slate-500">The length of this MNDA</p>
        <div className="mt-2 space-y-2">
          <label className={optionClass}>
            <input type="radio" name="mndaTerm" checked={values.mndaTerm === "expires"} onChange={() => set("mndaTerm", "expires")} />
            Expires
            <YearsInput
              label="MNDA Term in years"
              value={values.mndaTermYears}
              disabled={values.mndaTerm !== "expires"}
              onChange={(n) => set("mndaTermYears", n)}
            />
            year(s) from Effective Date
          </label>
          <label className={optionClass}>
            <input
              type="radio"
              name="mndaTerm"
              checked={values.mndaTerm === "untilTerminated"}
              onChange={() => set("mndaTerm", "untilTerminated")}
            />
            Continues until terminated
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-slate-800">Term of Confidentiality</legend>
        <p className="text-xs text-slate-500">How long Confidential Information is protected</p>
        <div className="mt-2 space-y-2">
          <label className={optionClass}>
            <input
              type="radio"
              name="confidentialityTerm"
              checked={values.confidentialityTerm === "years"}
              onChange={() => set("confidentialityTerm", "years")}
            />
            <YearsInput
              label="Term of Confidentiality in years"
              value={values.confidentialityYears}
              disabled={values.confidentialityTerm !== "years"}
              onChange={(n) => set("confidentialityYears", n)}
            />
            year(s) from Effective Date
          </label>
          <label className={optionClass}>
            <input
              type="radio"
              name="confidentialityTerm"
              checked={values.confidentialityTerm === "perpetual"}
              onChange={() => set("confidentialityTerm", "perpetual")}
            />
            In perpetuity
          </label>
        </div>
      </fieldset>

      <Field label="Governing Law" hint="The US state whose laws govern the MNDA">
        {(id) => (
          <input id={id} className={inputClass} placeholder="e.g. Delaware" value={values.governingLaw} onChange={(e) => set("governingLaw", e.target.value)} />
        )}
      </Field>

      <Field label="Jurisdiction" hint="Where legal proceedings must be brought">
        {(id) => (
          <input
            id={id}
            className={inputClass}
            placeholder="e.g. courts located in New Castle, DE"
            value={values.jurisdiction}
            onChange={(e) => set("jurisdiction", e.target.value)}
          />
        )}
      </Field>

      <Field label="MNDA Modifications" hint="Optional changes to the Standard Terms">
        {(id) => (
          <textarea id={id} rows={2} className={inputClass} value={values.modifications} onChange={(e) => set("modifications", e.target.value)} />
        )}
      </Field>

      {([0, 1] as const).map((index) => (
        <fieldset key={index} className="space-y-3 rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-800">Party {index + 1}</legend>
          <Field label="Company">
            {(id) => (
              <input id={id} className={inputClass} value={values.parties[index].company} onChange={(e) => setParty(index, "company", e.target.value)} />
            )}
          </Field>
          <Field label="Signatory name">
            {(id) => (
              <input id={id} className={inputClass} value={values.parties[index].name} onChange={(e) => setParty(index, "name", e.target.value)} />
            )}
          </Field>
          <Field label="Title">
            {(id) => (
              <input id={id} className={inputClass} value={values.parties[index].title} onChange={(e) => setParty(index, "title", e.target.value)} />
            )}
          </Field>
          <Field label="Notice address" hint="Email or postal address">
            {(id) => (
              <textarea
                id={id}
                rows={2}
                className={inputClass}
                value={values.parties[index].noticeAddress}
                onChange={(e) => setParty(index, "noticeAddress", e.target.value)}
              />
            )}
          </Field>
        </fieldset>
      ))}
    </form>
  );
}
