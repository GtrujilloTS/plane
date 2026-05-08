/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { ICustomField } from "@plane/types";
import { cn } from "@plane/utils";

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  number: "Number",
  dropdown: "Dropdown",
  date: "Date",
  boolean: "Boolean",
};

const FIELD_TYPE_COLORS: Record<string, string> = {
  text: "bg-blue-100 text-blue-700",
  number: "bg-purple-100 text-purple-700",
  dropdown: "bg-orange-100 text-orange-700",
  date: "bg-green-100 text-green-700",
  boolean: "bg-pink-100 text-pink-700",
};

type Props = {
  field: ICustomField;
  canManage: boolean;
  onEdit: (field: ICustomField) => void;
  onDelete: (field: ICustomField) => void;
};

export function CustomFieldItem({ field, canManage, onEdit, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-custom-border-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-custom-text-100">{field.name}</span>
          <span
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium",
              FIELD_TYPE_COLORS[field.field_type] ?? "bg-custom-background-80 text-custom-text-300"
            )}
          >
            {FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}
          </span>
          {field.is_required && (
            <span className="text-xs text-red-500">Required</span>
          )}
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(field)}
              className="text-custom-text-300 hover:text-custom-text-100"
            >
              <Pencil className="size-4" />
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onDelete(field)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-custom-text-300 hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-custom-text-300 hover:text-red-500"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {field.field_type === "dropdown" && field.options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {field.options.map((opt: string) => (
            <span
              key={opt}
              className="rounded-full border border-custom-border-200 px-2 py-0.5 text-xs text-custom-text-300"
            >
              {opt}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
