---
title: Rocket League 物理系统详解
tags:
  - game-physics
  - rocket-league
  - network-sync
  - game-development
aliases:
  - 火箭联盟物理系统
  - RL Physics
  - Rocket League Physics
created: 2026-01-20
status: study-notes
source: It IS Rocket Science The Physics of Rocket League Detailed
type: video-learning
---

# 🚀 Rocket League 物理系统详解

> [!abstract] 视频概述
> 本笔记基于技术讲解视频 "It IS Rocket Science! The Physics of Rocket League Detailed"，深入分析火箭联盟游戏中的物理引擎实现、网络同步机制以及游戏性设计。

---

## 📋 目录

- [[#核心物理系统]]
- [[#车辆动力学]]
- [[#球体物理]]
- [[#碰撞检测]]
- [[#网络同步机制]]
- [[#性能优化]]

---

## 核心物理系统 (Core Physics System)

### 游戏引擎架构

```mermaid
graph TD
    A[Unreal Engine] --> B[Physics Engine]
    B --> C[车辆系统<br/>Vehicle System]
    B --> D[球体系统<br/>Ball System]
    B --> E[竞技场<br/>Arena]
    
    C --> F[输入处理<br/>Input]
    C --> G[悬挂系统<br/>Suspension]
    C --> H[推进器<br/>Boost]
    
    D --> I[刚体物理<br/>Rigid Body]
    D --> J[弹性碰撞<br/>Elastic Collision]
    
    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#e8f5e9
    style D fill:#ffccbc
```

> [!tip] 引擎选择
> Rocket League 使用 **Unreal Engine 3** (后续版本升级到 UE4/UE5)，内置的 **PhysX** 物理引擎提供了基础的刚体动力学支持。

### 物理更新循环

```mermaid
sequenceDiagram
    participant Input as 玩家输入
    participant Game as 游戏逻辑
    participant Physics as 物理引擎
    participant Render as 渲染
    
    Input->>Game: 1. 读取控制器输入<br/>(油门/转向/跳跃)
    Game->>Physics: 2. 应用力和力矩
    Physics->>Physics: 3. 物理步进<br/>(Fixed Timestep)
    Physics->>Game: 4. 更新位置/速度
    Game->>Render: 5. 插值渲染
    
    Note over Physics: 固定时间步长<br/>120 Hz (8.33ms)
```

> [!important] 固定时间步长
> **关键设计**: 物理模拟使用 **120Hz** 的固定更新频率，确保不同帧率下的一致性。
> - **物理更新**: 120 FPS (8.33ms per frame)
> - **渲染更新**: 可变 (30-240+ FPS)
> - **插值**: 平滑渲染帧之间的运动

---

## 车辆动力学 (Vehicle Dynamics)

### 输入系统

| 控制 | 输入轴 | 物理效果 |
|------|--------|---------|
| **油门** (Throttle) | 前进/后退 | 驱动力矩 (Drive Torque) |
| **转向** (Steering) | 左/右 | 前轮转角 + 偏航力矩 |
| **跳跃** (Jump) | 按键 | 瞬时冲量 (Impulse) |
| **翻滚** (Air Roll) | 空中旋转 | 角动量 (Angular Momentum) |
| **推进器** (Boost) | 加速 | 恒定推力 (Constant Thrust) |

### 悬挂系统 (Suspension)

```mermaid
graph LR
    A[车身<br/>Car Body] ---|弹簧力| B[悬挂<br/>Spring]
    B ---|阻尼| C[减震器<br/>Damper]
    C --> D[车轮<br/>Wheel]
    D -.接触.-> E[地面<br/>Ground]
    
    style A fill:#e1f5ff
    style B fill:#fff4e1
    style D fill:#c8e6c9
    style E fill:#555
```

**胡克定律 (Hooke's Law)**:

$$
F_{spring} = -k \cdot \Delta x - c \cdot v
$$

$$
\begin{align}
k &= \text{弹簧刚度系数 (Spring Stiffness)} \\
\Delta x &= \text{压缩距离 (Compression Distance)} \\
c &= \text{阻尼系数 (Damping Coefficient)} \\
v &= \text{压缩速度 (Compression Velocity)}
\end{align}
$$

```javascript
// 伪代码示例
function calculateSuspensionForce(wheel) {
    let compression = wheel.restLength - wheel.currentLength;
    let compressionVelocity = wheel.getCompressionRate();
    
    let springForce = springStiffness * compression;
    let damperForce = damperCoefficient * compressionVelocity;
    
    return springForce + damperForce;
}
```

> [!example] 参数调优
> - **弹簧刚度**: 控制车辆"软硬"感
> - **阻尼系数**: 控制弹跳的衰减速度
> - **RL 特点**: 较硬的悬挂 + 高阻尼 = 响应迅速且稳定

---

## 球体物理 (Ball Physics)

### 刚体属性

```mermaid
graph TD
    A[足球<br/>Ball] --> B[质量 Mass<br/>≈ 100 kg]
    A --> C[半径 Radius<br/>≈ 91.25 cm]
    A --> D[恢复系数<br/>Restitution ≈ 0.6]
    A --> E[摩擦系数<br/>Friction ≈ 0.35]
    
    style A fill:#ffccbc
    style B fill:#e1f5ff
    style C fill:#e8f5e9
    style D fill:#fff4e1
```

### 碰撞模型

**弹性碰撞公式**:

$$
v'_1 = \frac{(m_1 - e \cdot m_2)v_1 + (1 + e)m_2 v_2}{m_1 + m_2}
$$

$$
v'_2 = \frac{(m_2 - e \cdot m_1)v_2 + (1 + e)m_1 v_1}{m_1 + m_2}
$$

$$
\begin{align}
e &= \text{恢复系数 (Coefficient of Restitution)} \\
m_i &= \text{质量} \\
v_i &= \text{碰撞前速度} \\
v'_i &= \text{碰撞后速度}
\end{align}
$$

> [!tip] 恢复系数
> - **e = 0**: 完全非弹性碰撞 (粘在一起)
> - **e = 1**: 完全弹性碰撞 (动能守恒)
> - **RL 球体**: e ≈ 0.6 (部分能量损失)

### 旋转与马格努斯效应

```mermaid
graph LR
    A[球体旋转<br/>Spin] --> B[空气动力学]
    B --> C[马格努斯力<br/>Magnus Force]
    C --> D[弧线轨迹<br/>Curved Path]
    
    style A fill:#ffccbc
    style C fill:#fff4e1
    style D fill:#c8e6c9
```

$$
\vec{F}_{magnus} = S \cdot (\vec{\omega} \times \vec{v})
$$

$$
\begin{align}
S &= \text{马格努斯系数} \\
\vec{\omega} &= \text{角速度向量} \\
\vec{v} &= \text{线速度向量}
\end{align}
$$

> [!question] RL 中是否实现？
> Rocket League **简化了空气动力学**，马格努斯效应不明显，主要依赖碰撞和推进器控制。

---

## 碰撞检测 (Collision Detection)

### 几何简化

```mermaid
graph TD
    A[复杂模型] --> B[碰撞体代理<br/>Collision Proxy]
    B --> C[车辆<br/>Box Collider]
    B --> D[球体<br/>Sphere Collider]
    B --> E[墙壁<br/>Plane/Mesh]
    
    C --> F[Hitbox<br/>长方体]
    D --> G[Perfect Sphere]
    
    style A fill:#e1f5ff
    style F fill:#fff4e1
    style G fill:#ffccbc
```

> [!important] Hitbox 设计
> - **车辆 Hitbox**: 长方体，不同车型有微小差异
> - **球体**: 完美球形，无论视觉模型如何
> - **性能考虑**: 简化几何 → 快速碰撞检测

### 碰撞响应流程

```mermaid
sequenceDiagram
    participant Car as 车辆
    participant Ball as 球
    participant Engine as 物理引擎
    
    Car->>Engine: 1. 检测碰撞<br/>(AABB/Sphere Test)
    Engine->>Engine: 2. 计算穿透深度
    Engine->>Engine: 3. 分离物体<br/>(Resolve Penetration)
    Engine->>Car: 4. 应用冲量<br/>(Impulse)
    Engine->>Ball: 4. 应用冲量
    
    Note over Engine: 使用约束求解器<br/>(Constraint Solver)
```

---

## 网络同步机制 (Network Synchronization)

### 客户端-服务器架构

```mermaid
graph TB
    S[服务器<br/>Authoritative Server] --> C1[客户端 1]
    S --> C2[客户端 2]
    S --> C3[客户端 3]
    
    C1 -.输入.-> S
    C2 -.输入.-> S
    C3 -.输入.-> S
    
    S -.状态同步.-> C1
    S -.状态同步.-> C2
    S -.状态同步.-> C3
    
    style S fill:#ffccbc
    style C1 fill:#e1f5ff
    style C2 fill:#e1f5ff
    style C3 fill:#e1f5ff
```

> [!success] 服务器权威
> **Server-Authoritative Model**: 服务器是物理模拟的唯一真实来源，客户端仅做预测和插值。

### 客户端预测 (Client-Side Prediction)

```mermaid
sequenceDiagram
    participant Player as 玩家
    participant Client as 客户端
    participant Server as 服务器
    
    Player->>Client: t=0: 按下油门
    Client->>Client: t=0: 本地预测移动
    Client->>Server: t=0: 发送输入
    
    Server->>Server: t=50ms: 处理输入
    Server->>Client: t=50ms: 返回权威状态
    
    Client->>Client: t=50ms: 对比预测<br/>有偏差则纠正
    
    Note over Client: 回滚 + 重放<br/>(Rollback & Replay)
```

**核心机制**:

1. **输入缓冲**: 客户端存储所有未确认的输入
2. **状态快照**: 保存每一帧的世界状态
3. **服务器确认**: 收到权威状态后对比
4. **误差纠正**: 如果偏差 > 阈值，回滚并重放

```javascript
// 伪代码
class ClientPrediction {
    inputBuffer = [];
    stateSnapshots = [];
    
    onInput(input) {
        // 1. 本地预测
        this.simulatePhysics(input);
        
        // 2. 保存快照
        this.stateSnapshots.push(this.getState());
        
        // 3. 发送到服务器
        this.sendToServer(input);
        
        // 4. 缓冲输入
        this.inputBuffer.push(input);
    }
    
    onServerUpdate(serverState) {
        // 对比本地快照
        let localState = this.stateSnapshots[serverState.frameId];
        
        if (this.hasMismatch(localState, serverState)) {
            // 回滚到服务器状态
            this.setState(serverState);
            
            // 重放未确认的输入
            for (let input of this.inputBuffer) {
                this.simulatePhysics(input);
            }
        }
        
        // 清理已确认的输入
        this.inputBuffer.shift();
    }
}
```

### 实体插值 (Entity Interpolation)

```mermaid
graph LR
    A[上一个状态<br/>State A<br/>t=0] -.插值.-> B[当前渲染<br/>Interpolated<br/>t=0.5]
    B -.插值.-> C[下一个状态<br/>State B<br/>t=1]
    
    style A fill:#e8f5e9
    style B fill:#fff4e1
    style C fill:#c8e6c9
```

**线性插值 (Lerp)**:

$$
\vec{pos}(t) = \vec{pos}_A + (\vec{pos}_B - \vec{pos}_A) \cdot \alpha
$$

$$
\alpha = \frac{t - t_A}{t_B - t_A}
$$

> [!tip] 延迟缓冲
> RL 客户端会故意**延迟 100-200ms** 渲染其他玩家，保证有足够的状态数据用于平滑插值。

---

## 性能优化 (Performance Optimization)

### 关键技术

| 技术 | 目的 | 实现 |
|------|------|------|
| **固定时间步长** | 一致性 | 120Hz 物理更新 |
| **空间分割** | 加速碰撞检测 | Octree/Grid |
| **休眠机制** | 减少计算 | 静止物体不更新 |
| **碰撞层** | 过滤检测 | Ball vs Car only |
| **网络压缩** | 带宽优化 | Delta Compression |

### 内存布局

```mermaid
graph TD
    A[物理数据<br/>Physics Data] --> B[Cache-Friendly<br/>Layout]
    B --> C[SoA 结构<br/>Structure of Arrays]
    C --> D[SIMD 优化<br/>Vector Instructions]
    
    style A fill:#e1f5ff
    style C fill:#fff4e1
    style D fill:#c8e6c9
```

> [!example] 数据结构
> **AoS vs SoA**:
> ```cpp
> // AoS (Array of Structures) - 缓存不友好
> struct Vehicle {
>     Vector3 position;
>     Vector3 velocity;
>     Quaternion rotation;
> };
> Vehicle vehicles[100];
> 
> // SoA (Structure of Arrays) - SIMD 友好
> struct VehicleArray {
>     Vector3 positions[100];
>     Vector3 velocities[100];
>     Quaternion rotations[100];
> };
> ```

---

## 🎮 游戏性设计哲学

> [!quote] 设计原则
> "Physics-based, but not realistic. Responsive, but not arcade."
> 
> **基于物理，但不追求真实；响应灵敏，但不失真实感。**

### 关键平衡点

```mermaid
graph LR
    A[真实物理<br/>Realistic] ---|平衡点| B[游戏性]
    B ---|平衡点| C[街机感<br/>Arcade]
    
    style A fill:#e8f5e9
    style B fill:#fff4e1
    style C fill:#ffccbc
```

**RL 的选择**:
- ✅ **真实感**: 刚体碰撞、动量守恒、重力
- ✅ **可玩性**: 空中控制、无限推进器、快速响应
- ❌ **过度真实**: 燃料限制、车辆损坏、复杂操控

---

## 📚 扩展阅读

- [[车辆物理模拟|Advanced Vehicle Physics]]
- [[网络游戏同步|Networked Physics in Multiplayer Games]]
- [[PhysX 引擎|NVIDIA PhysX Documentation]]

---

## 🔗 相关资源

- 官方文档: [Rocket League Technical White Paper](https://www.unrealengine.com/)
- GDC 演讲: "The Physics of Rocket League"
- 开源项目: [RLBot](https://www.rlbot.org/) - AI 开发框架

---

## 💡 学习反思

> [!note] 关键收获
> 1. **固定时间步长**是多人物理游戏的基石
> 2. **客户端预测 + 服务器权威**解决延迟问题
> 3. **简化物理模型**不等于降低游戏质量
> 4. **游戏性优先**，物理真实性服务于可玩性

> [!question] 待深入研究
> - [ ] PhysX 约束求解器的内部实现
> - [ ] 如何处理高延迟环境 (>200ms)
> - [ ] 反作弊机制在物理模拟中的应用
> - [ ] 跨平台同步的额外挑战

---

#game-physics #multiplayer #networking #unreal-engine

^rocket-league-physics
