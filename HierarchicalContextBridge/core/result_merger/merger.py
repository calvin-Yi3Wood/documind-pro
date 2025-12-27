#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HCB框架 - 结果合并模块
Hierarchical Context Bridge - Result Merger

实现：
- 多重验证处理
- 幂等合并机制
- 异常回滚机制
- 时间戳一致性验证
- 内容哈希校验

专利技术：基于分层上下文与全局桥接调度的智能体协作系统
"""

import json
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum
from pathlib import Path
import copy


class ValidationResult(Enum):
    """验证结果"""
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"


class MergeStrategy(Enum):
    """合并策略"""
    APPEND = "append"           # 追加
    REPLACE = "replace"         # 替换
    MERGE = "merge"             # 深度合并
    AGGREGATE = "aggregate"     # 聚合


@dataclass
class ExecutionResult:
    """执行数据"""
    node_id: str
    role: str
    content: Any
    timestamp: str
    content_hash: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    status: str = "success"
    execution_time: float = 0.0

    def __post_init__(self):
        if not self.content_hash:
            self.content_hash = self._compute_hash()

    def _compute_hash(self) -> str:
        """计算内容哈希"""
        content_str = json.dumps(self.content, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(content_str.encode()).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class MergeResult:
    """合并结果"""
    success: bool
    merged_data: Any
    validations: Dict[str, ValidationResult]
    warnings: List[str]
    errors: List[str]
    rollback_point: Optional[str] = None
    processing_time: float = 0.0


class ValidationEngine:
    """
    多重验证引擎

    专利权利要求8: 时间戳一致性验证、内容哈希校验、业务逻辑一致性校验
    """

    def __init__(self, time_window_seconds: float = 300):
        self.time_window = time_window_seconds  # 时间窗口（秒）
        self.logger = logging.getLogger(f"{__name__}.ValidationEngine")

    def validate_timestamp_consistency(self, results: List[ExecutionResult]) -> Tuple[ValidationResult, str]:
        """
        时间戳一致性验证

        检查所有执行结果的时间戳是否在可接受的时间窗口内
        """
        if not results:
            return ValidationResult.PASSED, "No results to validate"

        timestamps = [datetime.fromisoformat(r.timestamp) for r in results]
        min_time = min(timestamps)
        max_time = max(timestamps)
        time_diff = (max_time - min_time).total_seconds()

        if time_diff <= self.time_window:
            return ValidationResult.PASSED, f"时间差: {time_diff:.2f}秒"
        else:
            return ValidationResult.WARNING, f"时间差超过阈值: {time_diff:.2f}秒 > {self.time_window}秒"

    def validate_content_hash(self, results: List[ExecutionResult]) -> Tuple[ValidationResult, str]:
        """
        内容哈希校验

        验证内容的完整性，检测数据是否被篡改
        """
        for result in results:
            computed_hash = result._compute_hash()
            if result.content_hash != computed_hash:
                return ValidationResult.FAILED, f"节点 {result.node_id} 哈希不匹配"

        return ValidationResult.PASSED, "所有哈希校验通过"

    def validate_data_completeness(self, results: List[ExecutionResult],
                                   expected_nodes: List[str] = None) -> Tuple[ValidationResult, str]:
        """数据完整性校验"""
        if not expected_nodes:
            return ValidationResult.PASSED, "无预期节点列表"

        received_nodes = {r.node_id for r in results}
        missing_nodes = set(expected_nodes) - received_nodes

        if not missing_nodes:
            return ValidationResult.PASSED, "所有预期节点数据已收到"
        else:
            return ValidationResult.FAILED, f"缺少节点数据: {missing_nodes}"

    def validate_business_logic(self, results: List[ExecutionResult],
                                rules: Dict[str, Any] = None) -> Tuple[ValidationResult, str]:
        """
        业务逻辑一致性校验

        检查结果是否符合业务规则
        """
        if not rules:
            return ValidationResult.PASSED, "无业务规则"

        # 示例规则检查
        for result in results:
            # 检查必需字段
            if rules.get("required_fields"):
                for field in rules["required_fields"]:
                    if isinstance(result.content, dict) and field not in result.content:
                        return ValidationResult.FAILED, f"节点 {result.node_id} 缺少必需字段: {field}"

            # 检查状态一致性
            if rules.get("valid_statuses"):
                if result.status not in rules["valid_statuses"]:
                    return ValidationResult.FAILED, f"节点 {result.node_id} 状态无效: {result.status}"

        return ValidationResult.PASSED, "业务逻辑校验通过"

    def run_all_validations(self, results: List[ExecutionResult],
                            expected_nodes: List[str] = None,
                            business_rules: Dict[str, Any] = None) -> Dict[str, Tuple[ValidationResult, str]]:
        """执行所有验证"""
        return {
            "timestamp_consistency": self.validate_timestamp_consistency(results),
            "content_hash": self.validate_content_hash(results),
            "data_completeness": self.validate_data_completeness(results, expected_nodes),
            "business_logic": self.validate_business_logic(results, business_rules)
        }


class IdempotentMerger:
    """
    幂等合并器

    专利权利要求8: 采用幂等合并机制
    确保多次执行相同合并操作产生相同结果
    """

    def __init__(self):
        self.merge_tokens: Dict[str, str] = {}  # 合并令牌记录
        self.logger = logging.getLogger(f"{__name__}.IdempotentMerger")

    def generate_merge_token(self, results: List[ExecutionResult]) -> str:
        """生成合并令牌（用于幂等性检查）"""
        token_data = "|".join(sorted([r.content_hash for r in results]))
        return hashlib.sha256(token_data.encode()).hexdigest()[:16]

    def is_duplicate_merge(self, token: str) -> bool:
        """检查是否重复合并"""
        return token in self.merge_tokens

    def record_merge(self, token: str, result_hash: str):
        """记录合并操作"""
        self.merge_tokens[token] = result_hash

    def merge_results(self, results: List[ExecutionResult],
                      strategy: MergeStrategy = MergeStrategy.MERGE) -> Any:
        """
        合并执行结果

        Args:
            results: 执行结果列表
            strategy: 合并策略
        """
        if not results:
            return None

        # 检查幂等性
        token = self.generate_merge_token(results)
        if self.is_duplicate_merge(token):
            self.logger.info(f"⚠️ 检测到重复合并，跳过: {token}")
            return None

        # 按策略合并
        if strategy == MergeStrategy.APPEND:
            merged = [r.content for r in results]

        elif strategy == MergeStrategy.REPLACE:
            # 取最新的结果
            latest = max(results, key=lambda r: r.timestamp)
            merged = latest.content

        elif strategy == MergeStrategy.MERGE:
            # 深度合并字典
            merged = {}
            for result in sorted(results, key=lambda r: r.timestamp):
                if isinstance(result.content, dict):
                    merged = self._deep_merge(merged, result.content)
                else:
                    merged[result.node_id] = result.content

        elif strategy == MergeStrategy.AGGREGATE:
            # 按角色分组聚合
            merged = {}
            for result in results:
                if result.role not in merged:
                    merged[result.role] = []
                merged[result.role].append({
                    "node_id": result.node_id,
                    "content": result.content,
                    "timestamp": result.timestamp
                })

        else:
            merged = [r.content for r in results]

        # 记录合并
        result_hash = hashlib.sha256(
            json.dumps(merged, sort_keys=True, ensure_ascii=False).encode()
        ).hexdigest()[:16]
        self.record_merge(token, result_hash)

        return merged

    def _deep_merge(self, base: Dict, update: Dict) -> Dict:
        """深度合并字典"""
        result = copy.deepcopy(base)
        for key, value in update.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = copy.deepcopy(value)
        return result


class RollbackManager:
    """
    异常回滚管理器

    专利权利要求8: 异常回滚机制
    """

    def __init__(self, max_rollback_points: int = 10):
        self.rollback_points: List[Dict[str, Any]] = []
        self.max_points = max_rollback_points
        self.logger = logging.getLogger(f"{__name__}.RollbackManager")

    def create_rollback_point(self, state: Any, description: str = "") -> str:
        """创建回滚点"""
        point_id = hashlib.sha256(
            f"{datetime.now().isoformat()}_{len(self.rollback_points)}".encode()
        ).hexdigest()[:12]

        rollback_point = {
            "id": point_id,
            "state": copy.deepcopy(state),
            "description": description,
            "timestamp": datetime.now().isoformat()
        }

        self.rollback_points.append(rollback_point)

        # 限制回滚点数量
        if len(self.rollback_points) > self.max_points:
            self.rollback_points.pop(0)

        self.logger.info(f"✅ 创建回滚点: {point_id}")
        return point_id

    def rollback_to(self, point_id: str) -> Optional[Any]:
        """回滚到指定点"""
        for point in reversed(self.rollback_points):
            if point["id"] == point_id:
                self.logger.warning(f"⚠️ 执行回滚: {point_id}")
                return copy.deepcopy(point["state"])

        self.logger.error(f"❌ 回滚点不存在: {point_id}")
        return None

    def get_rollback_history(self) -> List[Dict[str, str]]:
        """获取回滚历史"""
        return [
            {"id": p["id"], "description": p["description"], "timestamp": p["timestamp"]}
            for p in self.rollback_points
        ]


class ResultMerger:
    """
    结果合并模块 - 核心实现

    集成：
    - 多重验证处理
    - 幂等合并
    - 异常回滚
    """

    def __init__(self, time_window: float = 300):
        self.validation_engine = ValidationEngine(time_window)
        self.merger = IdempotentMerger()
        self.rollback_manager = RollbackManager()
        self.logger = logging.getLogger(f"{__name__}.ResultMerger")

    def merge(
        self,
        results: List[ExecutionResult],
        strategy: MergeStrategy = MergeStrategy.MERGE,
        expected_nodes: List[str] = None,
        business_rules: Dict[str, Any] = None,
        create_rollback: bool = True
    ) -> MergeResult:
        """
        合并执行结果

        完整流程：
        1. 多重验证
        2. 创建回滚点
        3. 幂等合并
        4. 错误处理
        """
        start_time = datetime.now()
        warnings = []
        errors = []

        # 1. 多重验证
        validations = self.validation_engine.run_all_validations(
            results, expected_nodes, business_rules
        )

        validation_results = {}
        for name, (result, message) in validations.items():
            validation_results[name] = result
            if result == ValidationResult.FAILED:
                errors.append(f"{name}: {message}")
            elif result == ValidationResult.WARNING:
                warnings.append(f"{name}: {message}")

        # 如果有验证失败，返回失败结果
        if errors:
            self.logger.error(f"❌ 验证失败: {errors}")
            return MergeResult(
                success=False,
                merged_data=None,
                validations=validation_results,
                warnings=warnings,
                errors=errors,
                processing_time=(datetime.now() - start_time).total_seconds() * 1000
            )

        # 2. 创建回滚点
        rollback_id = None
        if create_rollback:
            rollback_id = self.rollback_manager.create_rollback_point(
                [r.to_dict() for r in results],
                f"合并 {len(results)} 个结果"
            )

        # 3. 幂等合并
        try:
            merged_data = self.merger.merge_results(results, strategy)

            if merged_data is None:
                # 重复合并，返回警告
                warnings.append("检测到重复合并，已跳过")

            processing_time = (datetime.now() - start_time).total_seconds() * 1000

            return MergeResult(
                success=True,
                merged_data=merged_data,
                validations=validation_results,
                warnings=warnings,
                errors=errors,
                rollback_point=rollback_id,
                processing_time=processing_time
            )

        except Exception as e:
            self.logger.error(f"❌ 合并失败: {e}")

            # 尝试回滚
            if rollback_id:
                self.rollback_manager.rollback_to(rollback_id)

            return MergeResult(
                success=False,
                merged_data=None,
                validations=validation_results,
                warnings=warnings,
                errors=[str(e)],
                rollback_point=rollback_id,
                processing_time=(datetime.now() - start_time).total_seconds() * 1000
            )

    def rollback(self, point_id: str) -> Optional[List[Dict]]:
        """执行回滚"""
        return self.rollback_manager.rollback_to(point_id)

    def get_statistics(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            "merge_tokens": len(self.merger.merge_tokens),
            "rollback_points": len(self.rollback_manager.rollback_points),
            "time_window": self.validation_engine.time_window
        }


# 便捷函数
def merge_results(results: List[Dict[str, Any]],
                  strategy: str = "merge") -> MergeResult:
    """快速合并结果"""
    merger = ResultMerger()
    execution_results = [
        ExecutionResult(
            node_id=r.get("node_id", f"node_{i}"),
            role=r.get("role", "unknown"),
            content=r.get("content"),
            timestamp=r.get("timestamp", datetime.now().isoformat()),
            metadata=r.get("metadata", {})
        )
        for i, r in enumerate(results)
    ]
    return merger.merge(execution_results, MergeStrategy(strategy))


if __name__ == "__main__":
    # 示例用法
    merger = ResultMerger()

    # 创建执行结果
    results = [
        ExecutionResult(
            node_id="node_analyst",
            role="analyst",
            content={"analysis": "数据分析完成", "insights": ["发现1", "发现2"]},
            timestamp=datetime.now().isoformat()
        ),
        ExecutionResult(
            node_id="node_developer",
            role="developer",
            content={"code": "实现完成", "files": ["app.py", "utils.py"]},
            timestamp=datetime.now().isoformat()
        ),
        ExecutionResult(
            node_id="node_quality",
            role="quality",
            content={"tests": "测试通过", "coverage": 0.85},
            timestamp=datetime.now().isoformat()
        )
    ]

    # 执行合并
    result = merger.merge(
        results,
        strategy=MergeStrategy.MERGE,
        expected_nodes=["node_analyst", "node_developer", "node_quality"]
    )

    print(f"合并成功: {result.success}")
    print(f"验证结果: {result.validations}")
    print(f"合并数据: {json.dumps(result.merged_data, ensure_ascii=False, indent=2)}")
    print(f"处理时间: {result.processing_time:.2f}ms")

    if result.warnings:
        print(f"警告: {result.warnings}")
