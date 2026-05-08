/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
// plane package imports
import { CHART_COLOR_PALETTES } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { EmptyStateCompact } from "@plane/propel/empty-state";
import { ChartXAxisProperty, ChartYAxisMetric } from "@plane/types";
import type { TChart } from "@plane/types";
// helpers
import { parseChartData } from "@/components/chart/utils";
// hooks
import { useAnalytics } from "@/hooks/store/use-analytics";
// services
import { AnalyticsService } from "@/services/analytics.service";
// plane web components
import AnalyticsSectionWrapper from "../analytics-section-wrapper";
import { ChartLoader } from "../loaders";
import { generateBarColor } from "./utils";

const analyticsService = new AnalyticsService();

const PRIORITY_ORDER = ["urgent", "high", "medium", "low", "none"];

const ResolutionByPriority = observer(function ResolutionByPriority() {
  const { selectedDuration, selectedProjects, selectedCycle, selectedModule, isPeekView, isEpic } = useAnalytics();
  const params = useParams();
  const { t } = useTranslation();
  const workspaceSlug = params.workspaceSlug.toString();

  const { data: chartData, isLoading } = useSWR(
    `resolution-by-priority-${workspaceSlug}-${selectedDuration}-${selectedProjects}-${selectedCycle}-${selectedModule}-${isPeekView}-${isEpic}`,
    () =>
      analyticsService.getAdvanceAnalyticsCharts<TChart>(
        workspaceSlug,
        "custom-work-items",
        {
          ...(selectedProjects?.length > 0 && { project_ids: selectedProjects?.join(",") }),
          ...(selectedCycle ? { cycle_id: selectedCycle } : {}),
          ...(selectedModule ? { module_id: selectedModule } : {}),
          ...(isEpic ? { epic: true } : {}),
          x_axis: ChartXAxisProperty.PRIORITY,
          y_axis: ChartYAxisMetric.COMPLETED_WORK_ITEM_COUNT,
        },
        isPeekView
      )
  );

  const parsedData = useMemo(
    () => chartData && parseChartData(chartData, ChartXAxisProperty.PRIORITY, undefined, undefined),
    [chartData]
  );

  const sortedData = useMemo(() => {
    if (!parsedData?.data) return [];
    return [...parsedData.data].sort(
      (a, b) => PRIORITY_ORDER.indexOf(a.key as string) - PRIORITY_ORDER.indexOf(b.key as string)
    );
  }, [parsedData]);

  const baseColors = CHART_COLOR_PALETTES[0]?.light ?? [];

  const priorityLabel = (value: string) => {
    const labels: Record<string, string> = {
      urgent: t("priority.urgent") || "Urgente",
      high: t("priority.high") || "Alta",
      medium: t("priority.medium") || "Media",
      low: t("priority.low") || "Baja",
      none: t("priority.none") || "Sin prioridad",
    };
    return labels[value] ?? value;
  };

  return (
    <AnalyticsSectionWrapper
      title={t("workspace_analytics.completed_by_priority") || "Completados por prioridad"}
      className="col-span-1"
    >
      {isLoading ? (
        <ChartLoader />
      ) : sortedData.length > 0 ? (
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={sortedData}
              margin={{ top: 5, right: 30, bottom: 30, left: 80 }}
              barSize={28}
            >
              <CartesianGrid stroke="var(--border-color-subtle)" horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "var(--text-color-tertiary)" }}
                label={{
                  value: t("common.no_of", { entity: isEpic ? t("epics") : t("work_items") }),
                  position: "insideBottom",
                  offset: -20,
                  className: "uppercase text-tertiary/60 text-13 tracking-wide",
                  style: { fontSize: 11, fill: "var(--text-color-tertiary)" },
                }}
              />
              <YAxis
                type="category"
                dataKey="key"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 13, fill: "var(--text-color-primary)" }}
                tickFormatter={priorityLabel}
                width={72}
              />
              <Tooltip
                cursor={{ fill: "var(--alpha-black-300)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0];
                  if (!item) return null;
                  return (
                    <div className="rounded-md border border-custom-border-200 bg-custom-background-100 px-3 py-2 text-xs shadow-md">
                      <p className="font-medium text-custom-text-100">{priorityLabel(item.payload?.key)}</p>
                      <p className="text-custom-text-300">
                        {t("common.no_of", { entity: isEpic ? t("epics") : t("work_items") })}:{" "}
                        <span className="font-semibold text-custom-text-100">{item.value}</span>
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {sortedData.map((entry) => (
                  <Cell
                    key={entry.key as string}
                    fill={generateBarColor(
                      entry.key as string,
                      {
                        x_axis: ChartXAxisProperty.PRIORITY,
                        y_axis: ChartYAxisMetric.COMPLETED_WORK_ITEM_COUNT,
                      },
                      baseColors
                    )}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyStateCompact
          assetKey="unknown"
          assetClassName="size-20"
          rootClassName="border border-subtle px-5 py-10 md:py-20 md:px-20"
          title={t("workspace_empty_state.analytics_work_items.title")}
        />
      )}
    </AnalyticsSectionWrapper>
  );
});

export default ResolutionByPriority;
