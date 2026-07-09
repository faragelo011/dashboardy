"""Pydantic schemas aligned with dashboards.openapi.yaml (Feature 006)."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.query_engine.cache_ttl import presentation_class_ttl_seconds
from app.query_engine.enums import PresentationClass


class WidgetType(StrEnum):
    kpi = "kpi"
    bar = "bar"
    line = "line"
    table = "table"


class GlobalFilterValueType(StrEnum):
    string = "string"
    number = "number"
    boolean = "boolean"
    date = "date"


class GrantPermission(StrEnum):
    view = "view"
    edit = "edit"


class GlobalFilter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    value_type: GlobalFilterValueType
    default_value: str | int | float | bool


class DashboardDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    layout_version: int = Field(ge=1)
    global_filters: list[GlobalFilter] = Field(default_factory=list)


class WidgetLayout(BaseModel):
    model_config = ConfigDict(extra="forbid")

    x: int = Field(ge=0)
    y: int = Field(ge=0)
    w: int = Field(ge=1)
    h: int = Field(ge=1)


class ChartVizSortConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # "x" | "first_y" | "column"
    key: str | None = None
    column: str | None = None
    order: str | None = None


class ChartVizNullHandlingConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # "zero" | "skip"
    mode: str | None = None


class ChartVizLegendConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool | None = None


class ChartVizFormatXConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # "date" | "string"
    kind: str | None = None


class ChartVizFormatYConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    maximumFractionDigits: int | None = None


class ChartVizFormatConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    x: ChartVizFormatXConfig | None = None
    y: ChartVizFormatYConfig | None = None


class ChartPivotConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool | None = None
    pivotKey: str | None = None
    pivotValue: str | None = None


class ChartCalculatedExpressionAddSubMulDiv(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: str
    left: str
    right: str


class ChartCalculatedExpressionCoalesce(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: str
    args: list[str]


class ChartCalculatedExpressionConcat(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: str
    args: list[str]
    separator: str | None = None


ChartCalculatedExpression = (
    ChartCalculatedExpressionAddSubMulDiv
    | ChartCalculatedExpressionCoalesce
    | ChartCalculatedExpressionConcat
)


class ChartCalculatedField(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    label: str | None = None
    expression: ChartCalculatedExpression


class ChartVizConfig(BaseModel):
    """
    Validation/coercion for chart widget `config`.

    Note: `extra="allow"` for forward/backward compatibility (e.g. `ttl_seconds`).
    """

    model_config = ConfigDict(extra="allow")

    xKey: str | None = None
    yKeys: list[str] | None = None
    seriesKey: str | None = None

    sort: ChartVizSortConfig | None = None
    limit: int | None = Field(default=None, ge=0)
    nullHandling: ChartVizNullHandlingConfig | None = None
    legend: ChartVizLegendConfig | None = None
    format: ChartVizFormatConfig | None = None

    pivot: ChartPivotConfig | None = None
    calculatedFields: list[ChartCalculatedField] | None = None


def _coerce_chart_config(
    widget_type: WidgetType, raw: dict[str, Any]
) -> dict[str, Any]:
    if widget_type not in {WidgetType.bar, WidgetType.line}:
        return raw or {}
    chart = ChartVizConfig.model_validate(raw or {})
    # Keep extra/unknown keys so callers like `clamp_widget_ttl_seconds()` still work.
    return chart.model_dump(mode="json")


class DashboardWidget(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    title: str | None = None
    widget_type: WidgetType
    saved_question_id: UUID
    layout: WidgetLayout
    config: dict[str, Any] = Field(default_factory=dict)
    filter_bindings: dict[str, str] = Field(default_factory=dict)
    filter_overrides: dict[str, str | int | float | bool] = Field(default_factory=dict)
    has_active_overrides: bool = False
    can_export: bool = False

    @model_validator(mode="after")
    def _validate_chart_config(self) -> "DashboardWidget":
        self.config = _coerce_chart_config(self.widget_type, self.config)
        return self


class DashboardWidgetConsumer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    title: str | None = None
    widget_type: WidgetType
    layout: WidgetLayout
    config: dict[str, Any] = Field(default_factory=dict)
    filter_bindings: dict[str, str] = Field(default_factory=dict)
    filter_overrides: dict[str, str | int | float | bool] = Field(default_factory=dict)
    has_active_overrides: bool
    can_export: bool

    @model_validator(mode="after")
    def _validate_chart_config(self) -> "DashboardWidgetConsumer":
        self.config = _coerce_chart_config(self.widget_type, self.config)
        return self


class DashboardWidgetCreateInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = None
    widget_type: WidgetType
    saved_question_id: UUID
    layout: WidgetLayout
    config: dict[str, Any] = Field(default_factory=dict)
    filter_bindings: dict[str, str] = Field(default_factory=dict)
    filter_overrides: dict[str, str | int | float | bool] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _validate_chart_config(self) -> "DashboardWidgetCreateInput":
        self.config = _coerce_chart_config(self.widget_type, self.config)
        return self


class DashboardWidgetUpdateInput(DashboardWidgetCreateInput):
    id: UUID


class DashboardSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    collection_id: UUID
    title: str
    updated_at: datetime


class DashboardEditorDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    detail_level: Literal["editor"] = "editor"
    id: UUID
    collection_id: UUID
    title: str
    definition: DashboardDefinition
    widgets: list[DashboardWidget]
    updated_at: datetime
    can_edit: bool


class DashboardConsumerDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    detail_level: Literal["consumer"] = "consumer"
    id: UUID
    collection_id: UUID
    title: str
    definition: DashboardDefinition
    widgets: list[DashboardWidgetConsumer]
    updated_at: datetime
    can_edit: bool


DashboardDetail = DashboardEditorDetail | DashboardConsumerDetail


class DashboardListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dashboards: list[DashboardSummary]


class DashboardCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    collection_id: UUID
    title: str = Field(min_length=1)
    definition: DashboardDefinition | None = None
    widgets: list[DashboardWidgetCreateInput] | None = None


class DashboardUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    updated_at: datetime
    collection_id: UUID | None = None
    title: str | None = Field(default=None, min_length=1)
    definition: DashboardDefinition | None = None
    widgets: list[DashboardWidgetUpdateInput] | None = None


class DashboardCloneRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_collection_id: UUID
    title: str | None = None


class WidgetExecuteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    global_filter_values: dict[str, str | int | float | bool] = Field(
        default_factory=dict,
    )
    bypass_cache: bool = False


class FilterStateExport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    global_filter_values: dict[str, str | int | float | bool] = Field(
        default_factory=dict,
    )


class ColumnDescriptor(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    type: str | None = None


class WidgetExecuteMeta(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    duration_ms: int = Field(ge=0)
    row_count: int = Field(ge=0)
    truncated: bool
    cache_hit: bool
    error_code: str | None = None


class WidgetExecuteResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    columns: list[ColumnDescriptor]
    rows: list[list[Any]]
    meta: WidgetExecuteMeta


class NormalizedDashboardErrorCode(StrEnum):
    duplicate_dashboard_title = "duplicate_dashboard_title"
    dashboard_not_found = "dashboard_not_found"
    widget_not_found = "widget_not_found"
    stale_update = "stale_update"
    invalid_filter_bindings = "invalid_filter_bindings"
    widget_local_filter_forbidden = "widget_local_filter_forbidden"
    invalid_parameters = "invalid_parameters"
    export_not_permitted = "export_not_permitted"
    collection_not_empty = "collection_not_empty"
    unsupported_widget_type = "unsupported_widget_type"


class NormalizedDashboardError(BaseModel):
    model_config = ConfigDict(extra="forbid")

    error_code: NormalizedDashboardErrorCode | str
    message: str


def widget_type_to_presentation_class(widget_type: str) -> PresentationClass:
    if widget_type == WidgetType.kpi.value:
        return PresentationClass.kpi
    if widget_type in {WidgetType.bar.value, WidgetType.line.value}:
        return PresentationClass.chart
    if widget_type == WidgetType.table.value:
        return PresentationClass.table
    raise ValueError(f"Unsupported widget type: {widget_type}")


def clamp_widget_ttl_seconds(
    widget_config: dict[str, Any],
    presentation_class: PresentationClass,
) -> int:
    """Clamp per-widget TTL down to the presentation-class ceiling only."""

    ceiling = presentation_class_ttl_seconds(presentation_class)
    raw = widget_config.get("ttl_seconds")
    if raw is None:
        return ceiling
    if isinstance(raw, bool):
        return ceiling
    try:
        requested = int(raw)
    except (TypeError, ValueError):
        return ceiling
    if requested < 0:
        return ceiling
    return min(requested, ceiling)
