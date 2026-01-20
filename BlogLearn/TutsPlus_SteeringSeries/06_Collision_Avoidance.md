---
title: Collision Avoidance (避障)
tags:
  - steering-behaviors
  - game-ai
  - collision
  - raycasting
aliases:
  - Collision Avoidance
  - 避障行为
  - Obstacle Avoidance
created: 2026-01-20
status: complete
---

# Collision Avoidance (避障)

## 概念总结 (Concept Overview)

> [!abstract] 核心思想
> **Collision Avoidance** 通过向前投射"触须 (Feelers)"检测障碍物，一旦检测到就施加侧向推力。这是一种**局部避障**方法，不同于全局寻路 (A*)。

**适用范围:**
- ✅ **动态障碍**: 实时反应，不需要预先计算路径
- ✅ **简单场景**: 开阔空间中的若干障碍
- ❌ **复杂迷宫**: 无法处理 U 形死胡同 (需要 A*)

---

## Raycasting 检测机制

### 触须投射

```mermaid
graph LR
    A[🚗 角色] -->|velocity| B[→]
    B -.ahead.-> C[📍]
    B -.ahead2.-> D[📍]
    
    C -.检测范围.-> E((⭕<br/>障碍物))
    
    style A fill:#e1f5ff
    style C fill:#fff4e1
    style E fill:#ffccbc
```

### 几何检测

```mermaid
graph TD
    A[计算 ahead 向量] --> B{检测交叉}
    B -->|ahead 在圆内?| C[distance ahead, center ≤ radius]
    B -->|ahead2 在圆内?| D[distance ahead2, center ≤ radius]
    B -->|position 在圆内?| E[distance position, center ≤ radius]
    
    C --> F[碰撞!]
    D --> F
    E --> F
    F --> G[选择最近障碍物]
    
    style F fill:#ffccbc
    style G fill:#fff4e1
```

### 公式实现

$$
\vec{ahead} = \vec{position} + \text{normalize}(\vec{velocity}) \times d_{see}
$$

$$
\vec{ahead2} = \vec{position} + \text{normalize}(\vec{velocity}) \times \frac{d_{see}}{2}
$$

```javascript
// 计算触须
let ahead = position.clone().add(
    velocity.clone().normalize().scale(MAX_SEE_AHEAD)
);

let ahead2 = position.clone().add(
    velocity.clone().normalize().scale(MAX_SEE_AHEAD * 0.5)
);

// 检测碰撞 (简化为点-圆检测)
function lineIntersectsCircle(ahead, ahead2, obstacle) {
    return distance(ahead, obstacle.center) <= obstacle.radius ||
           distance(ahead2, obstacle.center) <= obstacle.radius;
}
```

---

## 回避力计算 (Avoidance Force)

### 力的方向

从障碍物中心指向 `ahead` 点 → 推开角色。

$$
\vec{F}_{avoid} = \frac{\vec{ahead} - \vec{center}}{|\vec{ahead} - \vec{center}|} \times F_{max}
$$

```javascript
let avoidance = new Vector(0, 0);

if (mostThreatening != null) {
    avoidance.x = ahead.x - mostThreatening.center.x;
    avoidance.y = ahead.y - mostThreatening.center.y;
    avoidance.normalize().scale(MAX_AVOID_FORCE);
}

return avoidance;
```

### 可视化

```mermaid
graph LR
    A[🚗] -->|velocity| B[→]
    B --> C((⭕))
    C -.avoidance force.-> D[📍 侧向]
    D -.推动.-> A
    
    style C fill:#ffccbc
    style D fill:#c8e6c9
```

---

## 优化策略 (Optimizations)

### 动态触须长度

> [!tip] Speed-based Scaling
> 速度越快，触须越长 → 提前预警

$$
d_{dynamic} = \frac{|\vec{velocity}|}{v_{max}} \times d_{max}
$$

```javascript
let dynamic_length = velocity.length() / MAX_VELOCITY;
let ahead = position.add(velocity.normalize().scale(dynamic_length));
```

**好处：**
- 高速时：提前检测，避免撞车
- 低速/静止时：触须缩短，避免误触发

### 多触须系统

```mermaid
graph TD
    A[🚗] -->|主触须 forward| B[📍]
    A -.左触须 left.-> C[📍]
    A -.右触须 right.-> D[📍]
    
    B --> E{检测}
    C --> E
    D --> E
    
    style B fill:#fff4e1
    style C fill:#e1f5ff
    style D fill:#e1f5ff
```

---

## 工作流程 (Workflow)

```mermaid
sequenceDiagram
    participant Agent as 🚗 角色
    participant Sensors as 📡 触须
    participant Obstacles as ⭕ 障碍物
    
    Agent->>Sensors: 1. 投射 ahead, ahead2
    Sensors->>Obstacles: 2. 检测交叉
    Obstacles-->>Sensors: 3. 返回碰撞列表
    Sensors->>Agent: 4. 选出最近障碍
    Agent->>Agent: 5. 计算侧向推力
    Agent->>Agent: 6. 应用 avoidance force
    
    Note over Agent: 每帧重复
```

---

## 应用场景

| 场景 | 描述 | 配置建议 |
|------|------|---------|
| 🚗 **车辆导航** | 街道上避开障碍 | `MAX_SEE_AHEAD=100` |
| 🧟 **僵尸追击** | 追玩家同时避墙 | 结合 `pursuit + avoid` |
| 🐟 **水下生物** | 避开礁石 | `MAX_SEE_AHEAD=50` |
| 🚁 **无人机** | 3D 空间避障 | 需要 3D 触须 |

---

## 常见问题 (FAQ)

> [!question] 为什么需要 ahead2?
> 单一触须可能"穿过"小障碍物。`ahead2` 在中点检测，增加灵敏度。

> [!question] 如何处理多个障碍物?
> 选择**最近**的一个 (Most Threatening)，其他暂时忽略。下一帧会重新评估。

> [!question] Collision Avoidance vs Pathfinding?
> - **Avoidance**: 局部反应，快速但可能卡死角
> - **Pathfinding**: 全局规划，能走出迷宫但计算昂贵
> - **最佳实践**: Pathfinding 指引大方向，Avoidance 处理细节

---

## 相关链接

- Previous: [[05_Movement_Manager|Movement Manager]]
- Next: [[07_Path_Following|Path Following]]
- Combine with: [[01_Seek|Seek]] + [[04_Pursuit_Evade|Pursuit]]
- Advanced: [[09_Queue|Queue]] (也用到触须检测)

---

## 参考资料

- [TutsPlus: Collision Avoidance](https://code.tutsplus.com/understanding-steering-behaviors-collision-avoidance--gamedev-7777t)
- Ray-Circle Intersection: [Math Reference](https://en.wikipedia.org/wiki/Line–sphere_intersection)

^collision-detection
