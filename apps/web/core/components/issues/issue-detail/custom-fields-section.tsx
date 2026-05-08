/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import type { ICustomField, ICustomFieldValuePayload } from "@plane/types";
import { ToggleSwitch } from "@plane/ui";
// hooks
import { useCustomField } from "@/hooks/store/use-custom-field";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  typeId: string | null;
  isEditable: boolean;
};

function FieldInput({
  field,
  initialValue,
  isEditable,
  onChange,
}: {
  field: ICustomField;
  initialValue: unknown;
  isEditable: boolean;
  onChange: (field: ICustomField, value: unknown) => void;
}) {
  const [localValue, setLocalValue] = useState<unknown>(initialValue ?? "");

  useEffect(() => {
    setLocalValue(initialValue ?? "");
  }, [initialValue]);

  const handleChange = (val: unknown) => {
    setLocalValue(val);
    onChange(field, val);
  };

  const inputClass =
    "w-full rounded border border-custom-border-200 bg-custom-background-100 px-2 py-1 text-xs text-custom-text-100 outline-none focus:border-custom-primary-100 disabled:cursor-not-allowed disabled:opacity-60";

  if (field.field_type === "text") {
    return (
      <input
        type="text"
        value={String(localValue ?? "")}
        onChange={(e) => handleChange(e.target.value)}
        disabled={!isEditable}
        className={inputClass}
        placeholder={field.is_required ? "Required" : ""}
      />
    );
  }

  if (field.field_type === "number") {
    return (
      <input
        type="number"
        value={localValue === null || localValue === undefined ? "" : String(localValue)}
        onChange={(e) => handleChange(e.target.value === "" ? null : Number(e.target.value))}
        disabled={!isEditable}
        className={inputClass}
        placeholder={field.is_required ? "Required" : ""}
      />
    );
  }

  if (field.field_type === "date") {
    return (
      <input
        type="date"
        value={localValue ? String(localValue).slice(0, 10) : ""}
        onChange={(e) => handleChange(e.target.value || null)}
        disabled={!isEditable}
        className={inputClass}
      />
    );
  }

  if (field.field_type === "boolean") {
    return (
      <ToggleSwitch
        value={Boolean(localValue)}
        onChange={(val) => handleChange(val)}
        disabled={!isEditable}
        size="sm"
      />
    );
  }

  if (field.field_type === "dropdown") {
    return (
      <select
        value={String(localValue ?? "")}
        onChange={(e) => handleChange(e.target.value || null)}
        disabled={!isEditable}
        className={inputClass}
      >
        <option value="">-- Select --</option>
        {field.options.map((opt: string) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  return null;
}

export const CustomFieldsSection = observer(function CustomFieldsSection({
  workspaceSlug,
  projectId,
  issueId,
  typeId,
  isEditable,
}: Props) {
  const { getCustomFieldsByType, fetchCustomFields, getValuesByIssue, fetchIssueValues, saveIssueValues } =
    useCustomField();

  const pendingValues = useRef<Record<string, ICustomFieldValuePayload>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!typeId) return;
    fetchCustomFields(workspaceSlug, projectId, typeId);
    fetchIssueValues(workspaceSlug, projectId, issueId);
  }, [workspaceSlug, projectId, issueId, typeId, fetchCustomFields, fetchIssueValues]);

  const fields = typeId ? getCustomFieldsByType(typeId) : [];
  const savedValues = getValuesByIssue(issueId);

  const getInitialValue = useCallback(
    (field: ICustomField) => {
      const saved = savedValues.find((v) => v.custom_field_id === field.id || v.custom_field === field.id);
      if (!saved) return field.default_value ?? null;
      if (field.field_type === "text") return saved.value_text;
      if (field.field_type === "number") return saved.value_number;
      if (field.field_type === "date") return saved.value_date;
      if (field.field_type === "boolean") return saved.value_bool;
      if (field.field_type === "dropdown") return saved.value_option;
      return null;
    },
    [savedValues]
  );

  const buildPayload = (field: ICustomField, value: unknown): ICustomFieldValuePayload => {
    const base: ICustomFieldValuePayload = { custom_field: field.id };
    if (field.field_type === "text") return { ...base, value_text: value as string };
    if (field.field_type === "number") return { ...base, value_number: value as number };
    if (field.field_type === "date") return { ...base, value_date: value as string };
    if (field.field_type === "boolean") return { ...base, value_bool: value as boolean };
    if (field.field_type === "dropdown") return { ...base, value_option: value as string };
    return base;
  };

  const handleChange = (field: ICustomField, value: unknown) => {
    pendingValues.current[field.id] = buildPayload(field, value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const toSave = Object.values(pendingValues.current);
      if (toSave.length > 0) {
        saveIssueValues(workspaceSlug, projectId, issueId, toSave);
        pendingValues.current = {};
      }
    }, 500);
  };

  if (!typeId || fields.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 pt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-custom-text-300">Custom Fields</h4>
      {fields.map((field) => (
        <div key={field.id} className="flex flex-col gap-1">
          <label className="text-xs text-custom-text-300">
            {field.name}
            {field.is_required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
          <FieldInput
            field={field}
            initialValue={getInitialValue(field)}
            isEditable={isEditable}
            onChange={handleChange}
          />
        </div>
      ))}
    </div>
  );
});
