#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HierarchicalContextBridge (HCB) 框架
基于分层上下文与全局桥接调度的智能体协作系统

专利技术实现框架

核心模块:
- dag_scheduler: DAG任务分解与调度
- context_manager: 分层上下文隔离管理
- hybrid_memory: 混合记忆引擎(HME)
- bridge_scheduler: 全局桥接调度器
- reinforcement_learning: 强化学习优化
- result_merger: 结果合并与验证
"""

__version__ = "1.0.0"
__author__ = "HCB Framework Team"
__license__ = "Apache-2.0"

from .core import (
    # DAG调度
    TaskNode,
    TaskDAG,
    TaskDecomposer,

    # 上下文管理
    ContextLevel,
    ContextScope,
    HierarchicalContextManager,

    # 混合记忆
    HybridMemoryEngine,

    # 桥接调度
    GlobalBridgeScheduler,

    # 强化学习
    RLOptimizer,
    LinUCBBandit,

    # 结果合并
    ResultMerger,
    MergeStrategy,
)

__all__ = [
    # 版本信息
    "__version__",
    "__author__",

    # DAG调度
    "TaskNode",
    "TaskDAG",
    "TaskDecomposer",

    # 上下文管理
    "ContextLevel",
    "ContextScope",
    "HierarchicalContextManager",

    # 混合记忆
    "HybridMemoryEngine",

    # 桥接调度
    "GlobalBridgeScheduler",

    # 强化学习
    "RLOptimizer",
    "LinUCBBandit",

    # 结果合并
    "ResultMerger",
    "MergeStrategy",
]
