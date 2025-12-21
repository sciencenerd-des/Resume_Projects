"""Shared Pydantic models for SDK tools.

This module contains common data models used across multiple tool modules
to ensure consistency and avoid duplication.
"""

from typing import List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class LeadDict(BaseModel):
    """Model for a lead dictionary with flexible fields.

    Represents a lead with core fields (email, name, company, title).
    Additional fields beyond the core set are stored in the extra_fields dict.
    """
    model_config = ConfigDict(extra="forbid")  # Strict schema for SDK compatibility

    email: str = Field(..., description="Email address")
    name: str | None = Field(default=None, description="Lead name")
    company: str | None = Field(default=None, description="Company name")
    title: str | None = Field(default=None, description="Job title")
    tags: List[str] | None = Field(default=None, description="Lead tags")
    score: int | None = Field(default=None, description="Lead score")
    score_category: str | None = Field(default=None, description="Score category (hot/warm/cold)")
    score_breakdown: List[str] | None = Field(default=None, description="Score breakdown")


class EmailMetadata(BaseModel):
    """Metadata from advanced email validation.

    Contains detailed information about validation checks performed,
    including MX records, disposable email detection, and role-based flagging.
    """
    model_config = ConfigDict(extra="forbid")  # Strict schema for SDK compatibility

    has_mx: bool | None = Field(default=None, description="Whether domain has MX records")
    is_disposable: bool | None = Field(default=None, description="Whether from disposable provider")
    is_role_based: bool | None = Field(default=None, description="Whether role-based email")
    checks_performed: List[str] | None = Field(default=None, description="List of checks performed")
    mx_records: List[str] | None = Field(default=None, description="List of MX records")
    warnings: List[str] | None = Field(default=None, description="Validation warnings")
