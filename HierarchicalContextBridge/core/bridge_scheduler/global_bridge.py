#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HCB框架 - 全局桥接调度器
Hierarchical Context Bridge - Global Bridge Scheduler

实现：
- 零延迟协作协议
- 状态标志触发机制
- 受控上下文桥接
- 任务分发与协调

专利技术：基于分层上下文与全局桥接调度的智能体协作系统
"""

import json
import hashlib
import logging
import asyncio
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict, field
from enum import Enum
from pathlib import Path


class NodeState(Enum):
    """执行节点状态标志"""
    IDLE = "idle"              # 空闲
    READY = "ready"            # 就绪（前置依赖完成）
    EXECUTING = "executing"    # 执行中
    COMPLETED = "completed"    # 已完成
    FAILED = "failed"          # 失败
    BLOCKED = "blocked"        # 阻塞


@dataclass
class ExecutionNode:
    """执行节点"""
    id: str
    role: str
    task_id: str
    state: NodeState = NodeState.IDLE

    # 依赖管理
    upstream_nodes: List[str] = field(default_factory=list)
    downstream_nodes: List[str] = field(default_factory=list)

    # 任务提示词（隔离）
    prompt: str = ""
    context_data: Dict[str, Any] = field(default_factory=dict)

    # 执行结果
    result: Any = None
    error: Optional[str] = None
    execution_time: float = 0.0

    # 时间戳
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['state'] = self.state.value
        return result


@dataclass
class BridgeRequest:
    """桥接请求"""
    request_id: str
    source_node: str
    target_node: str
    query: str
    intent: str
    scope: str  # private, shared, public
    consent_token: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class BridgeResponse:
    """桥接响应"""
    request_id: str
    success: bool
    data: Any
    source_namespaces: List[str]
    processing_time: float
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class StateFlagManager:
    """
    状态标志管理单元

    专利权利要求11：
    - 为每个执行节点创建状态标志
    - 就绪状态标志、执行状态标志、完成状态标志
    """

    def __init__(self):
        self.nodes: Dict[str, ExecutionNode] = {}
        self.state_listeners: Dict[str, List[Callable]] = {}
        self.logger = logging.getLogger(f"{__name__}.StateFlagManager")

    def register_node(self, node: ExecutionNode):
        """注册执行节点"""
        self.nodes[node.id] = node
        self.logger.debug(f"✅ 注册节点: {node.id}")

    def update_state(self, node_id: str, new_state: NodeState) -> bool:
        """更新节点状态"""
        if node_id not in self.nodes:
            return False

        old_state = self.nodes[node_id].state
        self.nodes[node_id].state = new_state

        # 状态转换时间戳
        if new_state == NodeState.EXECUTING:
            self.nodes[node_id].started_at = datetime.now().isoformat()
        elif new_state in [NodeState.COMPLETED, NodeState.FAILED]:
            self.nodes[node_id].completed_at = datetime.now().isoformat()

        self.logger.info(f"📊 状态变更: {node_id} {old_state.value} -> {new_state.value}")

        # 触发监听器
        self._notify_listeners(node_id, old_state, new_state)
        return True

    def get_state(self, node_id: str) -> Optional[NodeState]:
        """获取节点状态"""
        if node_id in self.nodes:
            return self.nodes[node_id].state
        return None

    def add_listener(self, node_id: str, callback: Callable):
        """添加状态变更监听器"""
        if node_id not in self.state_listeners:
            self.state_listeners[node_id] = []
        self.state_listeners[node_id].append(callback)

    def _notify_listeners(self, node_id: str, old_state: NodeState, new_state: NodeState):
        """通知监听器"""
        listeners = self.state_listeners.get(node_id, [])
        for callback in listeners:
            try:
                callback(node_id, old_state, new_state)
            except Exception as e:
                self.logger.error(f"监听器执行失败: {e}")


class InstantTriggerCoordinator:
    """
    即时触发协调单元

    专利权利要求11：
    - 实时监控状态标志变化
    - 完成状态触发下游节点就绪
    - 零延迟协作协议
    """

    def __init__(self, state_manager: StateFlagManager):
        self.state_manager = state_manager
        self.prompt_generator: Optional[Callable] = None
        self.logger = logging.getLogger(f"{__name__}.InstantTriggerCoordinator")

        # 注册全局监听
        for node_id in state_manager.nodes:
            state_manager.add_listener(node_id, self._on_state_change)

    def set_prompt_generator(self, generator: Callable):
        """设置提示词生成器"""
        self.prompt_generator = generator

    def _on_state_change(self, node_id: str, old_state: NodeState, new_state: NodeState):
        """状态变更回调 - 零延迟触发"""
        if new_state == NodeState.COMPLETED:
            self._trigger_downstream_nodes(node_id)

    def _trigger_downstream_nodes(self, completed_node_id: str):
        """
        触发下游节点就绪

        当检测到任一执行节点的完成状态标志的状态为有效时，
        自动获取该节点的下游节点，将满足依赖条件的下游节点就绪状态标志设置为有效
        """
        completed_node = self.state_manager.nodes.get(completed_node_id)
        if not completed_node:
            return

        for downstream_id in completed_node.downstream_nodes:
            downstream_node = self.state_manager.nodes.get(downstream_id)
            if not downstream_node:
                continue

            # 检查所有上游依赖是否完成
            all_deps_completed = all(
                self.state_manager.nodes.get(up_id) and
                self.state_manager.nodes[up_id].state == NodeState.COMPLETED
                for up_id in downstream_node.upstream_nodes
            )

            if all_deps_completed:
                # 生成并下发任务提示词
                if self.prompt_generator:
                    downstream_node.prompt = self.prompt_generator(downstream_node)

                # 设置就绪状态
                self.state_manager.update_state(downstream_id, NodeState.READY)
                self.logger.info(f"🚀 即时触发: {downstream_id} 已就绪")


class GlobalBridgeScheduler:
    """
    全局桥接调度器 (GBS)

    核心功能：
    1. 状态标志管理
    2. 即时触发协调
    3. 受控上下文桥接
    4. 任务分发调度
    """

    def __init__(self):
        self.state_manager = StateFlagManager()
        self.trigger_coordinator = InstantTriggerCoordinator(self.state_manager)
        self.logger = logging.getLogger(f"{__name__}.GlobalBridgeScheduler")

        # 桥接审计日志
        self.audit_log: List[Dict[str, Any]] = []

        # 桥接策略
        self.bridge_policies: Dict[str, Dict[str, Any]] = {}

        self.logger.info("✅ 全局桥接调度器初始化完成")

    def register_nodes(self, nodes: List[ExecutionNode]):
        """批量注册执行节点"""
        for node in nodes:
            self.state_manager.register_node(node)

        # 重新注册状态监听
        for node in nodes:
            self.state_manager.add_listener(
                node.id,
                self.trigger_coordinator._on_state_change
            )

    def set_node_dependencies(self, dependencies: Dict[str, List[str]]):
        """
        设置节点依赖关系

        Args:
            dependencies: {node_id: [upstream_node_ids]}
        """
        for node_id, upstream_ids in dependencies.items():
            if node_id in self.state_manager.nodes:
                self.state_manager.nodes[node_id].upstream_nodes = upstream_ids

                # 更新上游节点的下游引用
                for up_id in upstream_ids:
                    if up_id in self.state_manager.nodes:
                        if node_id not in self.state_manager.nodes[up_id].downstream_nodes:
                            self.state_manager.nodes[up_id].downstream_nodes.append(node_id)

    def generate_prompt(self, node: ExecutionNode) -> str:
        """为节点生成任务提示词"""
        # 收集上游执行结果
        upstream_results = []
        for up_id in node.upstream_nodes:
            up_node = self.state_manager.nodes.get(up_id)
            if up_node and up_node.result:
                upstream_results.append({
                    "node": up_id,
                    "role": up_node.role,
                    "result": up_node.result
                })

        prompt = f"""
你的角色: {node.role}
任务ID: {node.task_id}

上游任务结果:
{json.dumps(upstream_results, ensure_ascii=False, indent=2)}

请基于上游结果执行你的任务。
"""
        return prompt

    def bridge_context(self, request: BridgeRequest) -> BridgeResponse:
        """
        受控上下文桥接

        所有任务节点间信息流动必须经过授权与日志记录
        """
        start_time = datetime.now()

        # 验证令牌
        if not self._validate_consent_token(request):
            return BridgeResponse(
                request_id=request.request_id,
                success=False,
                data=None,
                source_namespaces=[],
                processing_time=0
            )

        # 检查策略
        policy = self._check_bridge_policy(request)
        if not policy.get("allowed", False):
            self._log_audit(request, None, "DENIED", policy.get("reason", ""))
            return BridgeResponse(
                request_id=request.request_id,
                success=False,
                data={"error": policy.get("reason", "Policy denied")},
                source_namespaces=[],
                processing_time=0
            )

        # 执行桥接查询
        source_node = self.state_manager.nodes.get(request.source_node)
        target_node = self.state_manager.nodes.get(request.target_node)

        if not source_node or not target_node:
            return BridgeResponse(
                request_id=request.request_id,
                success=False,
                data={"error": "Node not found"},
                source_namespaces=[],
                processing_time=0
            )

        # 根据scope过滤数据
        bridged_data = self._filter_by_scope(target_node, request.scope)

        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        response = BridgeResponse(
            request_id=request.request_id,
            success=True,
            data=bridged_data,
            source_namespaces=[request.target_node],
            processing_time=processing_time
        )

        # 审计日志
        self._log_audit(request, response, "ALLOWED", "")

        return response

    def _validate_consent_token(self, request: BridgeRequest) -> bool:
        """验证授权令牌"""
        # 简化验证：检查令牌格式
        if not request.consent_token or len(request.consent_token) < 8:
            return False
        return True

    def _check_bridge_policy(self, request: BridgeRequest) -> Dict[str, Any]:
        """检查桥接策略"""
        # 默认策略：允许同项目内桥接
        return {"allowed": True, "reason": ""}

    def _filter_by_scope(self, node: ExecutionNode, scope: str) -> Dict[str, Any]:
        """根据作用域过滤数据"""
        if scope == "public":
            return node.to_dict()
        elif scope == "shared":
            # 不返回私有提示词
            data = node.to_dict()
            data.pop('prompt', None)
            return data
        else:  # private
            return {"id": node.id, "state": node.state.value}

    def _log_audit(self, request: BridgeRequest, response: Optional[BridgeResponse],
                   decision: str, reason: str):
        """记录审计日志"""
        audit_entry = {
            "timestamp": datetime.now().isoformat(),
            "request_id": request.request_id,
            "source": request.source_node,
            "target": request.target_node,
            "intent": request.intent,
            "scope": request.scope,
            "decision": decision,
            "reason": reason,
            "processing_time": response.processing_time if response else 0
        }
        self.audit_log.append(audit_entry)
        self.logger.debug(f"📝 审计: {decision} {request.source_node} -> {request.target_node}")

    async def execute_dag(self, dag_nodes: List[ExecutionNode],
                          executor: Callable[[ExecutionNode], Any]) -> Dict[str, Any]:
        """
        执行DAG任务图

        Args:
            dag_nodes: DAG节点列表
            executor: 节点执行器函数
        """
        # 注册所有节点
        self.register_nodes(dag_nodes)

        # 设置提示词生成器
        self.trigger_coordinator.set_prompt_generator(self.generate_prompt)

        # 找到根节点（无依赖）并设置为就绪
        for node in dag_nodes:
            if not node.upstream_nodes:
                self.state_manager.update_state(node.id, NodeState.READY)

        # 执行循环
        results = {}
        max_iterations = len(dag_nodes) * 2  # 防止无限循环

        for _ in range(max_iterations):
            # 获取所有就绪节点
            ready_nodes = [
                node for node in self.state_manager.nodes.values()
                if node.state == NodeState.READY
            ]

            if not ready_nodes:
                # 检查是否全部完成
                all_done = all(
                    n.state in [NodeState.COMPLETED, NodeState.FAILED]
                    for n in self.state_manager.nodes.values()
                )
                if all_done:
                    break
                await asyncio.sleep(0.1)
                continue

            # 并发执行就绪节点
            tasks = []
            for node in ready_nodes:
                self.state_manager.update_state(node.id, NodeState.EXECUTING)
                tasks.append(self._execute_node(node, executor))

            await asyncio.gather(*tasks)

        # 收集结果
        for node in self.state_manager.nodes.values():
            results[node.id] = {
                "state": node.state.value,
                "result": node.result,
                "error": node.error,
                "execution_time": node.execution_time
            }

        return results

    async def _execute_node(self, node: ExecutionNode, executor: Callable):
        """执行单个节点"""
        start_time = datetime.now()

        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, executor, node
            )
            node.result = result
            node.execution_time = (datetime.now() - start_time).total_seconds()
            self.state_manager.update_state(node.id, NodeState.COMPLETED)

        except Exception as e:
            node.error = str(e)
            node.execution_time = (datetime.now() - start_time).total_seconds()
            self.state_manager.update_state(node.id, NodeState.FAILED)

    def get_audit_log(self) -> List[Dict[str, Any]]:
        """获取审计日志"""
        return self.audit_log.copy()

    def get_execution_statistics(self) -> Dict[str, Any]:
        """获取执行统计"""
        nodes = list(self.state_manager.nodes.values())

        completed = sum(1 for n in nodes if n.state == NodeState.COMPLETED)
        failed = sum(1 for n in nodes if n.state == NodeState.FAILED)
        total_time = sum(n.execution_time for n in nodes)

        return {
            "total_nodes": len(nodes),
            "completed": completed,
            "failed": failed,
            "success_rate": completed / len(nodes) if nodes else 0,
            "total_execution_time": total_time,
            "audit_entries": len(self.audit_log)
        }


# 便捷函数
def create_scheduler() -> GlobalBridgeScheduler:
    """创建全局桥接调度器"""
    return GlobalBridgeScheduler()


if __name__ == "__main__":
    import asyncio

    # 示例用法
    scheduler = GlobalBridgeScheduler()

    # 创建执行节点
    nodes = [
        ExecutionNode(id="node_1", role="architect", task_id="task_001"),
        ExecutionNode(id="node_2", role="developer", task_id="task_002",
                      upstream_nodes=["node_1"]),
        ExecutionNode(id="node_3", role="developer", task_id="task_003",
                      upstream_nodes=["node_1"]),
        ExecutionNode(id="node_4", role="quality", task_id="task_004",
                      upstream_nodes=["node_2", "node_3"])
    ]

    # 注册节点
    scheduler.register_nodes(nodes)

    # 设置依赖
    scheduler.set_node_dependencies({
        "node_2": ["node_1"],
        "node_3": ["node_1"],
        "node_4": ["node_2", "node_3"]
    })

    # 模拟执行器
    def mock_executor(node: ExecutionNode):
        import time
        time.sleep(0.1)  # 模拟执行
        return f"Result from {node.role}"

    # 执行
    async def main():
        results = await scheduler.execute_dag(nodes, mock_executor)
        print("执行结果:", json.dumps(results, indent=2, ensure_ascii=False))
        print("统计:", scheduler.get_execution_statistics())

    asyncio.run(main())
