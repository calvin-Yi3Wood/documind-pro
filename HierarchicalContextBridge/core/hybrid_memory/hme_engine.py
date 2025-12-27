#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HCB框架 - 混合记忆引擎(HME)
Hierarchical Context Bridge - Hybrid Memory Engine

实现三层融合存储：
- SQL结构化存储 - 任务主表、依赖关系、权限
- 向量检索存储 - 语义相似度搜索
- 事件溯源日志 - 可追溯的执行轨迹

专利技术：基于分层上下文与全局桥接调度的智能体协作系统
"""

import json
import math
import sqlite3
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from pathlib import Path
from enum import Enum
import numpy as np


class MemoryType(Enum):
    """记忆类型"""
    TASK = "task"              # 任务记录
    DECISION = "decision"      # 决策记录
    FACT = "fact"              # 事实/知识
    PLAN = "plan"              # 计划
    ERROR = "error"            # 错误记录
    CONVERSATION = "conversation"  # 对话记录


@dataclass
class MemoryRecord:
    """记忆记录"""
    id: str
    content: str
    memory_type: MemoryType
    project_id: str
    role: str

    # SQL存储字段
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    source: str = "user"
    metadata: Dict[str, Any] = field(default_factory=dict)

    # 向量检索字段
    vector_embedding: Optional[List[float]] = None
    semantic_tags: List[str] = field(default_factory=list)

    # 事件溯源字段
    event_sequence: int = 0
    parent_event_id: Optional[str] = None
    action_type: str = "create"

    # 检索评分相关
    importance_score: float = 0.5
    authority_score: float = 0.5
    risk_score: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['memory_type'] = self.memory_type.value
        return result


@dataclass
class RetrievalResult:
    """检索结果"""
    record: MemoryRecord
    relevance_score: float      # 相关性 Rel
    recency_score: float        # 时效性 Rec
    authority_score: float      # 权威度 Auth
    risk_score: float           # 风险 Risk
    total_score: float          # 综合评分 S


class VectorStore:
    """轻量级向量存储（可替换为外部向量数据库）"""

    def __init__(self):
        self.vectors: Dict[str, np.ndarray] = {}
        self.logger = logging.getLogger(f"{__name__}.VectorStore")

    def add_vector(self, record_id: str, vector: List[float]):
        """添加向量"""
        self.vectors[record_id] = np.array(vector)

    def search(self, query_vector: List[float], top_k: int = 10) -> List[Tuple[str, float]]:
        """余弦相似度搜索"""
        if not self.vectors:
            return []

        query = np.array(query_vector)
        results = []

        for record_id, vec in self.vectors.items():
            # 余弦相似度
            similarity = np.dot(query, vec) / (np.linalg.norm(query) * np.linalg.norm(vec) + 1e-8)
            results.append((record_id, float(similarity)))

        # 按相似度排序
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]


class EventSourcingLog:
    """事件溯源日志"""

    def __init__(self, db_path: str):
        self.db_path = Path(db_path)
        self._init_database()
        self.logger = logging.getLogger(f"{__name__}.EventSourcingLog")

    def _init_database(self):
        """初始化事件日志表"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS event_log (
                    event_id TEXT PRIMARY KEY,
                    record_id TEXT NOT NULL,
                    action_type TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    sequence_number INTEGER NOT NULL,
                    parent_event_id TEXT,
                    payload TEXT NOT NULL,
                    actor TEXT,
                    trace_id TEXT
                )
            """)

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_event_record
                ON event_log(record_id)
            """)

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_event_trace
                ON event_log(trace_id)
            """)

    def log_event(
        self,
        record_id: str,
        action_type: str,
        payload: Dict[str, Any],
        actor: str = None,
        trace_id: str = None,
        parent_event_id: str = None
    ) -> str:
        """记录事件"""
        event_id = hashlib.sha256(
            f"{record_id}_{action_type}_{datetime.now().isoformat()}".encode()
        ).hexdigest()[:16]

        with sqlite3.connect(self.db_path) as conn:
            # 获取序列号
            cursor = conn.execute(
                "SELECT MAX(sequence_number) FROM event_log WHERE record_id = ?",
                (record_id,)
            )
            max_seq = cursor.fetchone()[0] or 0

            conn.execute("""
                INSERT INTO event_log
                (event_id, record_id, action_type, timestamp, sequence_number,
                 parent_event_id, payload, actor, trace_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event_id, record_id, action_type, datetime.now().isoformat(),
                max_seq + 1, parent_event_id, json.dumps(payload), actor, trace_id
            ))

        self.logger.debug(f"✅ 事件记录: {event_id}")
        return event_id

    def get_record_history(self, record_id: str) -> List[Dict[str, Any]]:
        """获取记录的完整历史"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM event_log
                WHERE record_id = ?
                ORDER BY sequence_number ASC
            """, (record_id,))

            return [dict(row) for row in cursor.fetchall()]

    def get_trace(self, trace_id: str) -> List[Dict[str, Any]]:
        """获取完整追踪链"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute("""
                SELECT * FROM event_log
                WHERE trace_id = ?
                ORDER BY timestamp ASC
            """, (trace_id,))

            return [dict(row) for row in cursor.fetchall()]


class HybridMemoryEngine:
    """
    混合记忆引擎 - 三层融合存储

    实现专利中的混合记忆引擎：
    - SQL存储：结构化任务数据
    - 向量检索：语义相似度搜索
    - 事件溯源：可追溯执行轨迹
    """

    def __init__(self, db_path: str = None):
        self.db_path = Path(db_path or "hme_memory.db")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        self.logger = logging.getLogger(f"{__name__}.HybridMemoryEngine")

        # 初始化三层存储
        self._init_sql_storage()
        self.vector_store = VectorStore()
        self.event_log = EventSourcingLog(str(self.db_path))

        # 检索评分权重 (专利公式 S = α·Rel+β·Rec +γ·Auth−δ·Risk)
        self.scoring_weights = {
            "alpha": 0.40,  # 相关性权重
            "beta": 0.30,   # 时效性权重
            "gamma": 0.20,  # 权威度权重
            "delta": 0.10   # 风险惩罚权重
        }

        self.logger.info("✅ 混合记忆引擎初始化完成")

    def _init_sql_storage(self):
        """初始化SQL存储"""
        with sqlite3.connect(self.db_path) as conn:
            # 记忆主表
            conn.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id TEXT PRIMARY KEY,
                    content TEXT NOT NULL,
                    memory_type TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    source TEXT DEFAULT 'user',
                    metadata TEXT,
                    importance_score REAL DEFAULT 0.5,
                    authority_score REAL DEFAULT 0.5,
                    risk_score REAL DEFAULT 0.0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 权限表
            conn.execute("""
                CREATE TABLE IF NOT EXISTS permissions (
                    record_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    permission_level INTEGER NOT NULL,
                    granted_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (record_id, role)
                )
            """)

            # 依赖关系表
            conn.execute("""
                CREATE TABLE IF NOT EXISTS dependencies (
                    source_id TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    dependency_type TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (source_id, target_id)
                )
            """)

            conn.execute("CREATE INDEX IF NOT EXISTS idx_mem_project ON memories(project_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_mem_type ON memories(memory_type)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_mem_role ON memories(role)")

    def store(
        self,
        content: str,
        memory_type: MemoryType,
        project_id: str,
        role: str,
        metadata: Dict[str, Any] = None,
        vector_embedding: List[float] = None,
        importance: float = 0.5,
        actor: str = None,
        trace_id: str = None
    ) -> MemoryRecord:
        """
        存储记忆记录

        三层融合存储：
        1. SQL存储结构化数据
        2. 向量存储语义嵌入
        3. 事件日志记录操作
        """
        # 生成ID
        record_id = hashlib.sha256(
            f"{content[:50]}_{project_id}_{datetime.now().isoformat()}".encode()
        ).hexdigest()[:16]

        record = MemoryRecord(
            id=record_id,
            content=content,
            memory_type=memory_type,
            project_id=project_id,
            role=role,
            metadata=metadata or {},
            vector_embedding=vector_embedding,
            importance_score=importance,
            authority_score=self._calculate_authority(role),
            risk_score=0.0
        )

        # 1. SQL存储
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO memories
                (id, content, memory_type, project_id, role, timestamp,
                 source, metadata, importance_score, authority_score, risk_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record.id, record.content, record.memory_type.value,
                record.project_id, record.role, record.timestamp,
                record.source, json.dumps(record.metadata),
                record.importance_score, record.authority_score, record.risk_score
            ))

        # 2. 向量存储
        if vector_embedding:
            self.vector_store.add_vector(record_id, vector_embedding)

        # 3. 事件日志
        self.event_log.log_event(
            record_id=record_id,
            action_type="create",
            payload={"content_preview": content[:100], "type": memory_type.value},
            actor=actor,
            trace_id=trace_id
        )

        self.logger.debug(f"✅ 存储记忆: {record_id}")
        return record

    def retrieve(
        self,
        query: str,
        query_vector: List[float] = None,
        project_id: str = None,
        memory_type: MemoryType = None,
        role: str = None,
        top_k: int = 10
    ) -> List[RetrievalResult]:
        """
        检索记忆

        综合评分公式 (专利权利要求6):
        S = α·Rel + β·Rec + γ·Auth − δ·Risk

        Args:
            query: 文本查询
            query_vector: 查询向量（可选，用于语义搜索）
            project_id: 项目过滤
            memory_type: 类型过滤
            role: 角色过滤
            top_k: 返回数量
        """
        results = []

        # SQL过滤查询
        sql_conditions = ["1=1"]
        params = []

        if project_id:
            sql_conditions.append("project_id = ?")
            params.append(project_id)

        if memory_type:
            sql_conditions.append("memory_type = ?")
            params.append(memory_type.value)

        if role:
            sql_conditions.append("role = ?")
            params.append(role)

        if query:
            sql_conditions.append("content LIKE ?")
            params.append(f"%{query}%")

        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(f"""
                SELECT * FROM memories
                WHERE {' AND '.join(sql_conditions)}
                ORDER BY timestamp DESC
                LIMIT ?
            """, params + [top_k * 3])  # 多取一些用于重排序

            candidates = []
            for row in cursor.fetchall():
                record = MemoryRecord(
                    id=row['id'],
                    content=row['content'],
                    memory_type=MemoryType(row['memory_type']),
                    project_id=row['project_id'],
                    role=row['role'],
                    timestamp=row['timestamp'],
                    source=row['source'],
                    metadata=json.loads(row['metadata']) if row['metadata'] else {},
                    importance_score=row['importance_score'],
                    authority_score=row['authority_score'],
                    risk_score=row['risk_score']
                )
                candidates.append(record)

        # 向量相似度搜索
        vector_scores = {}
        if query_vector and self.vector_store.vectors:
            vector_results = self.vector_store.search(query_vector, top_k * 2)
            vector_scores = {rid: score for rid, score in vector_results}

        # 计算综合评分
        for record in candidates:
            # 1. 相关性评分 Rel
            relevance = self._calculate_relevance(query, record, vector_scores.get(record.id, 0))

            # 2. 时效性评分 Rec (指数衰减)
            recency = self._calculate_recency(record.timestamp)

            # 3. 权威度评分 Auth
            authority = record.authority_score

            # 4. 风险评分 Risk
            risk = record.risk_score

            # 综合评分 S = α·Rel + β·Rec + γ·Auth − δ·Risk
            total_score = (
                self.scoring_weights["alpha"] * relevance +
                self.scoring_weights["beta"] * recency +
                self.scoring_weights["gamma"] * authority -
                self.scoring_weights["delta"] * risk
            )

            results.append(RetrievalResult(
                record=record,
                relevance_score=relevance,
                recency_score=recency,
                authority_score=authority,
                risk_score=risk,
                total_score=total_score
            ))

        # 按综合评分排序
        results.sort(key=lambda x: x.total_score, reverse=True)
        return results[:top_k]

    def _calculate_relevance(self, query: str, record: MemoryRecord,
                              vector_similarity: float = 0) -> float:
        """计算相关性评分"""
        # 关键词匹配分数
        query_words = set(query.lower().split())
        content_words = set(record.content.lower().split())
        keyword_score = len(query_words & content_words) / max(len(query_words), 1)

        # 综合向量相似度和关键词匹配
        if vector_similarity > 0:
            return 0.6 * vector_similarity + 0.4 * keyword_score
        return keyword_score

    def _calculate_recency(self, timestamp: str) -> float:
        """
        计算时效性评分 - 指数衰减函数

        专利权利要求5: freshness = e^(-0.1×k)
        其中k是时间差（小时）
        """
        try:
            record_time = datetime.fromisoformat(timestamp)
            hours_old = (datetime.now() - record_time).total_seconds() / 3600
            # 指数衰减，半衰期约7小时
            return math.exp(-0.1 * hours_old)
        except:
            return 0.5

    def _calculate_authority(self, role: str) -> float:
        """计算权威度评分"""
        authority_weights = {
            "architect": 0.9,
            "analyst": 0.85,
            "developer": 0.8,
            "quality": 0.75,
            "designer": 0.7,
            "docs": 0.65,
            "system": 1.0
        }
        return authority_weights.get(role, 0.5)

    def update_scoring_weights(self, weights: Dict[str, float]):
        """更新评分权重"""
        self.scoring_weights.update(weights)
        self.logger.info(f"✅ 评分权重更新: {self.scoring_weights}")

    def get_record_trace(self, record_id: str) -> List[Dict[str, Any]]:
        """获取记录的完整事件追踪"""
        return self.event_log.get_record_history(record_id)

    def get_statistics(self) -> Dict[str, Any]:
        """获取统计信息"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM memories")
            total_records = cursor.fetchone()[0]

            cursor = conn.execute("""
                SELECT memory_type, COUNT(*) FROM memories GROUP BY memory_type
            """)
            by_type = {row[0]: row[1] for row in cursor.fetchall()}

        return {
            "total_records": total_records,
            "by_type": by_type,
            "vector_records": len(self.vector_store.vectors),
            "scoring_weights": self.scoring_weights
        }


# 便捷函数
def create_hme(db_path: str = None) -> HybridMemoryEngine:
    """创建混合记忆引擎实例"""
    return HybridMemoryEngine(db_path)


if __name__ == "__main__":
    # 示例用法
    hme = HybridMemoryEngine("./test_hme.db")

    # 存储记忆
    record1 = hme.store(
        content="用户需要一个高性能的推荐系统",
        memory_type=MemoryType.TASK,
        project_id="proj_001",
        role="architect",
        importance=0.8
    )

    record2 = hme.store(
        content="推荐系统采用协同过滤算法",
        memory_type=MemoryType.DECISION,
        project_id="proj_001",
        role="analyst",
        importance=0.7
    )

    # 检索
    results = hme.retrieve(
        query="推荐系统",
        project_id="proj_001",
        top_k=5
    )

    print("检索结果:")
    for r in results:
        print(f"  [{r.total_score:.3f}] {r.record.content[:50]}...")
        print(f"    Rel={r.relevance_score:.2f} Rec={r.recency_score:.2f} "
              f"Auth={r.authority_score:.2f} Risk={r.risk_score:.2f}")

    print(f"\n统计: {hme.get_statistics()}")
