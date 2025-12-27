#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HCB框架核心模块
"""

# DAG任务调度
from .dag_scheduler.task_decomposer import (
    TaskNode,
    TaskDAG,
    TaskDecomposer,
    TaskState,
    TaskPriority,
)

# 分层上下文管理
from .context_manager.hierarchical_context import (
    ContextLevel,
    ContextScope,
    ContextRecord,
    HierarchicalContextManager,
)

# 混合记忆引擎
from .hybrid_memory.hme_engine import (
    HybridMemoryEngine,
    MemoryRecord,
    MemoryType,
)

# 全局桥接调度
from .bridge_scheduler.global_bridge import (
    GlobalBridgeScheduler,
    StateFlagManager,
    InstantTriggerCoordinator,
    NodeState,
)

# 强化学习优化
from .reinforcement_learning.rl_optimizer import (
    RLOptimizer,
    LinUCBBandit,
    QValueUpdater,
    ExplorationStrategy,
)

# 结果合并验证
from .result_merger.merger import (
    ResultMerger,
    MergeStrategy,
    ValidationEngine,
    IdempotentMerger,
    RollbackManager,
    ExecutionResult,
    MergeResult,
)

__all__ = [
    # DAG
    "TaskNode", "TaskDAG", "TaskDecomposer", "TaskState", "TaskPriority",

    # 上下文
    "ContextLevel", "ContextScope", "ContextRecord", "HierarchicalContextManager",

    # 记忆
    "HybridMemoryEngine", "MemoryRecord", "MemoryType",

    # 桥接
    "GlobalBridgeScheduler", "StateFlagManager", "InstantTriggerCoordinator", "NodeState",

    # RL
    "RLOptimizer", "LinUCBBandit", "QValueUpdater", "ExplorationStrategy",

    # 合并
    "ResultMerger", "MergeStrategy", "ValidationEngine",
    "IdempotentMerger", "RollbackManager", "ExecutionResult", "MergeResult",
]
