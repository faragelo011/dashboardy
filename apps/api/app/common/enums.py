"""Shared enum types used by ORM models and Pydantic schemas."""

from __future__ import annotations

from enum import StrEnum


class MembershipRole(StrEnum):
    admin = "admin"
    analyst = "analyst"
    viewer = "viewer"
    external_client = "external_client"


class MembershipStatus(StrEnum):
    active = "active"
    inactive = "inactive"
