# HCB 框架架构详解

## 数据流向与工作流程

本文档详细说明 HierarchicalContextBridge 框架中用户提示词从输入到处理的完整数据流向。

---

## 整体架构图

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     HCB 框架数据流向图                                      │
└────────────────────────────────────────────────────────────────────────────┘

用户输入提示词
      │
      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  【第1步】统一记忆管理器入口                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                             │
│  store_memory(content, content_type, role, project_id, source, metadata)   │
│                                                                             │
│  自动计算:                                                                   │
│  • importance_score = _calculate_importance()  # 重要性评分                  │
│  • context_relevance = _calculate_relevance()  # 上下文相关性               │
│  • injection_priority = _calculate_priority()  # 注入优先级(1-10)           │
│                                                                             │
│  生成唯一 memory_id = MD5(content + timestamp)                              │
└─────────────────────────────────────────────────────────────────────────────┘
      │
      │ 并行写入三层存储
      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  【第2步】三层并行存储                                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                             │
│  tasks = [                                                                  │
│      hme_layer.store(record),     # → hme_memories.db                      │
│      cco_layer.store(record),     # → cco_contexts.db                      │
│      rl_layer.store(record)       # → rl_optimization.db                   │
│  ]                                                                          │
│  await asyncio.gather(*tasks)     # 并行执行                                │
│                                                                             │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                  │
│  │ HME混合记忆层  │ │ CCO上下文层    │ │ RL强化学习层   │                  │
│  ├────────────────┤ ├────────────────┤ ├────────────────┤                  │
│  │• SQL结构存储   │ │• 上下文缓存    │ │• Q值存储       │                  │
│  │• 向量嵌入索引  │ │• 注入优先级    │ │• 反馈记录      │                  │
│  │• L1-L4分层标记 │ │• 访问统计      │ │• 使用次数      │                  │
│  │• 时间戳索引    │ │• TTL过期管理   │ │• 成功率统计    │                  │
│  └────────────────┘ └────────────────┘ └────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘
      │
      │ 当用户发起新查询时
      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  【第3步】智能上下文注入 (CCO层)                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                             │
│  inject_smart_context(user_query, project_id)                               │
│                                                                             │
│  1. 检索相关上下文:                                                          │
│     SELECT * FROM cco_contexts                                              │
│     WHERE (content LIKE '%{query}%' OR metadata LIKE '%{query}%')           │
│     ORDER BY injection_priority ASC, context_relevance DESC                 │
│                                                                             │
│  2. 应用评分公式:                                                            │
│     S = α·Relevance + β·Recency + γ·Authority − δ·Risk                     │
│     其中 Recency = e^(-0.1×k)  (k为距今天数)                                 │
│                                                                             │
│  3. 构建注入内容:                                                            │
│     === 相关上下文记忆 ===                                                   │
│     1. [角色|类型|相关性|时间] 内容摘要...                                    │
│     2. ...                                                                  │
│     === 上下文共{N}条，智能注入完成 ===                                       │
│                                                                             │
│  4. 更新访问统计: access_count += 1, last_accessed = now()                  │
└─────────────────────────────────────────────────────────────────────────────┘
      │
      │ 需要跨角色/跨节点信息时
      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  【第4步】全局桥接调度器 (GBS)                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                             │
│  bridge(caller, target_role, query, intent, reason, scope, consent_token)  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 1. 紧急检查 _check_emergency_conditions()                            │   │
│  │    • 检查泄露率是否超过阈值 (默认0.1%)                                │   │
│  │    • 检查近1小时违规次数 (默认上限10次)                               │   │
│  │    • 触发条件满足时启动紧急停止                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 2. 授权验证 _validate_token_and_policy()                             │   │
│  │    • JWT令牌解析和验证                                                │   │
│  │    • 检查 caller_role 与 target_role 匹配                            │   │
│  │    • 验证 actions 包含 'bridge' 权限                                 │   │
│  │    • ABAC策略评估 (Subject, Object, Action, Context)                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 3. 受控数据查询 _query_with_guard()                                  │   │
│  │    • 通过 MemoryAccessGuard 安全访问                                  │   │
│  │    • scope=summary 时只返回摘要，不暴露原文                           │   │
│  │    • scope=fulltext 需要额外的 allow_fulltext 权限                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 4. 完整审计记录 _log_audit()                                         │   │
│  │    • 记录: caller, target, query_hash, intent, success               │   │
│  │    • LeakStop指标: is_cross_role, is_unauthorized_access             │   │
│  │    • 脱敏统计: redaction_count, snippet_chars                        │   │
│  │    • 存储到: bridge_audit.db                                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
      │
      │ 上下文隔离控制
      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  【第5步】分层上下文隔离 (L1-L4)                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ L1 系统级 (ContextLevel.L1_SYSTEM)                                   │   │
│  │   作用域: 全局 (所有项目、所有角色可见)                               │   │
│  │   TTL: 永久                                                          │   │
│  │   权限: write_public (仅特权角色可写)                                 │   │
│  │   存储: public_context.json (系统根目录)                              │   │
│  │   用途: 系统提示词、全局配置、共享知识库                              │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ L2 项目级 (ContextLevel.L2_PROJECT)                                  │   │
│  │   作用域: 项目内 (同项目所有角色可见)                                 │   │
│  │   TTL: 2小时 (可配置)                                                │   │
│  │   权限: read_all_shared, write_shared                                │   │
│  │   存储: roles/{role}/shared/                                         │   │
│  │   用途: 项目上下文、团队共享知识、协作信息                            │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ L3 节点级 (ContextLevel.L3_NODE) ⚠️ 核心隔离层                       │   │
│  │   作用域: 仅当前节点/角色可见                                         │   │
│  │   TTL: 30分钟 (可配置)                                               │   │
│  │   权限: read_shared(仅自己), write_private                           │   │
│  │   存储: roles/{role}/context/role_context.json                       │   │
│  │   用途: 任务提示词、角色专属配置、私有记忆                            │   │
│  │   ⚠️ 关键特性: 不同角色的提示词在此层完全隔离，互不可见              │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ L4 会话级 (ContextLevel.L4_SESSION)                                  │   │
│  │   作用域: 仅当前会话可见                                              │   │
│  │   TTL: 10分钟 (或会话结束)                                           │   │
│  │   权限: 完全私有                                                      │   │
│  │   存储: roles/{role}/sessions/{session_id}/                          │   │
│  │   用途: 临时对话记录、会话状态、中间结果                              │   │
│  │   自动清理: cleanup_inactive_sessions(max_idle=3600秒)               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  访问控制检查流程:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ _can_access_shared_context(requesting_role, target_role, project)  │    │
│  │                                                                     │    │
│  │ if 'read_all_shared' in permissions:                               │    │
│  │     return True  # 可访问所有共享上下文                              │    │
│  │ if 'read_shared' in permissions and same_role:                     │    │
│  │     return True  # 仅可访问自己角色的共享上下文                      │    │
│  │ return False                                                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
      │
      │ 响应完成后，用户反馈触发学习
      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  【第6步】强化学习优化 (RL)                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                             │
│  process_feedback(feedback: UserFeedback)                                   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Q-Learning 更新公式:                                                 │   │
│  │                                                                      │   │
│  │   Q(s,a) = Q(s,a) + α[r + γ·max_a'Q(s',a') - Q(s,a)]                │   │
│  │                                                                      │   │
│  │   其中:                                                              │   │
│  │   • α = 学习率 (默认0.1)                                            │   │
│  │   • γ = 折扣因子 (默认0.9)                                          │   │
│  │   • r = 即时奖励                                                    │   │
│  │   • max_a'Q(s',a') = 下一状态的最大Q值                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  奖励计算 calculate_reward():                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ base_reward = reward_signal.value                                   │   │
│  │                                                                      │   │
│  │ # 反馈类型权重                                                       │   │
│  │ type_weights = {                                                    │   │
│  │     RELEVANCE: 1.0,      # 相关性                                   │   │
│  │     USEFULNESS: 1.2,     # 有用性 (最高权重)                        │   │
│  │     ACCURACY: 1.1,       # 准确性                                   │   │
│  │     COMPLETENESS: 0.9,   # 完整性                                   │   │
│  │     TIMELINESS: 0.8      # 及时性                                   │   │
│  │ }                                                                   │   │
│  │                                                                      │   │
│  │ # 调整因子                                                           │   │
│  │ if task_completion: reward *= 1.3    # 任务完成加成                 │   │
│  │ if response_time > 5s: reward *= 0.8 # 响应慢惩罚                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  探索策略 (ε-greedy):                                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ epsilon = max(min_epsilon, initial_epsilon × decay_rate^episode)    │   │
│  │                                                                      │   │
│  │ if random() < epsilon:                                              │   │
│  │     # 探索模式: 随机选择 or 选择置信度最低的动作                     │   │
│  │     action = random.choice(actions) or min(actions, key=confidence) │   │
│  │ else:                                                               │   │
│  │     # 利用模式: 按Q值排序选择最优                                    │   │
│  │     action = max(actions, key=q_value)                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
      │
      │ 复杂任务需要分解时
      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  【可选】DAG任务调度                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                             │
│  任务状态机:                                                                 │
│  ┌─────────┐    依赖满足    ┌─────────┐    开始执行    ┌─────────┐          │
│  │ PENDING │ ────────────→ │  READY  │ ────────────→ │ RUNNING │          │
│  └─────────┘                └─────────┘                └────┬────┘          │
│                                                              │              │
│                              ┌────────────────┬──────────────┤              │
│                              ▼                ▼              ▼              │
│                        ┌─────────┐      ┌─────────┐    ┌─────────┐          │
│                        │ SUCCESS │      │ FAILED  │    │  RETRY  │          │
│                        └─────────┘      └─────────┘    └────┬────┘          │
│                                                              │              │
│                                              重试次数 < max_retries         │
│                                                              │              │
│                                              └───────────────┘              │
│                                                                             │
│  调度流程:                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 1. detect_cycles()         → 检测循环依赖 (DFS算法)                  │   │
│  │ 2. _topological_sort()     → Kahn算法拓扑排序                        │   │
│  │ 3. get_ready_tasks()       → 获取依赖已满足的任务                    │   │
│  │ 4. _analyze_parallel_groups() → 识别可并行任务组                     │   │
│  │ 5. _estimate_completion_time() → 预估完成时间                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  零延迟触发机制:                                                             │
│  当任务状态从 RUNNING → SUCCESS 时，自动检查所有依赖该任务的下游任务，       │
│  若其所有依赖均已满足，立即将其状态更新为 READY，实现即时触发。              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 核心数据结构

### 1. 统一记忆记录 (UnifiedMemoryRecord)

```python
@dataclass
class UnifiedMemoryRecord:
    # 基础字段
    id: str                          # 唯一标识 (MD5 hash)
    content: str                     # 内容文本
    content_type: str                # 类型: conversation/decision/fact/plan/code/error
    role: str                        # 来源角色
    project_id: str                  # 所属项目
    timestamp: str                   # ISO格式时间戳
    source: str                      # 来源标识
    metadata: Dict[str, Any]         # 扩展元数据

    # HME层字段
    memory_layer: str = "L2"         # 记忆层级: L1/L2/L3/L4
    importance_score: float = 0.5    # 重要性评分 [0,1]
    vector_embedding: List[float]    # 向量嵌入 (384/768维)

    # CCO层字段
    context_relevance: float = 0.5   # 上下文相关性 [0,1]
    injection_priority: int = 5      # 注入优先级 [1-10, 1最高]
    last_accessed: str               # 最后访问时间

    # RL层字段
    feedback_score: float = 0.0      # 累计反馈分数
    usage_count: int = 0             # 使用次数
    success_rate: float = 0.5        # 成功率 [0,1]
```

### 2. 桥接请求 (BridgeRequest)

```python
@dataclass
class BridgeRequest:
    caller: str              # 调用者角色 (canonical key)
    target_role: str         # 目标角色 (canonical key)
    query: str               # 查询内容
    intent: BridgeIntent     # 桥接意图枚举
    reason: str              # 桥接原因 (>=10字符)
    scope: DisclosureScope   # 披露范围: summary/fulltext
    consent_token: str       # JWT授权令牌
```

### 3. 任务节点 (TaskNode)

```python
@dataclass
class TaskNode:
    task_id: str                           # 任务唯一标识
    task_type: str                         # 任务类型
    priority: int                          # 优先级 (越大越高)
    payload: Dict[str, Any]                # 任务负载数据
    dependencies: List[str]                # 依赖的任务ID列表
    dependency_types: Dict[str, DependencyType]  # 依赖类型映射
    state: TaskState                       # 当前状态
    worker_requirements: Dict[str, Any]    # Worker能力要求
    retry_count: int = 0                   # 当前重试次数
    max_retries: int = 3                   # 最大重试次数
```

---

## 关键算法

### 1. 重要性评分算法

```python
def calculate_importance(content: str, content_type: str) -> float:
    base_score = 0.5

    # 内容类型权重
    type_weights = {
        "decision": 0.9,    # 决策类最重要
        "fact": 0.8,        # 事实类次之
        "plan": 0.7,
        "error": 0.6,
        "code": 0.7,
        "conversation": 0.5,
        "debug": 0.4
    }
    base_score += type_weights.get(content_type, 0.5) * 0.3

    # 内容长度影响
    length = len(content)
    if 50 <= length <= 500:
        base_score += 0.2   # 适中长度加分
    elif length > 500:
        base_score += 0.1   # 过长略微加分

    # 关键词检测
    important_keywords = ["错误", "异常", "失败", "成功", "解决",
                         "方案", "决策", "重要", "关键", "核心",
                         "优化", "改进", "bug", "fix", "critical"]
    keyword_count = sum(1 for kw in important_keywords if kw in content)
    base_score += min(keyword_count * 0.05, 0.2)

    return min(1.0, max(0.1, base_score))
```

### 2. 相关性评分公式

```
S = α·Relevance + β·Recency + γ·Authority − δ·Risk

其中:
- Relevance: 查询与内容的语义相似度
- Recency: 时间新鲜度 = e^(-0.1×k), k为距今天数
- Authority: 来源权威性 (system=1.0, expert=0.9, user=0.6, auto=0.4)
- Risk: 风险因子 (敏感信息、过期内容等)

默认权重:
- α = 0.4 (相关性)
- β = 0.3 (新鲜度)
- γ = 0.2 (权威性)
- δ = 0.1 (风险)
```

### 3. Q-Learning更新

```python
def update_q_value(current_q: float, reward: float,
                   next_state_max_q: float = 0.0) -> float:
    """
    Q(s,a) = Q(s,a) + α[r + γ·max_a'Q(s',a') - Q(s,a)]
    """
    alpha = 0.1   # 学习率
    gamma = 0.9   # 折扣因子

    temporal_difference = reward + gamma * next_state_max_q - current_q
    new_q_value = current_q + alpha * temporal_difference

    # 限制Q值范围 [-10, 10]
    return max(-10.0, min(10.0, new_q_value))
```

### 4. 拓扑排序 (Kahn算法)

```python
def topological_sort(tasks: Dict[str, TaskNode],
                     dependency_graph: Dict[str, Set[str]]) -> List[str]:
    # 计算入度
    in_degree = defaultdict(int)
    for task_id in tasks:
        in_degree[task_id] = len(dependency_graph[task_id])

    # 入度为0的节点入队
    queue = deque([tid for tid in tasks if in_degree[tid] == 0])
    result = []

    while queue:
        task_id = queue.popleft()
        result.append(task_id)

        # 更新依赖该任务的其他任务入度
        for dependent in reverse_dependencies[task_id]:
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                queue.append(dependent)

    return result
```

---

## 安全机制

### 1. LeakStop v1 泄露防护

```yaml
紧急停止条件:
  - 泄露率超过阈值: leak_rate > 0.1% (0.001)
  - 近1小时违规超限: violations > 10

监控指标:
  - total_cross_role_attempts: 跨角色访问总次数
  - unauthorized_leaks: 未授权泄露次数
  - leak_rate: 泄露率 = leaks / attempts
  - avg_redactions_per_request: 平均脱敏次数

SLO目标:
  - leak_rate_max: 0.1%
  - avg_latency_max: 150ms
  - avg_redactions_min: 1次/请求
```

### 2. JWT授权验证

```python
# JWT Payload 结构
{
    "tenant": "tenant_id",
    "project": "project_id",
    "caller_role": "analyst",
    "target_role": "developer",
    "scope": "summary",           # summary/fulltext
    "allow_fulltext": false,
    "actions": ["bridge", "read"],
    "intent": "context_research",
    "reason": "需要获取开发者的技术决策记录...",
    "clearance_level": 2,
    "jti": "unique_token_id",
    "exp": 1735000000
}
```

### 3. 权限控制矩阵

| 角色类型 | read_shared | read_all_shared | write_shared | write_private | manage_roles |
|---------|-------------|-----------------|--------------|---------------|--------------|
| PLANNER | ✓ | ✓ | ✓ | ✓ | - |
| DEVELOPER | ✓ | - | - | ✓ | - |
| REVIEWER | ✓ | ✓ | - | ✓ | - |
| ANALYST | ✓ | ✓ | - | ✓ | - |
| COORDINATOR | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 数据库结构

### 1. HME记忆表 (hme_memories)

```sql
CREATE TABLE hme_memories (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    content_type TEXT NOT NULL,
    role TEXT NOT NULL,
    project_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    source TEXT NOT NULL,
    metadata TEXT NOT NULL,           -- JSON
    memory_layer TEXT DEFAULT 'L2',   -- L1/L2/L3/L4
    importance_score REAL DEFAULT 0.5,
    vector_embedding TEXT,            -- JSON array
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hme_project_type ON hme_memories(project_id, content_type);
CREATE INDEX idx_hme_timestamp ON hme_memories(timestamp);
CREATE INDEX idx_hme_importance ON hme_memories(importance_score DESC);
```

### 2. 桥接审计表 (bridge_audit)

```sql
CREATE TABLE bridge_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    caller_role TEXT NOT NULL,
    target_role TEXT NOT NULL,
    query_hash TEXT NOT NULL,          -- SHA256前16位
    intent TEXT NOT NULL,
    reason TEXT NOT NULL,
    disclosure_scope TEXT NOT NULL,    -- summary/fulltext
    consent_token_jti TEXT,
    source_namespaces TEXT,            -- JSON array
    matched_entries INTEGER,
    response_tokens INTEGER,
    processing_time_ms INTEGER,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    -- LeakStop v1 字段
    is_cross_role BOOLEAN DEFAULT 0,
    is_unauthorized_access BOOLEAN DEFAULT 0,
    redaction_count INTEGER DEFAULT 0,
    snippet_chars INTEGER DEFAULT 0,
    policy_decision TEXT,              -- ALLOW/DENY
    leakstop_version TEXT DEFAULT '1.0'
);
```

### 3. RL记忆状态表 (rl_memory_states)

```sql
CREATE TABLE rl_memory_states (
    memory_id TEXT PRIMARY KEY,
    content_features TEXT,             -- JSON
    context_features TEXT,             -- JSON
    quality_scores TEXT,               -- JSON
    usage_stats TEXT,                  -- JSON
    q_value REAL DEFAULT 0.0,
    exploration_count INTEGER DEFAULT 0,
    exploitation_count INTEGER DEFAULT 0,
    last_reward REAL DEFAULT 0.0,
    confidence_score REAL DEFAULT 0.5,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rl_qvalue ON rl_memory_states(q_value DESC);
```

---

## 配置参数

```yaml
# 统一记忆管理器配置
unified_memory:
  base_path: "./unified_memory"
  enable_async: true
  enable_rl_optimization: true
  enable_cco_injection: true
  optimization_interval: 3600      # 1小时
  max_memory_per_layer: 100000
  cache_ttl: 1800                  # 30分钟

# 上下文层级TTL配置
context_ttl:
  L1_SYSTEM: -1                    # 永久
  L2_PROJECT: 7200                 # 2小时
  L3_NODE: 1800                    # 30分钟
  L4_SESSION: 600                  # 10分钟

# RL学习参数
reinforcement_learning:
  learning_rate: 0.1
  discount_factor: 0.9
  initial_epsilon: 0.3
  min_epsilon: 0.05
  decay_rate: 0.995

# 桥接安全配置
bridge_security:
  leak_rate_threshold: 0.001       # 0.1%
  max_violations_per_hour: 10
  monitoring_window_hours: 24
  stats_cache_ttl: 300             # 5分钟
```

---

## 总结

HCB框架通过以下机制实现了专利中描述的核心能力：

1. **分层存储**: 用户输入并行写入HME/CCO/RL三层，确保数据冗余和多维度索引
2. **上下文隔离**: L1-L4四层隔离机制，L3层确保任务节点提示词完全隔离
3. **受控桥接**: 基于JWT+ABAC的跨角色访问控制，配合LeakStop泄露防护
4. **智能学习**: Q-Learning持续优化记忆检索和推荐策略
5. **零延迟触发**: DAG状态机实现任务依赖满足后的即时触发
