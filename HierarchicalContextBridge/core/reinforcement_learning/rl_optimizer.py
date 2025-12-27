#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HCB框架 - 强化学习优化器
Hierarchical Context Bridge - Reinforcement Learning Optimizer

实现：
- 多臂老虎机算法 (LinUCB)
- Q-Learning参数更新
- 学习参数自优化
- 探索vs利用策略

专利技术：基于分层上下文与全局桥接调度的智能体协作系统
"""

import json
import math
import random
import logging
import sqlite3
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum
from pathlib import Path
import numpy as np


class RewardSignal(Enum):
    """奖励信号"""
    VERY_POSITIVE = 2.0
    POSITIVE = 1.0
    NEUTRAL = 0.0
    NEGATIVE = -1.0
    VERY_NEGATIVE = -2.0


@dataclass
class LearningState:
    """学习状态表示"""
    state_id: str
    features: Dict[str, float]
    q_value: float = 0.0
    exploration_count: int = 0
    exploitation_count: int = 0
    last_reward: float = 0.0
    confidence: float = 0.5

    def to_vector(self) -> np.ndarray:
        """转换为特征向量"""
        return np.array(list(self.features.values()))


@dataclass
class LearningAction:
    """学习动作"""
    action_id: str
    action_type: str  # recommend, retrieve, rank, filter
    parameters: Dict[str, Any]
    expected_reward: float = 0.0
    confidence: float = 0.5


@dataclass
class TrainingData:
    """
    训练数据结构

    专利权利要求10: 包含状态、动作、策略概率、优势函数和追踪标识
    """
    trace_id: str
    state: Dict[str, float]
    action: str
    logit: List[float]  # 策略概率向量
    advantage: float     # 优势函数值
    reward: float
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class QValueUpdater:
    """
    Q值更新器

    实现Q-Learning更新公式：
    Q(s,a) = Q(s,a) + α[r + γ·max_a'Q(s',a') - Q(s,a)]
    """

    def __init__(self, learning_rate: float = 0.1, discount_factor: float = 0.9):
        self.learning_rate = learning_rate  # α
        self.discount_factor = discount_factor  # γ
        self.logger = logging.getLogger(f"{__name__}.QValueUpdater")

    def update(self, current_q: float, reward: float,
               next_state_max_q: float = 0.0) -> float:
        """
        Q-Learning更新

        公式: Q(s,a) = Q(s,a) + α[r + γ·max_a'Q(s',a') - Q(s,a)]
        """
        temporal_difference = reward + self.discount_factor * next_state_max_q - current_q
        new_q = current_q + self.learning_rate * temporal_difference

        # 限制Q值范围
        return max(-10.0, min(10.0, new_q))

    def calculate_advantage(self, q_value: float, state_value: float) -> float:
        """
        计算优势函数

        专利权利要求10: Advantage = Q(s,a) - V(s)
        """
        return q_value - state_value


class ExplorationStrategy:
    """
    探索策略管理器

    实现ε-贪婪策略和UCB策略
    """

    def __init__(self, initial_epsilon: float = 0.3,
                 min_epsilon: float = 0.05,
                 decay_rate: float = 0.995):
        self.initial_epsilon = initial_epsilon
        self.current_epsilon = initial_epsilon
        self.min_epsilon = min_epsilon
        self.decay_rate = decay_rate
        self.logger = logging.getLogger(f"{__name__}.ExplorationStrategy")

    def should_explore(self) -> bool:
        """ε-贪婪策略：是否探索"""
        return random.random() < self.current_epsilon

    def update_epsilon(self, episode: int):
        """指数衰减更新探索率"""
        self.current_epsilon = max(
            self.min_epsilon,
            self.initial_epsilon * (self.decay_rate ** episode)
        )

    def select_action(self, actions: List[LearningAction],
                      explore: bool = None) -> LearningAction:
        """选择动作"""
        if not actions:
            return None

        if explore is None:
            explore = self.should_explore()

        if explore:
            # 探索：随机选择或选择置信度最低的
            if random.random() < 0.5:
                return random.choice(actions)
            else:
                return min(actions, key=lambda x: x.confidence)
        else:
            # 利用：选择期望奖励最高的
            return max(actions, key=lambda x: x.expected_reward)


class LinUCBBandit:
    """
    LinUCB多臂老虎机算法

    专利权利要求9: 采用多臂老虎机算法进行学习参数自优化
    """

    def __init__(self, alpha: float = 0.1, d: int = 7, lambda_reg: float = 1.0):
        """
        Args:
            alpha: 置信参数，控制探索vs利用平衡
            d: 上下文向量维度
            lambda_reg: 正则化参数λ
        """
        self.alpha = alpha
        self.d = d
        self.lambda_reg = lambda_reg
        self.logger = logging.getLogger(f"{__name__}.LinUCBBandit")

        # 每个arm的参数
        self.arms: Dict[str, Dict[str, Any]] = {}
        self.total_pulls = 0

    def add_arm(self, arm_id: str):
        """添加新的arm"""
        if arm_id not in self.arms:
            self.arms[arm_id] = {
                'A': self.lambda_reg * np.eye(self.d),  # A = λI
                'b': np.zeros(self.d),
                'theta': np.zeros(self.d),
                'pulls': 0,
                'total_reward': 0.0
            }

    def select_arm(self, context: np.ndarray, available_arms: List[str]) -> Tuple[str, float]:
        """
        基于LinUCB选择arm

        UCB公式: p_a = θ_a^T·x + α·√(x^T·A_a^(-1)·x)
        """
        if not available_arms:
            raise ValueError("No available arms")

        best_arm = None
        best_ucb = -np.inf

        for arm_id in available_arms:
            if arm_id not in self.arms:
                self.add_arm(arm_id)

            arm = self.arms[arm_id]

            try:
                A_inv = np.linalg.inv(arm['A'])
                theta = A_inv @ arm['b']
                arm['theta'] = theta

                # UCB值
                expected_reward = theta.T @ context
                confidence_width = self.alpha * np.sqrt(context.T @ A_inv @ context)
                ucb = expected_reward + confidence_width

            except np.linalg.LinAlgError:
                ucb = 0.0

            if ucb > best_ucb:
                best_ucb = ucb
                best_arm = arm_id

        self.total_pulls += 1
        self.arms[best_arm]['pulls'] += 1

        return best_arm, float(best_ucb)

    def update(self, arm_id: str, context: np.ndarray, reward: float):
        """更新arm参数"""
        if arm_id not in self.arms:
            self.add_arm(arm_id)

        arm = self.arms[arm_id]
        arm['A'] += np.outer(context, context)
        arm['b'] += reward * context
        arm['total_reward'] += reward

    def get_statistics(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            'total_pulls': self.total_pulls,
            'arms': {
                arm_id: {
                    'pulls': arm['pulls'],
                    'avg_reward': arm['total_reward'] / max(1, arm['pulls'])
                }
                for arm_id, arm in self.arms.items()
            }
        }


class RLOptimizer:
    """
    强化学习优化器 - 核心系统

    集成：
    - Q-Learning参数更新
    - LinUCB多臂老虎机
    - 探索策略管理
    - 学习参数自优化
    """

    def __init__(self, db_path: str = None):
        self.db_path = Path(db_path or "rl_optimizer.db")
        self.logger = logging.getLogger(f"{__name__}.RLOptimizer")

        # 核心组件
        self.q_updater = QValueUpdater()
        self.exploration = ExplorationStrategy()
        self.bandit = LinUCBBandit()

        # 状态管理
        self.states: Dict[str, LearningState] = {}
        self.training_data: List[TrainingData] = []

        # 统计
        self.episode_count = 0
        self.total_reward = 0.0

        # 初始化数据库
        self._init_database()

        self.logger.info("✅ 强化学习优化器初始化完成")

    def _init_database(self):
        """初始化数据库"""
        with sqlite3.connect(self.db_path) as conn:
            # 学习状态表
            conn.execute("""
                CREATE TABLE IF NOT EXISTS learning_states (
                    state_id TEXT PRIMARY KEY,
                    features TEXT NOT NULL,
                    q_value REAL DEFAULT 0.0,
                    exploration_count INTEGER DEFAULT 0,
                    exploitation_count INTEGER DEFAULT 0,
                    last_reward REAL DEFAULT 0.0,
                    confidence REAL DEFAULT 0.5,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 训练数据表
            conn.execute("""
                CREATE TABLE IF NOT EXISTS training_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    trace_id TEXT NOT NULL,
                    state TEXT NOT NULL,
                    action TEXT NOT NULL,
                    logit TEXT NOT NULL,
                    advantage REAL NOT NULL,
                    reward REAL NOT NULL,
                    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # 学习统计表
            conn.execute("""
                CREATE TABLE IF NOT EXISTS learning_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    episode_count INTEGER,
                    total_reward REAL,
                    avg_reward REAL,
                    epsilon REAL,
                    learning_rate REAL,
                    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)

    def learn(self, state: LearningState, action: LearningAction,
              reward: float, next_state: Optional[LearningState] = None,
              trace_id: str = None) -> float:
        """
        执行一步学习

        1. 更新Q值
        2. 更新Bandit参数
        3. 记录训练数据
        4. 调整探索率
        """
        # 获取下一状态最大Q值
        next_max_q = next_state.q_value if next_state else 0.0

        # Q-Learning更新
        new_q = self.q_updater.update(state.q_value, reward, next_max_q)
        old_q = state.q_value
        state.q_value = new_q
        state.last_reward = reward

        # 更新探索/利用计数
        if self.exploration.should_explore():
            state.exploration_count += 1
        else:
            state.exploitation_count += 1

        # 更新置信度
        state.confidence = min(1.0, state.confidence + 0.05 if reward > 0 else
                              max(0.0, state.confidence - 0.03))

        # 更新Bandit
        context = state.to_vector()
        if len(context) == self.bandit.d:
            self.bandit.update(action.action_id, context, reward)

        # 计算优势函数
        advantage = self.q_updater.calculate_advantage(new_q, old_q)

        # 记录训练数据
        training_record = TrainingData(
            trace_id=trace_id or f"trace_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            state=state.features,
            action=action.action_id,
            logit=[action.expected_reward, action.confidence],
            advantage=advantage,
            reward=reward
        )
        self.training_data.append(training_record)
        self._save_training_data(training_record)

        # 更新统计
        self.episode_count += 1
        self.total_reward += reward
        self.exploration.update_epsilon(self.episode_count)

        # 保存状态
        self.states[state.state_id] = state
        self._save_state(state)

        self.logger.debug(f"✅ 学习完成: Q={new_q:.3f}, reward={reward:.3f}")
        return new_q

    def select_action(self, state: LearningState,
                      available_actions: List[LearningAction]) -> LearningAction:
        """
        选择动作

        结合LinUCB和ε-贪婪策略
        """
        context = state.to_vector()

        # 如果维度匹配，使用LinUCB
        if len(context) == self.bandit.d:
            arm_ids = [a.action_id for a in available_actions]
            selected_arm, ucb = self.bandit.select_arm(context, arm_ids)

            for action in available_actions:
                if action.action_id == selected_arm:
                    action.expected_reward = ucb
                    return action

        # 否则使用ε-贪婪
        return self.exploration.select_action(available_actions)

    def optimize_parameters(self) -> Dict[str, Any]:
        """
        优化学习参数

        专利权利要求9: 学习参数自优化
        """
        optimization_result = {}

        # 自适应学习率
        if self.episode_count > 100:
            avg_reward = self.total_reward / self.episode_count
            if avg_reward < 0:
                # 性能不佳，增加学习率
                self.q_updater.learning_rate = min(0.5, self.q_updater.learning_rate * 1.1)
                optimization_result['learning_rate_action'] = 'increased'
            elif avg_reward > 0.5:
                # 性能良好，降低学习率以稳定
                self.q_updater.learning_rate = max(0.01, self.q_updater.learning_rate * 0.95)
                optimization_result['learning_rate_action'] = 'decreased'

        # 自适应探索率
        exploration_ratio = sum(s.exploration_count for s in self.states.values()) / \
                           max(1, sum(s.exploration_count + s.exploitation_count
                                      for s in self.states.values()))

        if exploration_ratio < 0.1:
            self.exploration.current_epsilon = max(0.15, self.exploration.current_epsilon)
            optimization_result['exploration_action'] = 'increased'

        optimization_result['current_learning_rate'] = self.q_updater.learning_rate
        optimization_result['current_epsilon'] = self.exploration.current_epsilon

        self.logger.info(f"✅ 参数优化完成: {optimization_result}")
        return optimization_result

    def export_training_data(self) -> List[Dict[str, Any]]:
        """
        导出训练数据

        专利权利要求10: 强化学习数据标准化导出接口
        """
        return [
            {
                'trace_id': td.trace_id,
                'state': td.state,
                'action': td.action,
                'logit': td.logit,
                'advantage': td.advantage,
                'reward': td.reward,
                'timestamp': td.timestamp
            }
            for td in self.training_data
        ]

    def _save_state(self, state: LearningState):
        """保存状态到数据库"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO learning_states
                (state_id, features, q_value, exploration_count, exploitation_count,
                 last_reward, confidence, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                state.state_id, json.dumps(state.features), state.q_value,
                state.exploration_count, state.exploitation_count,
                state.last_reward, state.confidence, datetime.now().isoformat()
            ))

    def _save_training_data(self, data: TrainingData):
        """保存训练数据"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO training_data
                (trace_id, state, action, logit, advantage, reward, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                data.trace_id, json.dumps(data.state), data.action,
                json.dumps(data.logit), data.advantage, data.reward, data.timestamp
            ))

    def get_statistics(self) -> Dict[str, Any]:
        """获取学习统计"""
        return {
            'episode_count': self.episode_count,
            'total_reward': self.total_reward,
            'avg_reward': self.total_reward / max(1, self.episode_count),
            'current_epsilon': self.exploration.current_epsilon,
            'learning_rate': self.q_updater.learning_rate,
            'discount_factor': self.q_updater.discount_factor,
            'states_count': len(self.states),
            'training_data_count': len(self.training_data),
            'bandit_stats': self.bandit.get_statistics()
        }


# 便捷函数
def create_optimizer(db_path: str = None) -> RLOptimizer:
    """创建强化学习优化器"""
    return RLOptimizer(db_path)


if __name__ == "__main__":
    # 示例用法
    optimizer = RLOptimizer("./test_rl.db")

    # 创建状态
    state1 = LearningState(
        state_id="state_001",
        features={
            "task_complexity": 0.7,
            "priority": 0.8,
            "load": 0.3,
            "capability_match": 0.9,
            "success_rate": 0.85,
            "response_time": 0.4,
            "queue_length": 0.2
        }
    )

    # 创建动作
    action1 = LearningAction(
        action_id="action_route_worker1",
        action_type="route",
        parameters={"worker_id": "worker_1"}
    )

    # 执行学习
    new_q = optimizer.learn(state1, action1, reward=0.8, trace_id="trace_demo_001")

    print(f"学习后Q值: {new_q:.3f}")
    print(f"统计: {json.dumps(optimizer.get_statistics(), indent=2)}")

    # 参数优化
    opt_result = optimizer.optimize_parameters()
    print(f"优化结果: {opt_result}")

    # 导出训练数据
    training_data = optimizer.export_training_data()
    print(f"训练数据条数: {len(training_data)}")
