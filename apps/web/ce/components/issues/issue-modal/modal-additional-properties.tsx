/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// CUSTOM: show custom fields in create/edit issue modal [GTS-006]

import { useCallback, useEffect, useState } from "react";
import { observer } from "mobx-react";
import { useFormContext } from "react-hook-form";
import type { ICustomField, ICustomFieldValuePayload, TIssue } from "@plane/types";
import { ToggleSwitch } from "@plane/ui";
import { useIssueModal } from "@/hooks/context/use-issue-modal";
import { useCustomField } from "@/hooks/store/use-custom-field";

export type TWorkItemModalAdditionalPropertiesProps = {
  isDraft?: boolean;
  projectId: string | null;
  workItemId: string | undefined;
  workspaceSlug: string;
};

function buildPayload(field: ICustomField, value: unknown): ICustomFieldValuePayload {
  const base: ICustomFieldValuePayload = { custom_field: field.id };
  if (field.field_type === "text") return { ...base, value_text: value as string };
  if (field.field_type === "number") return { ...base, value_number: value as number };
  if (field.field_type === "date") return { ...base, value_date: value as string };
  if (field.field_type === "boolean") return { ...base, value_bool: value as boolean };
  if (field.field_type === "dropdown") return { ...base, value_option: value as string };
  return base;
}

function FieldInput({
  field,
  initialValue,
  onChange,
}: {
  field: ICustomField;
  initialValue: unknown;
  onChange: (value: unknown) => void;
}) {
  const [localValue, setLocalValue] = useState<unknown>(initialValue ?? "");

  useEffect(() => {
    setLocalValue(initialValue ?? "");
  }, [initialValue]);

  const handleChange = (val: unknown) => {
    setLocalValue(val);
    onChange(val);
  };

  const inputClass =
    "w-full rounded border border-custom-border-200 bg-custom-background-100 px-2 py-1.5 text-xs text-custom-text-100 outline-none focus:border-custom-primary-100";

  if (field.field_type === "text") {
    return (
      <input
        type="text"
        value={String(localValue ?? "")}
        onChange={(e) => handleChange(e.target.value)}
        className={inputClass}
        placeholder={field.is_required ? "Requerido" : "Opcional"}
      />
    );
  }

  if (field.field_type === "number") {
    return (
      <input
        type="number"
        value={localValue === null || localValue === undefined ? "" : String(localValue)}
        onChange={(e) => handleChange(e.target.value === "" ? null : Number(e.target.value))}
        className={inputClass}
        placeholder={field.is_required ? "Requerido" : ""}
      />
    );
  }

  if (field.field_type === "date") {
    return (
      <input
        type="date"
        value={localValue ? String(localValue).slice(0, 10) : ""}
        onChange={(e) => handleChange(e.target.value || null)}
        className={inputClass}
      />
    );
  }

  if (field.field_type === "boolean") {
    return <ToggleSwitch value={Boolean(localValue)} onChange={(val) => handleChange(val)} size="sm" />;
  }

  if (field.field_type === "dropdown") {
    return (
      <select
        value={String(localValue ?? "")}
        onChange={(e) => handleChange(e.target.value || null)}
        className={inputClass}
      >
        <option value="">-- Seleccionar --</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  return null;
}

function WorkItemModalAdditionalPropertiesInner({
  projectId,
  workItemId,
  workspaceSlug,
}: TWorkItemModalAdditionalPropertiesProps) {
  const { watch } = useFormContext<TIssue>();
  const typeId = watch("type_id") ?? null;

  const { getCustomFieldsByType, fetchCustomFields, getValuesByIssue, fetchIssueValues } = useCustomField();
  const { issuePropertyValues, setIssuePropertyValues } = useIssueModal();

  useEffect(() => {
    if (!typeId || !projectId || !workspaceSlug) return;
    fetchCustomFields(workspaceSlug, projectId, typeId);
    if (workItemId) {
      fetchIssueValues(workspaceSlug, projectId, workItemId);
    }
  }, [typeId, projectId, workspaceSlug, workItemId, fetchCustomFields, fetchIssueValues]);

  const fields = typeId ? getCustomFieldsByType(typeId) : [];
  const savedValues = workItemId ? getValuesByIssue(workItemId) : [];

  // issuePropertyValues stores ready-to-send payloads keyed by field id
  const storedPayloads = issuePropertyValues as Record<string, ICustomFieldValuePayload>;

  const getInitialValue = useCallback(
    (field: ICustomField) => {
      // Already changed by user in this session — use the stored payload value
      const stored = storedPayloads[field.id];
      if (stored !== undefined) {
        if (field.field_type === "text") return stored.value_text;
        if (field.field_type === "number") return stored.value_number;
        if (field.field_type === "date") return stored.value_date;
        if (field.field_type === "boolean") return stored.value_bool;
        if (field.field_type === "dropdown") return stored.value_option;
      }

      // Existing saved value for edit mode
      if (workItemId) {
        const saved = savedValues.find((v) => v.custom_field_id === field.id || v.custom_field === field.id);
        if (saved) {
          if (field.field_type === "text") return saved.value_text;
          if (field.field_type === "number") return saved.value_number;
          if (field.field_type === "date") return saved.value_date;
          if (field.field_type === "boolean") return saved.value_bool;
          if (field.field_type === "dropdown") return saved.value_option;
        }
      }

      return field.default_value ?? null;
    },
    [storedPayloads, savedValues, workItemId]
  );

  const handleChange = (field: ICustomField, value: unknown) => {
    // Store the ready-to-send payload — no field lookup needed at save time
    const payload = buildPayload(field, value);
    setIssuePropertyValues((prev) => ({
      ...(prev as Record<string, ICustomFieldValuePayload>),
      [field.id]: payload,
    }));
  };

  if (!typeId || fields.length === 0) return null;

  return (
    <div className="px-5 flex flex-col gap-3 pt-3 pb-3 border-t border-custom-border-100">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-custom-text-300">Custom Fields</h4>
      {fields.map((field) => (
        <div key={field.id} className="flex items-center gap-3">
          <label className="text-xs text-custom-text-300 w-1/3 shrink-0 leading-tight">
            {field.name}
            {field.is_required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
          <div className="flex-1 min-w-0">
            <FieldInput
              field={field}
              initialValue={getInitialValue(field)}
              onChange={(value) => handleChange(field, value)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export const WorkItemModalAdditionalProperties = observer(WorkItemModalAdditionalPropertiesInner);
