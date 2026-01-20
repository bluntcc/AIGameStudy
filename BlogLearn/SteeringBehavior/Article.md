# 游戏AI基础：操控行为 (Steering Behaviors)

操控行为（Steering Behaviors）是游戏AI中用于控制角色移动的一组算法，最早由Craig Reynolds在1999年的GDC上提出。它们比简单的路径点跟随更自然，能模拟出栩栩如生的群体运动、追逐和躲避效果。

> [!TIP]
> **[👉 点击这里查看在线演示](index.html)**
> 建议在阅读本文的同时配合 Demo 体验，效果更佳。

## 核心概念：力 (Force)

在操控行为中，我们不直接控制角色的位置或速度，而是控制**力**。
根据牛顿第二定律 $F = ma$，力会改变加速度，加速度改变速度，速度改变位置。

这样的物理模拟让移动具有“重量感”和惯性，看起来更加真实。

### 车辆模型 (Vehicle Model)

一个基本的AI主体（Agent/Vehicle）通常包含以下属性：
- **位置 (Position)**: 当前坐标 `(x, y)`
- **速度 (Velocity)**: 当前运动方向和快慢 `(vx, vy)`
- **最大速度 (MaxSpeed)**: 限制飞得太快
- **最大力 (MaxForce)**: 限制转弯或加速的能力（模拟惯性）

每一帧的更新逻辑如下：

```javascript
update() {
    // 速度加上加速度
    this.velocity.add(this.acceleration);
    // 限制最大速度
    this.velocity.limit(this.maxSpeed);
    // 位置加上速度
    this.position.add(this.velocity);
    // 重置加速度（力是瞬时的）
    this.acceleration.mult(0); 
}
```

## 基础行为 (Basic Behaviors)

### 1. 寻找 (Seek)

最基础的行为。目标是让角色移动到指定目标点。
但是，我们不是直接把速度指向目标，那是“瞬移”或者“完全没有惯性”。
我们计算一个**预期速度 (Desired Velocity)**，它指向目标并以最大速度行驶。
然后，**操控力 (Steering Force)** = 预期速度 - 当前速度。

```javascript
seek(target) {
    // 预期速度：从当前位置指向目标
    const desired = Vector2.sub(target, this.position);
    desired.normalize();
    desired.mult(this.maxSpeed);
    
    // 操控力 = 预期速度 - 当前速度
    // 这是一个修正力，试图把当前速度拉向预期速度
    const steer = Vector2.sub(desired, this.velocity);
    steer.limit(this.maxForce); // 限制转向能力
    return steer;
}
```

### 2. 逃离 (Flee)

Seek的反向操作。预期速度是以最大速度**背离**目标。

```javascript
flee(target) {
    const desired = Vector2.sub(this.position, target); // 方向相反
    desired.normalize();
    desired.mult(this.maxSpeed);

    const steer = Vector2.sub(desired, this.velocity);
    steer.limit(this.maxForce);
    return steer;
}
```

### 3. 抵达 (Arrive)

Seek会让角色冲过目标点然后来回震荡。Arrive行为让角色在接近目标时减速。
我们定义一个“减速半径”。当距离小于这个半径时，预期速度的大小会根据距离线性减小。

```javascript
arrive(target) {
    const desired = Vector2.sub(target, this.position);
    const d = desired.mag(); // 距离
    
    // 如果在100像素内，开始减速
    if (d < 100) {
        const m = (d / 100) * this.maxSpeed;
        desired.normalize();
        desired.mult(m);
    } else {
        desired.normalize();
        desired.mult(this.maxSpeed); // 否则全速前进
    }

    const steer = Vector2.sub(desired, this.velocity);
    steer.limit(this.maxForce);
    return steer;
}
```

### 4. 徘徊 (Wander)

让角色看似随机但平滑地移动。直接随机改变速度会让角色像无头苍蝇一样抖动。
Reynolds的Wander算法是在角色前方投射一个圆，在圆周上选一个随机点作为Seek的目标。每一帧，这个随机点都在圆周上随机移动一点点。

```javascript
wander() {
    // 随机改变角度
    const change = 0.3;
    this.wanderTheta += (Math.random() * 2 - 1) * change;

    // 圆心在前方 wanderD 处
    const circlePos = this.velocity.copy();
    circlePos.normalize();
    circlePos.mult(wanderD);
    circlePos.add(this.position);

    // 目标在圆周上
    const h = this.velocity.heading();
    const circleOffset = new Vector2(
        wanderR * Math.cos(this.wanderTheta + h), // 根据当前朝向旋转
        wanderR * Math.sin(this.wanderTheta + h)
    );
    
    const target = Vector2.add(circlePos, circleOffset);
    return this.seek(target); // 最终还是调用Seek
}
```

## 总结

Steering Behaviors 的美妙之处在于**叠加**。你可以同时施加 Seek 和 Separation (分离) 的力，让一群角色跟随目标的同时互不重叠。
通过简单的力的加权平均，可以涌现出非常复杂的群体智能行为。

在此次提供的 Demo 中，你可以通过点击鼠标添加更多的 Agent，并观察它们在不同模式下的运动轨迹。

> [!TIP]
> **[👉 点击这里查看在线演示](index.html)**
