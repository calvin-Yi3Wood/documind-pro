#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HCB框架 - 智能任务分解器
Hierarchical Context Bridge - Intelligent Task Decomposer

基于Sequential Thinking的深度任务分析和分解：
- 复杂度评估
- 并行潜力分析
- DAG依赖图生成
- 角色分配优化

专利技术：基于分层上下文与全局桥接调度的智能体协作系统
"""

import json
import re
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum


class TaskComplexity(Enum):
    """任务复杂度等级"""
    TRIVIAL = "trivial"      # 0-2分，单步操作
    SIMPLE = "simple"        # 3-4分，简单多步
    MODERATE = "moderate"    # 5-6分，中等复杂
    COMPLEX = "complex"      # 7-8分，高度复杂
    EXPERT = "expert"        # 9-10分，专家级任务


class TaskType(Enum):
    """任务类型"""
    ANALYSIS = "analysis"              # 分析类
    DEVELOPMENT = "development"        # 开发类
    DESIGN = "design"                  # 设计类
    DOCUMENTATION = "documentation"    # 文档类
    TESTING = "testing"                # 测试类
    RESEARCH = "research"              # 研究类
    INTEGRATION = "integration"        # 集成类
    OPTIMIZATION = "optimization"      # 优化类


class TaskState(Enum):
    """任务状态标志 - 零延迟协作协议核心"""
    PENDING = "pending"        # 待处理
    READY = "ready"            # 就绪（前置依赖完成）
    RUNNING = "running"        # 执行中
    COMPLETED = "completed"    # 已完成
    FAILED = "failed"          # 失败
    BLOCKED = "blocked"        # 阻塞


@dataclass
class TaskNode:
    """任务节点 - DAG中的单个节点"""
    id: str
    title: str
    description: str
    task_type: TaskType
    complexity: TaskComplexity
    estimated_time_minutes: int
    required_role: str
    dependencies: List[str]
    parallel_group: Optional[str]
    priority: int
    skills_required: List[str]
    context_requirements: Dict[str, Any]
    deliverables: List[str]
    state: TaskState = TaskState.PENDING

    # 多级上下文绑定
    context_level: str = "L3"  # L1=系统级, L2=项目级, L3=节点级, L4=会话级
    context_data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['task_type'] = self.task_type.value
        result['complexity'] = self.complexity.value
        result['state'] = self.state.value
        return result


@dataclass
class TaskDAG:
    """任务依赖图 - 有向无环图结构"""
    session_id: str
    total_nodes: int
    parallel_groups: Dict[str, List[str]]
    critical_path: List[str]
    estimated_total_time: int
    parallelizable_ratio: float
    nodes: Dict[str, TaskNode]
    execution_plan: List[Dict[str, Any]]

    # 上下文层级配置
    context_hierarchy: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    def get_ready_tasks(self) -> List[TaskNode]:
        """获取所有就绪状态的任务"""
        ready_tasks = []
        for node in self.nodes.values():
            if node.state == TaskState.PENDING:
                # 检查所有依赖是否完成
                deps_completed = all(
                    self._find_node_by_title(dep).state == TaskState.COMPLETED
                    for dep in node.dependencies
                    if self._find_node_by_title(dep)
                )
                if deps_completed:
                    ready_tasks.append(node)
        return ready_tasks

    def _find_node_by_title(self, title: str) -> Optional[TaskNode]:
        """通过标题查找节点"""
        for node in self.nodes.values():
            if title in node.title:
                return node
        return None

    def update_task_state(self, task_id: str, new_state: TaskState):
        """更新任务状态并触发下游任务就绪检查"""
        if task_id in self.nodes:
            self.nodes[task_id].state = new_state

            # 如果任务完成，检查下游任务是否可以就绪
            if new_state == TaskState.COMPLETED:
                self._trigger_downstream_ready_check(task_id)

    def _trigger_downstream_ready_check(self, completed_task_id: str):
        """零延迟触发：检查下游任务是否可以就绪"""
        completed_node = self.nodes[completed_task_id]

        for node in self.nodes.values():
            if node.state == TaskState.PENDING:
                # 检查是否依赖已完成的任务
                if any(completed_node.title in dep for dep in node.dependencies):
                    # 检查所有依赖是否都完成
                    all_deps_done = all(
                        self._find_node_by_title(dep) and
                        self._find_node_by_title(dep).state == TaskState.COMPLETED
                        for dep in node.dependencies
                    )
                    if all_deps_done:
                        node.state = TaskState.READY

    def to_dict(self) -> Dict[str, Any]:
        return {
            'session_id': self.session_id,
            'total_nodes': self.total_nodes,
            'parallel_groups': self.parallel_groups,
            'critical_path': self.critical_path,
            'estimated_total_time': self.estimated_total_time,
            'parallelizable_ratio': self.parallelizable_ratio,
            'nodes': {k: v.to_dict() for k, v in self.nodes.items()},
            'execution_plan': self.execution_plan,
            'context_hierarchy': self.context_hierarchy
        }


class TaskDecomposer:
    """智能任务分解器 - 将目标任务分解为DAG"""

    def __init__(self):
        self.role_capabilities = {
            "architect": {
                "skills": ["system_design", "architecture", "planning", "analysis"],
                "complexity_limit": TaskComplexity.EXPERT,
                "task_types": [TaskType.ANALYSIS, TaskType.DESIGN, TaskType.RESEARCH]
            },
            "analyst": {
                "skills": ["data_analysis", "statistics", "ml", "visualization"],
                "complexity_limit": TaskComplexity.EXPERT,
                "task_types": [TaskType.ANALYSIS, TaskType.RESEARCH, TaskType.OPTIMIZATION]
            },
            "developer": {
                "skills": ["coding", "api_development", "backend", "frontend"],
                "complexity_limit": TaskComplexity.COMPLEX,
                "task_types": [TaskType.DEVELOPMENT, TaskType.INTEGRATION, TaskType.TESTING]
            },
            "quality": {
                "skills": ["testing", "quality_assurance", "code_review"],
                "complexity_limit": TaskComplexity.COMPLEX,
                "task_types": [TaskType.TESTING, TaskType.ANALYSIS]
            },
            "designer": {
                "skills": ["ui_design", "ux_design", "prototyping"],
                "complexity_limit": TaskComplexity.MODERATE,
                "task_types": [TaskType.DESIGN, TaskType.DEVELOPMENT]
            },
            "docs": {
                "skills": ["documentation", "technical_writing", "tutorials"],
                "complexity_limit": TaskComplexity.MODERATE,
                "task_types": [TaskType.DOCUMENTATION, TaskType.ANALYSIS]
            }
        }

    def analyze_task_complexity(self, task_description: str) -> Dict[str, Any]:
        """深度分析任务复杂度"""

        complexity_indicators = {
            # 高复杂度指标
            "system": 2, "architecture": 2, "framework": 2, "platform": 2,
            "enterprise": 2, "scalable": 2, "distributed": 2, "microservice": 2,
            "machine learning": 3, "ai": 2, "deep learning": 3, "neural": 2,
            "optimization": 2, "algorithm": 2, "performance": 1, "security": 2,
            # 中复杂度指标
            "api": 1, "database": 1, "frontend": 1, "backend": 1,
            "integration": 1, "testing": 1, "deployment": 1,
            # 简单任务指标
            "simple": -1, "basic": -1, "quick": -1, "small": -1,
            "fix": -1, "update": -1, "modify": -1
        }

        task_lower = task_description.lower()
        complexity_score = 0

        for keyword, weight in complexity_indicators.items():
            if keyword in task_lower:
                complexity_score += weight

        # 基于文本长度调整
        length_factor = min(len(task_description) / 200, 2)
        complexity_score += length_factor

        # 确定复杂度等级
        if complexity_score <= 2:
            complexity = TaskComplexity.TRIVIAL
            estimated_time = 15
        elif complexity_score <= 4:
            complexity = TaskComplexity.SIMPLE
            estimated_time = 30
        elif complexity_score <= 6:
            complexity = TaskComplexity.MODERATE
            estimated_time = 60
        elif complexity_score <= 8:
            complexity = TaskComplexity.COMPLEX
            estimated_time = 120
        else:
            complexity = TaskComplexity.EXPERT
            estimated_time = 180

        return {
            "complexity": complexity,
            "score": complexity_score,
            "estimated_time_minutes": estimated_time,
            "indicators": [k for k, v in complexity_indicators.items() if k in task_lower]
        }

    def identify_task_type_and_roles(self, task_description: str) -> Tuple[TaskType, List[str]]:
        """识别任务类型和所需角色"""

        task_lower = task_description.lower()

        type_indicators = {
            TaskType.ANALYSIS: ["analyze", "analysis", "research", "investigate", "evaluate"],
            TaskType.DEVELOPMENT: ["develop", "code", "build", "implement", "create", "program"],
            TaskType.DESIGN: ["design", "prototype", "wireframe", "mockup", "ui", "ux"],
            TaskType.DOCUMENTATION: ["document", "docs", "manual", "guide", "tutorial"],
            TaskType.TESTING: ["test", "testing", "validate", "verify", "check", "qa"],
            TaskType.RESEARCH: ["research", "survey", "compare", "benchmark", "explore"],
            TaskType.INTEGRATION: ["integrate", "connect", "combine", "merge", "link"],
            TaskType.OPTIMIZATION: ["optimize", "improve", "enhance", "performance", "speed"]
        }

        role_indicators = {
            "architect": ["system", "architecture", "design", "plan", "strategy"],
            "analyst": ["data", "analysis", "statistics", "ml", "model", "algorithm"],
            "developer": ["code", "api", "backend", "frontend", "database", "server"],
            "quality": ["test", "qa", "quality", "validation", "verification"],
            "designer": ["ui", "ux", "design", "interface", "user", "experience"],
            "docs": ["document", "docs", "manual", "guide", "tutorial"]
        }

        # 确定任务类型
        task_type = TaskType.DEVELOPMENT
        max_score = 0

        for ttype, indicators in type_indicators.items():
            score = sum(1 for indicator in indicators if indicator in task_lower)
            if score > max_score:
                max_score = score
                task_type = ttype

        # 确定所需角色
        role_scores = {}
        for role, indicators in role_indicators.items():
            score = sum(1 for indicator in indicators if indicator in task_lower)
            if score > 0:
                role_scores[role] = score

        sorted_roles = sorted(role_scores.items(), key=lambda x: x[1], reverse=True)
        required_roles = [role for role, score in sorted_roles[:3]] or ["developer"]

        return task_type, required_roles

    def generate_subtasks(self, task_description: str, complexity: TaskComplexity) -> List[Dict[str, Any]]:
        """基于复杂度生成子任务"""

        task_type, required_roles = self.identify_task_type_and_roles(task_description)

        if complexity == TaskComplexity.TRIVIAL:
            return [{
                "title": task_description,
                "description": task_description,
                "role": required_roles[0],
                "estimated_time": 15,
                "dependencies": [],
                "parallel_group": None
            }]

        elif complexity == TaskComplexity.SIMPLE:
            return [
                {
                    "title": f"设计方案",
                    "description": "分析需求并设计实现方案",
                    "role": "architect",
                    "estimated_time": 10,
                    "dependencies": [],
                    "parallel_group": None
                },
                {
                    "title": f"实现功能",
                    "description": "根据设计方案实现具体功能",
                    "role": "developer",
                    "estimated_time": 20,
                    "dependencies": ["设计方案"],
                    "parallel_group": None
                }
            ]

        elif complexity in [TaskComplexity.MODERATE, TaskComplexity.COMPLEX]:
            subtasks = [
                {
                    "title": "需求分析",
                    "description": "深度分析任务需求和约束条件",
                    "role": "architect",
                    "estimated_time": 20,
                    "dependencies": [],
                    "parallel_group": None
                },
                {
                    "title": "系统设计",
                    "description": "设计系统架构和实现方案",
                    "role": "architect",
                    "estimated_time": 25,
                    "dependencies": ["需求分析"],
                    "parallel_group": None
                }
            ]

            if task_type == TaskType.DEVELOPMENT:
                subtasks.extend([
                    {
                        "title": "后端开发",
                        "description": "实现后端API和业务逻辑",
                        "role": "developer",
                        "estimated_time": 45,
                        "dependencies": ["系统设计"],
                        "parallel_group": "implementation"
                    },
                    {
                        "title": "前端开发",
                        "description": "实现用户界面和交互",
                        "role": "designer",
                        "estimated_time": 40,
                        "dependencies": ["系统设计"],
                        "parallel_group": "implementation"
                    },
                    {
                        "title": "测试用例",
                        "description": "编写单元测试和集成测试",
                        "role": "quality",
                        "estimated_time": 30,
                        "dependencies": ["系统设计"],
                        "parallel_group": "implementation"
                    }
                ])

            subtasks.append({
                "title": "系统集成",
                "description": "集成各模块并进行测试",
                "role": "quality",
                "estimated_time": 20,
                "dependencies": ["后端开发", "前端开发", "测试用例"] if task_type == TaskType.DEVELOPMENT else ["系统设计"],
                "parallel_group": None
            })

            return subtasks

        else:  # EXPERT
            return self._generate_expert_level_subtasks(task_description, task_type)

    def _generate_expert_level_subtasks(self, task_description: str, task_type: TaskType) -> List[Dict[str, Any]]:
        """生成专家级任务的详细分解"""

        subtasks = [
            # Phase 1: 深度分析
            {"title": "深度需求分析", "description": "使用Sequential Thinking进行深度需求分析",
             "role": "architect", "estimated_time": 30, "dependencies": [], "parallel_group": None},
            {"title": "技术调研", "description": "调研相关技术和最佳实践",
             "role": "analyst", "estimated_time": 25, "dependencies": [], "parallel_group": "research"},
            {"title": "竞品分析", "description": "分析竞品解决方案和创新点",
             "role": "analyst", "estimated_time": 20, "dependencies": [], "parallel_group": "research"},

            # Phase 2: 架构设计
            {"title": "系统架构设计", "description": "设计完整的系统架构",
             "role": "architect", "estimated_time": 40,
             "dependencies": ["深度需求分析", "技术调研", "竞品分析"], "parallel_group": None},

            # Phase 3: 并行开发
            {"title": "核心模块开发", "description": "实现系统核心功能模块",
             "role": "developer", "estimated_time": 60, "dependencies": ["系统架构设计"], "parallel_group": "development"},
            {"title": "数据层实现", "description": "实现数据存储和访问层",
             "role": "developer", "estimated_time": 45, "dependencies": ["系统架构设计"], "parallel_group": "development"},
            {"title": "API接口开发", "description": "实现RESTful API接口",
             "role": "developer", "estimated_time": 40, "dependencies": ["系统架构设计"], "parallel_group": "development"},
            {"title": "用户界面设计", "description": "设计和实现用户界面",
             "role": "designer", "estimated_time": 50, "dependencies": ["系统架构设计"], "parallel_group": "development"},

            # Phase 4: 质量保证
            {"title": "单元测试", "description": "编写和执行单元测试",
             "role": "quality", "estimated_time": 35, "dependencies": ["核心模块开发", "数据层实现"], "parallel_group": "testing"},
            {"title": "集成测试", "description": "进行系统集成测试",
             "role": "quality", "estimated_time": 30, "dependencies": ["API接口开发", "用户界面设计"], "parallel_group": "testing"},

            # Phase 5: 文档和部署
            {"title": "技术文档", "description": "编写完整的技术文档",
             "role": "docs", "estimated_time": 30, "dependencies": ["单元测试", "集成测试"], "parallel_group": "finalization"},
            {"title": "部署方案", "description": "准备生产环境部署方案",
             "role": "architect", "estimated_time": 25, "dependencies": ["单元测试", "集成测试"], "parallel_group": "finalization"}
        ]

        return subtasks

    def decompose_task(self, task_description: str, max_instances: int = 8) -> TaskDAG:
        """完整任务分解流程 - 生成DAG"""

        session_id = str(uuid.uuid4())

        # 1. 分析任务复杂度
        complexity_analysis = self.analyze_task_complexity(task_description)
        complexity = complexity_analysis["complexity"]

        # 2. 生成子任务
        subtasks_data = self.generate_subtasks(task_description, complexity)

        # 3. 创建任务节点并绑定上下文
        nodes = {}
        parallel_groups = {}

        for i, subtask in enumerate(subtasks_data):
            task_id = f"task_{i+1:03d}"
            task_type, roles = self.identify_task_type_and_roles(subtask["description"])
            required_role = subtask["role"]

            # 创建任务节点并配置多级上下文
            node = TaskNode(
                id=task_id,
                title=subtask["title"],
                description=subtask["description"],
                task_type=task_type,
                complexity=TaskComplexity.MODERATE,
                estimated_time_minutes=subtask["estimated_time"],
                required_role=required_role,
                dependencies=subtask["dependencies"],
                parallel_group=subtask.get("parallel_group"),
                priority=len(subtasks_data) - i,
                skills_required=self.role_capabilities.get(required_role, {}).get("skills", []),
                context_requirements={
                    "role": required_role,
                    "task_type": task_type.value,
                    "complexity": complexity.value
                },
                deliverables=[f"{subtask['title']}_result"],
                context_level="L3",  # 节点级上下文
                context_data={
                    "prompt_template": f"执行任务: {subtask['title']}",
                    "isolation_scope": "node"
                }
            )

            nodes[task_id] = node

            if subtask.get("parallel_group"):
                group_name = subtask["parallel_group"]
                if group_name not in parallel_groups:
                    parallel_groups[group_name] = []
                parallel_groups[group_name].append(task_id)

        # 4. 计算关键路径
        critical_path = self._calculate_critical_path(nodes)
        total_time = sum(node.estimated_time_minutes for node in nodes.values())
        parallel_time = self._calculate_parallel_time(nodes, parallel_groups)
        parallelizable_ratio = min((total_time - parallel_time) / total_time, 0.8) if total_time > 0 else 0

        # 5. 生成执行计划
        execution_plan = self._generate_execution_plan(nodes, parallel_groups, max_instances)

        # 6. 构建上下文层级
        context_hierarchy = {
            "L1_system": {"scope": "global", "ttl": "permanent"},
            "L2_project": {"scope": "project", "ttl": "session", "project_id": session_id},
            "L3_node": {"scope": "node", "ttl": "task", "isolation": True},
            "L4_session": {"scope": "session", "ttl": "temporary"}
        }

        # 7. 创建DAG对象
        dag = TaskDAG(
            session_id=session_id,
            total_nodes=len(nodes),
            parallel_groups=parallel_groups,
            critical_path=critical_path,
            estimated_total_time=parallel_time,
            parallelizable_ratio=parallelizable_ratio,
            nodes=nodes,
            execution_plan=execution_plan,
            context_hierarchy=context_hierarchy
        )

        return dag

    def _calculate_critical_path(self, nodes: Dict[str, TaskNode]) -> List[str]:
        """计算关键路径"""
        max_path = []
        max_time = 0

        def dfs_path(node_id: str, current_path: List[str], current_time: int):
            nonlocal max_path, max_time

            current_path.append(node_id)
            current_time += nodes[node_id].estimated_time_minutes

            dependents = [nid for nid, node in nodes.items()
                         if any(nodes[node_id].title in dep for dep in node.dependencies)]

            if not dependents:
                if current_time > max_time:
                    max_time = current_time
                    max_path = current_path.copy()
            else:
                for dep_id in dependents:
                    if dep_id not in current_path:
                        dfs_path(dep_id, current_path.copy(), current_time)

        root_tasks = [nid for nid, node in nodes.items() if not node.dependencies]
        for root_id in root_tasks:
            dfs_path(root_id, [], 0)

        return max_path

    def _calculate_parallel_time(self, nodes: Dict[str, TaskNode],
                                  parallel_groups: Dict[str, List[str]]) -> int:
        """计算考虑并行后的总时间"""
        sequential_time = 0

        for group_name, task_ids in parallel_groups.items():
            group_max_time = max(nodes[tid].estimated_time_minutes for tid in task_ids)
            sequential_time += group_max_time

        non_parallel_tasks = [node for node in nodes.values() if not node.parallel_group]
        sequential_time += sum(task.estimated_time_minutes for task in non_parallel_tasks)

        return sequential_time

    def _generate_execution_plan(self, nodes: Dict[str, TaskNode],
                                  parallel_groups: Dict[str, List[str]],
                                  max_instances: int) -> List[Dict[str, Any]]:
        """生成执行计划"""
        execution_phases = []

        # 顺序任务
        sequential_tasks = [node for node in nodes.values() if not node.parallel_group]
        if sequential_tasks:
            execution_phases.append({
                "phase": "sequential_preparation",
                "type": "sequential",
                "tasks": [{"task_id": task.id, "role": task.required_role,
                          "estimated_time": task.estimated_time_minutes}
                         for task in sequential_tasks[:2]]
            })

        # 并行任务组
        for group_name, task_ids in parallel_groups.items():
            group_tasks = [nodes[tid] for tid in task_ids]
            execution_phases.append({
                "phase": f"parallel_{group_name}",
                "type": "parallel",
                "max_concurrent": min(len(group_tasks), max_instances),
                "tasks": [{"task_id": task.id, "role": task.required_role,
                          "estimated_time": task.estimated_time_minutes}
                         for task in group_tasks]
            })

        return execution_phases


# 便捷函数
def decompose(task_description: str, max_parallel: int = 8) -> TaskDAG:
    """快速分解任务为DAG"""
    decomposer = TaskDecomposer()
    return decomposer.decompose_task(task_description, max_parallel)


if __name__ == "__main__":
    # 示例用法
    task = "开发一个企业级AI推荐系统，支持实时推荐和离线分析"
    dag = decompose(task)

    print(f"任务分解完成:")
    print(f"  - 总节点数: {dag.total_nodes}")
    print(f"  - 并行组: {list(dag.parallel_groups.keys())}")
    print(f"  - 预计时间: {dag.estimated_total_time}分钟")
    print(f"  - 并行化率: {dag.parallelizable_ratio:.1%}")
    print(f"\n执行计划:")
    for phase in dag.execution_plan:
        print(f"  [{phase['type']}] {phase['phase']}: {len(phase['tasks'])}个任务")
