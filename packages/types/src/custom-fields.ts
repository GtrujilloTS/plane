/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export type TCustomFieldType = "text" | "number" | "dropdown" | "date" | "boolean";

export interface ICustomField {
  id: string;
  name: string;
  field_type: TCustomFieldType;
  is_required: boolean;
  options: string[];
  default_value: unknown;
  display_order: number;
  issue_type_id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

export type ICustomFieldFormData = {
  name: string;
  field_type: TCustomFieldType;
  is_required?: boolean;
  options?: string[];
  default_value?: unknown;
};

export interface ICustomFieldValue {
  id: string;
  issue_id: string;
  custom_field: string;
  custom_field_id: string;
  value_text?: string | null;
  value_number?: number | null;
  value_date?: string | null;
  value_bool?: boolean | null;
  value_option?: string | null;
  value?: unknown;
}

export type ICustomFieldValuePayload = {
  custom_field: string;
  value_text?: string | null;
  value_number?: number | null;
  value_date?: string | null;
  value_bool?: boolean | null;
  value_option?: string | null;
};
