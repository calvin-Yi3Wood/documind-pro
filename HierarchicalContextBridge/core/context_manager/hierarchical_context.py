#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HCB框架 - 分层上下文管理器
Hierarchical Context Bridge - Layered Context Manager

实现分层上下文隔离机制：
- L1 系统级 (System Level) - 全局共享，永久存储
- L2 项目级 (Project Level) - 项目范围，会话周期
- L3 节点级 (Node Level) - 任务智能体专用，任务周期
- L4 会话级 (Session Level) - 临时对话，短期存储

专利技术：基于分层上下文与全局桥接调度的智能体协作系统
"""

import json
import hashlib
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass, asdict, field
from enum import Enum
from pathlib import Path
from abc import ABC, abstractmethod


class ContextLevel(Enum):
    """上下文层级"""
    L1_SYSTEM = "L1"     # 系统级 - 全局共享
    L2_PROJECT = "L2"    # 项目级 - 项目范围
    L3_NODE = "L3"       # 节点级 - 任务智能体
    L4_SESSION = "L4"    # 会话级 - 临时对话


class ContextScope(Enum):
    """上下文作用域"""
    PRIVATE = "private"   # 私有 - 仅当前节点可见
    SHARED = "shared"     # 共享 - 同项目节点可见
    PUBLIC = "public"     # 公开 - 全局可见


@dataclass
class ContextRecord:
    """上下文记录"""
    id: str
    level: ContextLevel
    scope: ContextScope
    content: str
    metadata: Dict[str, Any]

    # 归属信息
    project_id: Optional[str] = None
    node_id: Optional[str] = None
    session_id: Optional[str] = None

    # 时效控制
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    ttl_minutes: Optional[int] = None  # None表示永久
    last_accessed: Optional[str] = None

    # 隔离标志
    isolated: bool = True  # 是否隔离（不共享提示词）

    def is_expired(self) -> bool:
        """检查是否过期"""
        if self.ttl_minutes is None:
            return False
        created = datetime.fromisoformat(self.created_at)
        return datetime.now() > created + timedelta(minutes=self.ttl_minutes)

    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['level'] = self.level.value
        result['scope'] = self.scope.value
        return result


@dataclass
class ContextLayer:
    """上下文层"""
    level: ContextLevel
    default_ttl: Optional[int]  # 默认TTL（分钟）
    records: Dict[str, ContextRecord] = field(default_factory=dict)

    # TTL配置 (专利权利要求7)
    TTL_CONFIG = {
        ContextLevel.L1_SYSTEM: None,      # 永久
        ContextLevel.L2_PROJECT: 120,      # 2小时
        ContextLevel.L3_NODE: 30,          # 30分钟
        ContextLevel.L4_SESSION: 10        # 10分钟
    }

    def add_record(self, record: ContextRecord):
        """添加记录"""
        if record.ttl_minutes is None:
            record.ttl_minutes = self.TTL_CONFIG.get(self.level)
        self.records[record.id] = record

    def get_record(self, record_id: str) -> Optional[ContextRecord]:
        """获取记录"""
        record = self.records.get(record_id)
        if record and not record.is_expired():
            record.last_accessed = datetime.now().isoformat()
            return record
        return None

    def cleanup_expired(self) -> int:
        """清理过期记录"""
        expired_ids = [
            rid for rid, record in self.records.items()
            if record.is_expired()
        ]
        for rid in expired_ids:
            del self.records[rid]
        return len(expired_ids)


class HierarchicalContextManager:
    """分层上下文管理器 - 核心实现"""

    def __init__(self, db_path: str = None):
        self.logger = logging.getLogger(f"{__name__}.HierarchicalContextManager")

        # 初始化四层上下文
        self.layers: Dict[ContextLevel, ContextLayer] = {
            level: ContextLayer(
                level=level,
                default_ttl=ContextLayer.TTL_CONFIG[level]
            )
            for level in ContextLevel
        }

        # 项目和节点索引
        self.project_contexts: Dict[str, Set[str]] = {}  # project_id -> record_ids
        self.node_contexts: Dict[str, Set[str]] = {}     # node_id -> record_ids

        # 数据库持久化
        self.db_path = Path(db_path) if db_path else None
        if self.db_path:
            self._init_database()

        self.logger.info("✅ 分层上下文管理器初始化完成")

    def _init_database(self):
        """初始化数据库"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS context_records (
                    id TEXT PRIMARY KEY,
                    level TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    content TEXT NOT NULL,
                    metadata TEXT NOT NULL,
                    project_id TEXT,
                    node_id TEXT,
                    session_id TEXT,
                    created_at TEXT NOT NULL,
                    ttl_minutes INTEGER,
                    last_accessed TEXT,
                    isolated BOOLEAN DEFAULT 1
                )
            """)

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_context_level
                ON context_records(level)
            """)

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_context_project
                ON context_records(project_id)
            """)

    def create_context(
        self,
        level: ContextLevel,
        content: str,
        metadata: Dict[str, Any] = None,
        scope: ContextScope = ContextScope.PRIVATE,
        project_id: str = None,
        node_id: str = None,
        session_id: str = None,
        isolated: bool = True
    ) -> ContextRecord:
        """
        创建上下文记录

        Args:
            level: 上下文层级 (L1-L4)
            content: 上下文内容（任务提示词等）
            metadata: 元数据
            scope: 作用域
            project_id: 项目ID
            node_id: 节点ID（任务智能体ID）
            session_id: 会话ID
            isolated: 是否隔离（不共享提示词）

        Returns:
            创建的上下文记录
        """
        # 生成唯一ID
        content_hash = hashlib.sha256(content.encode()).hexdigest()[:12]
        record_id = f"{level.value}_{content_hash}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

        record = ContextRecord(
            id=record_id,
            level=level,
            scope=scope,
            content=content,
            metadata=metadata or {},
            project_id=project_id,
            node_id=node_id,
            session_id=session_id,
            isolated=isolated
        )

        # 添加到对应层
        self.layers[level].add_record(record)

        # 更新索引
        if project_id:
            if project_id not in self.project_contexts:
                self.project_contexts[project_id] = set()
            self.project_contexts[project_id].add(record_id)

        if node_id:
            if node_id not in self.node_contexts:
                self.node_contexts[node_id] = set()
            self.node_contexts[node_id].add(record_id)

        # 持久化
        if self.db_path:
            self._persist_record(record)

        self.logger.debug(f"✅ 创建上下文: {record_id} @ {level.value}")
        return record

    def get_context(self, record_id: str) -> Optional[ContextRecord]:
        """获取上下文记录"""
        for layer in self.layers.values():
            record = layer.get_record(record_id)
            if record:
                return record
        return None

    def get_node_context(self, node_id: str) -> List[ContextRecord]:
        """
        获取节点的所有上下文

        关键点：任一任务节点不共享其余任务节点的任务提示词
        """
        records = []

        if node_id in self.node_contexts:
            for record_id in self.node_contexts[node_id]:
                record = self.get_context(record_id)
                if record and record.isolated:
                    # 隔离的记录仅返回给所属节点
                    records.append(record)

        return records

    def get_project_context(self, project_id: str, include_shared: bool = True) -> List[ContextRecord]:
        """
        获取项目的上下文

        Args:
            project_id: 项目ID
            include_shared: 是否包含共享上下文
        """
        records = []

        if project_id in self.project_contexts:
            for record_id in self.project_contexts[project_id]:
                record = self.get_context(record_id)
                if record:
                    if not record.isolated or include_shared:
                        records.append(record)

        return records

    def get_visible_context(
        self,
        node_id: str,
        project_id: str = None,
        session_id: str = None
    ) -> Dict[ContextLevel, List[ContextRecord]]:
        """
        获取对指定节点可见的所有上下文

        实现分层可见性：
        - L1系统级：所有节点可见
        - L2项目级：同项目节点可见（非隔离部分）
        - L3节点级：仅当前节点可见（隔离）
        - L4会话级：同会话可见
        """
        visible = {level: [] for level in ContextLevel}

        # L1 系统级 - 全部可见
        for record in self.layers[ContextLevel.L1_SYSTEM].records.values():
            if not record.is_expired():
                visible[ContextLevel.L1_SYSTEM].append(record)

        # L2 项目级 - 同项目可见（仅非隔离部分）
        if project_id:
            for record in self.layers[ContextLevel.L2_PROJECT].records.values():
                if not record.is_expired() and record.project_id == project_id:
                    if not record.isolated or record.scope != ContextScope.PRIVATE:
                        visible[ContextLevel.L2_PROJECT].append(record)

        # L3 节点级 - 仅当前节点可见（核心隔离）
        for record in self.layers[ContextLevel.L3_NODE].records.values():
            if not record.is_expired() and record.node_id == node_id:
                visible[ContextLevel.L3_NODE].append(record)

        # L4 会话级 - 同会话可见
        if session_id:
            for record in self.layers[ContextLevel.L4_SESSION].records.values():
                if not record.is_expired() and record.session_id == session_id:
                    visible[ContextLevel.L4_SESSION].append(record)

        return visible

    def build_prompt_context(
        self,
        node_id: str,
        project_id: str = None,
        session_id: str = None,
        max_tokens: int = 4000
    ) -> str:
        """
        为任务节点构建提示词上下文

        关键：节点间提示词隔离
        """
        visible = self.get_visible_context(node_id, project_id, session_id)

        context_parts = []
        token_count = 0

        # 按层级优先级组装
        for level in [ContextLevel.L1_SYSTEM, ContextLevel.L2_PROJECT,
                      ContextLevel.L3_NODE, ContextLevel.L4_SESSION]:
            for record in visible[level]:
                content_tokens = len(record.content) // 4  # 粗略估计
                if token_count + content_tokens <= max_tokens:
                    context_parts.append(f"[{level.value}] {record.content}")
                    token_count += content_tokens

        return "\n\n".join(context_parts)

    def cleanup_expired(self) -> Dict[str, int]:
        """清理所有层的过期记录"""
        results = {}
        for level, layer in self.layers.items():
            cleaned = layer.cleanup_expired()
            results[level.value] = cleaned
        return results

    def _persist_record(self, record: ContextRecord):
        """持久化记录到数据库"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO context_records
                (id, level, scope, content, metadata, project_id, node_id,
                 session_id, created_at, ttl_minutes, last_accessed, isolated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record.id, record.level.value, record.scope.value,
                record.content, json.dumps(record.metadata),
                record.project_id, record.node_id, record.session_id,
                record.created_at, record.ttl_minutes, record.last_accessed,
                record.isolated
            ))

    def get_statistics(self) -> Dict[str, Any]:
        """获取统计信息"""
        stats = {
            "total_records": sum(len(l.records) for l in self.layers.values()),
            "by_level": {
                level.value: len(layer.records)
                for level, layer in self.layers.items()
            },
            "projects": len(self.project_contexts),
            "nodes": len(self.node_contexts),
            "isolation_enabled": True
        }
        return stats


# 便捷函数
def create_isolated_context(node_id: str, content: str, project_id: str = None) -> ContextRecord:
    """创建隔离的节点上下文"""
    manager = HierarchicalContextManager()
    return manager.create_context(
        level=ContextLevel.L3_NODE,
        content=content,
        node_id=node_id,
        project_id=project_id,
        isolated=True,
        scope=ContextScope.PRIVATE
    )


if __name__ == "__main__":
    # 示例用法
    manager = HierarchicalContextManager()

    # 创建系统级上下文
    sys_ctx = manager.create_context(
        level=ContextLevel.L1_SYSTEM,
        content="你是一个智能协作系统",
        scope=ContextScope.PUBLIC
    )

    # 创建项目级上下文
    proj_ctx = manager.create_context(
        level=ContextLevel.L2_PROJECT,
        content="当前项目: AI推荐系统",
        project_id="proj_001",
        scope=ContextScope.SHARED
    )

    # 创建节点级上下文（隔离）
    node1_ctx = manager.create_context(
        level=ContextLevel.L3_NODE,
        content="你是数据分析师，负责数据处理",
        project_id="proj_001",
        node_id="node_analyst",
        isolated=True  # 关键：隔离
    )

    node2_ctx = manager.create_context(
        level=ContextLevel.L3_NODE,
        content="你是开发者，负责代码实现",
        project_id="proj_001",
        node_id="node_developer",
        isolated=True  # 关键：隔离
    )

    # 测试可见性
    analyst_visible = manager.get_visible_context("node_analyst", "proj_001")
    developer_visible = manager.get_visible_context("node_developer", "proj_001")

    print("分析师可见的L3上下文:", len(analyst_visible[ContextLevel.L3_NODE]))
    print("开发者可见的L3上下文:", len(developer_visible[ContextLevel.L3_NODE]))
    print("验证隔离: 分析师看不到开发者的提示词")

    print(f"\n统计: {manager.get_statistics()}")
