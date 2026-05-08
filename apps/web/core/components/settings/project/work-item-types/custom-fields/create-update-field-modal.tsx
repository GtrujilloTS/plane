/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ICustomField, ICustomFieldFormData, TCustomFieldType } from "@plane/types";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { Button, EModalWidth, Input, ModalCore, ToggleSwitch } from "@plane/ui";

const FIELD_TYPES: { value: TCustomFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "dropdown", label: "Dropdown" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Boolean" },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ICustomFieldFormData) => Promise<void>;
  field?: ICustomField | null;
};

export function CreateUpdateCustomFieldModal({ isOpen, onClose, onSubmit, field }: Props) {
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<TCustomFieldType>("text");
  const [isRequired, setIsRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (field) {
      setName(field.name);
      setFieldType(field.field_type);
      setIsRequired(field.is_required);
      setOptions(field.options ?? []);
    } else {
      setName("");
      setFieldType("text");
      setIsRequired(false);
      setOptions([]);
    }
    setNewOption("");
  }, [field, isOpen]);

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed || options.includes(trimmed)) return;
    setOptions((prev) => [...prev, trimmed]);
    setNewOption("");
  };

  const handleRemoveOption = (opt: string) => {
    setOptions((prev) => prev.filter((o) => o !== opt));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setToast({ type: TOAST_TYPE.ERROR, title: "Field name is required" });
      return;
    }
    if (fieldType === "dropdown" && options.length === 0) {
      setToast({ type: TOAST_TYPE.ERROR, title: "Dropdown fields require at least one option" });
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), field_type: fieldType, is_required: isRequired, options });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={onClose} width={EModalWidth.MD}>
      <div className="p-6">
        <h3 className="mb-5 text-base font-semibold text-custom-text-100">
          {field ? "Edit Custom Field" : "Add Custom Field"}
        </h3>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-custom-text-300">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Story Points"
              className="w-full"
            />
          </div>

          {/* Field Type */}
          <div>
            <label className="mb-1 block text-xs font-medium text-custom-text-300">Field Type</label>
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as TCustomFieldType)}
              className="w-full rounded-md border border-custom-border-200 bg-custom-background-100 px-3 py-2 text-sm text-custom-text-100 outline-none"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown options */}
          {fieldType === "dropdown" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-custom-text-300">
                Options <span className="text-red-500">*</span>
              </label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {options.map((opt) => (
                  <span
                    key={opt}
                    className="flex items-center gap-1 rounded-full border border-custom-border-200 px-2 py-0.5 text-xs text-custom-text-300"
                  >
                    {opt}
                    <button onClick={() => handleRemoveOption(opt)} className="hover:text-red-500">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddOption(); } }}
                  placeholder="Add option..."
                  className="flex-1"
                />
                <Button size="sm" variant="neutral-primary" onClick={handleAddOption}>
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Required */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-custom-text-200">Required field</span>
            <ToggleSwitch value={isRequired} onChange={setIsRequired} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="neutral-primary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={isSubmitting}>
            {field ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </ModalCore>
  );
}
