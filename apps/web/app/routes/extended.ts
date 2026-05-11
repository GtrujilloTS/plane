/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { layout, route } from "@react-router/dev/routes";
import type { RouteConfigEntry } from "@react-router/dev/routes";

// >>>>>> CUSTOM: shared issue public routes [GTS-004]
export const extendedRoutes: RouteConfigEntry[] = [
  layout("./(public)/shared/issue/[token]/layout.tsx", [
    route("shared/issue/:token", "./(public)/shared/issue/[token]/page.tsx"),
  ]),
];
// <<<<<< END CUSTOM
