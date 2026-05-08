/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// plane package imports
import { useTranslation } from "@plane/i18n";
import { ChartXAxisProperty, ChartYAxisMetric } from "@plane/types";
// plane web components
import AnalyticsSectionWrapper from "../analytics-section-wrapper";
import PriorityChart from "./priority-chart";

const IssuesByMember = observer(function IssuesByMember() {
  const { t } = useTranslation();

  return (
    <AnalyticsSectionWrapper
      title={t("workspace_analytics.issues_by_member") || "Issues por miembro del equipo"}
      className="col-span-1"
    >
      <PriorityChart
        x_axis={ChartXAxisProperty.ASSIGNEES}
        y_axis={ChartYAxisMetric.WORK_ITEM_COUNT}
      />
    </AnalyticsSectionWrapper>
  );
});

export default IssuesByMember;
