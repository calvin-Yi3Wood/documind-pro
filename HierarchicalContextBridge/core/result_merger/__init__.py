#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""结果合并验证模块"""

from .merger import (
    ResultMerger,
    MergeStrategy,
    ValidationEngine,
    ValidationResult,
    IdempotentMerger,
    RollbackManager,
    ExecutionResult,
    MergeResult,
    merge_results,
)

__all__ = [
    "ResultMerger",
    "MergeStrategy",
    "ValidationEngine",
    "ValidationResult",
    "IdempotentMerger",
    "RollbackManager",
    "ExecutionResult",
    "MergeResult",
    "merge_results",
]
