#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HCB框架基础使用示例
演示如何使用核心组件构建多智能体协作系统
"""

import sys
from pathlib import Path

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime
from core.dag_scheduler.task_decomposer import TaskDecomposer, TaskState
from core.context_manager.hierarchical_context import (
    HierarchicalContextManager,
    ContextLevel,
    ContextScope
)
from core.hybrid_memory.hme_engine import HybridMemoryEngine, MemoryType
from core.bridge_scheduler.global_bridge import GlobalBridgeScheduler, NodeState
from core.reinforcement_learning.rl_optimizer import RLOptimizer
from core.result_merger.merger import ResultMerger, MergeStrategy, ExecutionResult


def main():
    print("=" * 60)
    print("HierarchicalContextBridge 框架演示")
    print("=" * 60)

    # ========================================
    # 1. 初始化核心组件
    # ========================================
    print("\n[1] 初始化核心组件...")

    context_manager = HierarchicalContextManager()
    memory_engine = HybridMemoryEngine()
    scheduler = GlobalBridgeScheduler(context_manager, memory_engine)
    decomposer = TaskDecomposer()
    optimizer = RLOptimizer()
    merger = ResultMerger()

    print("    ✅ 上下文管理器初始化完成")
    print("    ✅ 混合记忆引擎初始化完成")
    print("    ✅ 全局桥接调度器初始化完成")

    # ========================================
    # 2. 任务分解
    # ========================================
    print("\n[2] 任务分解为DAG...")

    dag = decomposer.decompose(
        task_description="开发AI推荐系统",
        subtasks=[
            {
                "id": "data_analysis",
                "role": "data_analyst",
                "description": "分析用户行为数据",
                "priority": "high"
            },
            {
                "id": "model_training",
                "role": "ml_engineer",
                "description": "训练推荐模型",
                "dependencies": ["data_analysis"],
                "priority": "high"
            },
            {
                "id": "api_development",
                "role": "backend_developer",
                "description": "开发推荐API",
                "dependencies": ["model_training"],
                "priority": "medium"
            },
            {
                "id": "testing",
                "role": "qa_engineer",
                "description": "端到端测试",
                "dependencies": ["api_development"],
                "priority": "medium"
            }
        ]
    )

    print(f"    任务ID: {dag.dag_id}")
    print(f"    节点数: {len(dag.nodes)}")
    print(f"    执行顺序: {[n.id for n in dag.topological_sort()]}")

    # ========================================
    # 3. 创建分层上下文
    # ========================================
    print("\n[3] 创建分层上下文（隔离）...")

    # L1 系统级上下文
    sys_ctx = context_manager.create_context(
        level=ContextLevel.L1_SYSTEM,
        content="你是CMAF多智能体协作系统的一部分，请专注于你的专业领域。",
        scope=ContextScope.PUBLIC
    )
    print(f"    L1 系统上下文: {sys_ctx.id}")

    # L2 项目级上下文
    proj_ctx = context_manager.create_context(
        level=ContextLevel.L2_PROJECT,
        content="当前项目: AI推荐系统开发。目标用户: 电商平台。",
        project_id="proj_recommender",
        scope=ContextScope.SHARED
    )
    print(f"    L2 项目上下文: {proj_ctx.id}")

    # L3 节点级上下文（隔离）
    node_prompts = {
        "data_analysis": "你是数据分析师，专精于用户行为分析和特征工程。",
        "model_training": "你是机器学习工程师，专精于推荐算法和模型优化。",
        "api_development": "你是后端开发者，专精于高性能API开发。",
        "testing": "你是QA工程师，专精于自动化测试和质量保证。"
    }

    for node_id, prompt in node_prompts.items():
        ctx = context_manager.create_context(
            level=ContextLevel.L3_NODE,
            content=prompt,
            node_id=node_id,
            project_id="proj_recommender",
            isolated=True  # 关键：确保提示词隔离
        )
        print(f"    L3 节点上下文 [{node_id}]: {ctx.id} (隔离)")

    # ========================================
    # 4. 验证上下文隔离
    # ========================================
    print("\n[4] 验证上下文隔离...")

    # 数据分析师可见的上下文
    analyst_visible = context_manager.get_visible_context(
        node_id="data_analysis",
        project_id="proj_recommender"
    )

    # ML工程师可见的上下文
    ml_visible = context_manager.get_visible_context(
        node_id="model_training",
        project_id="proj_recommender"
    )

    print(f"    数据分析师可见L3上下文数: {len(analyst_visible[ContextLevel.L3_NODE])}")
    print(f"    ML工程师可见L3上下文数: {len(ml_visible[ContextLevel.L3_NODE])}")
    print("    ✅ 验证: 每个节点只能看到自己的L3提示词")

    # ========================================
    # 5. 模拟任务执行
    # ========================================
    print("\n[5] 模拟任务执行...")

    execution_results = []

    for node in dag.topological_sort():
        # 更新节点状态
        node.state = TaskState.EXECUTING
        print(f"    执行: {node.id} ({node.role})")

        # 使用RL选择动作
        action = optimizer.select_action(
            state=node.id,
            context_features=[0.8, 0.6, 0.9]  # 模拟上下文特征
        )

        # 模拟执行结果
        result = ExecutionResult(
            node_id=node.id,
            role=node.role,
            content={
                "status": "success",
                "output": f"{node.description}完成",
                "metrics": {"quality": 0.9, "time": 120}
            },
            timestamp=datetime.now().isoformat()
        )
        execution_results.append(result)

        # 更新RL
        optimizer.update(
            state=node.id,
            action=action,
            reward=0.85,
            next_state=None
        )

        # 标记完成
        node.state = TaskState.COMPLETED

    print("    ✅ 所有任务执行完成")

    # ========================================
    # 6. 结果合并验证
    # ========================================
    print("\n[6] 结果合并与验证...")

    merged_result = merger.merge(
        execution_results,
        strategy=MergeStrategy.MERGE,
        expected_nodes=["data_analysis", "model_training", "api_development", "testing"],
        business_rules={
            "required_fields": ["status", "output"],
            "valid_statuses": ["success"]
        }
    )

    print(f"    合并成功: {merged_result.success}")
    print(f"    验证结果:")
    for name, result in merged_result.validations.items():
        print(f"      - {name}: {result.value}")

    if merged_result.warnings:
        print(f"    警告: {merged_result.warnings}")

    print(f"    处理时间: {merged_result.processing_time:.2f}ms")

    # ========================================
    # 7. 统计信息
    # ========================================
    print("\n[7] 系统统计信息...")

    ctx_stats = context_manager.get_statistics()
    mem_stats = memory_engine.get_statistics()
    rl_stats = optimizer.get_statistics()
    merge_stats = merger.get_statistics()

    print(f"    上下文管理器: {ctx_stats}")
    print(f"    记忆引擎: {mem_stats}")
    print(f"    RL优化器: {rl_stats}")
    print(f"    结果合并器: {merge_stats}")

    print("\n" + "=" * 60)
    print("演示完成!")
    print("=" * 60)


if __name__ == "__main__":
    main()
