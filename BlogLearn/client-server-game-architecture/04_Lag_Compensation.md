# Fast-Paced Multiplayer (Part IV): Lag Compensation

原文：[Fast-Paced Multiplayer (Part IV): Lag Compensation](https://www.gabrielgambetta.com/lag-compensation.html)

## Introduction (简介)

The previous three articles explained a client-server game architecture which can be summarized as follows:
前三篇文章解释了客户端-服务器游戏架构，可以总结如下：

*   Server gets inputs from all the clients, with timestamps
    服务器从所有客户端获取带有时间戳的输入
*   Server processes inputs and updates world status
    服务器处理输入并更新世界状态
*   Server sends regular world snapshots to all clients
    服务器向所有客户端发送定期的世界快照
*   Client sends input and simulates their effects locally
    客户端发送输入并在本地模拟它们的效果
*   Client get world updates and
    客户端获取世界更新并
    *   Syncs predicted state to authoritative state
        将预测状态同步到权威状态
    *   Interpolates known past states for other entities
        为其他实体插值已知的过去状态

From a player’s point of view, this has two important consequences:
从玩家的角度来看，这有两个重要的后果：

*   Player sees himself in the present
    玩家看到自己在现在
*   Player sees other entities in the past
    玩家看到其他实体在过去

This situation is generally fine, but it’s quite problematic for very time- and space-sensitive events; for example, shooting your enemy in the head!
这种情况通常很好，但对于极具时间和空间敏感性的事件来说，这是非常有问题的；例如，射击敌人的头部！

## Lag Compensation (延迟补偿)

So you’re aiming perfectly at the target’s head with your sniper rifle.
所以您正用狙击步枪完美地瞄准目标的头部。

You shoot - it’s a shot you can’t miss.
您开枪了——这是您不可能错过的一枪。

But you miss.
但您错过了。

Why does this happen?
为什么会发生这种情况？

Because of the client-server architecture explained before, you were aiming at where the enemy’s head was 100ms before you shot - not when you shot!
由于前面解释的客户端-服务器架构，您瞄准的是 100 毫秒前敌人头部所在的位置——而不是您开枪时！

In a way, it’s like playing in an universe where the speed of light is really, really slow; you’re aiming at the past position of your enemy, but they’re long gone by the time you squeeze the trigger.
在某种程度上，这就像在一个光速非常非常慢的宇宙中玩耍；您瞄准的是敌人过去的位置，但当您扣动扳机时，他们早已离开了。



Fortunately, there’s a relatively simple solution for this, which is also pleasant for most players most of the time (with the one exception discussed below).
幸运的是，对此有一个相对简单的解决方案，这在大多数时候对大多数玩家来说也是令人愉快的（除了下面讨论的一个例外）。

Here’s how it works:
它是这样工作的：

*   When you shoot, client sends this event to the server with full information: the exact timestamp of your shot, and the exact aim of the weapon.
    当您射击时，客户端将此事件连同完整信息发送到服务器：您射击的确切时间戳，以及武器的确切瞄准。
*   Here’s the crucial step. Since the server gets all the input with timestamps, it can authoritatively reconstruct the world at any instant in the past. In particular, it can reconstruct the world exactly as it looked like to any client at any point in time.
    这是关键的一步。由于服务器获取所有带有时间戳的输入，它可以权威地重建过去任何时刻的世界。特别是，它可以完全按照任何客户端在任何时间点看到的样子重建世界。
*   This means the server can know exactly what was on your weapon’s sights the instant you shot. It was the past position of your enemy’s head, but the server knows it was the position of their head in your present.
    这意味着服务器可以确切知道您开枪瞬间武器瞄准器上有什么。它是敌人头部的过去位置，但服务器知道那是他们在您的现在的头部位置。
*   The server processes the shot at that point in time, and updates the clients.
    服务器在那个时间点处理射击，并更新客户端。



And everyone is happy!
每个人都很开心！

The server is happy because it’s the server. It’s always happy.
服务器很高兴，因为它是服务器。它总是很高兴。

You’re happy because you were aiming at your enemy’s head, shot, and got a rewarding headshot!
您很高兴，因为您瞄准了敌人的头部，开枪了，并得到了奖励性的爆头！

The enemy may be the only one not entirely happy.
敌人可能是唯一不完全高兴的人。

If they were standing still when he got shot, it’s their fault, right?
如果他被击中时站着不动，那是他们的错，对吧？

If they were moving… wow, you’re a really awesome sniper.
如果他们在移动……哇，您真是一个了不起的狙击手。

But what if they were in an open position, got behind a wall, and then got shot, a fraction of a second later, when they thought they were safe?
但是，如果他们在一个开阔的位置，躲到墙后，然后在几分之一秒后，当他们认为自己安全时被击中了怎么办？

Well, that can happen. That’s the tradeoff you make.
好吧，那可能会发生。这就是您所做的权衡。

Because you shoot at him in the past, they may still be shot up to a few milliseconds after they took cover.
因为您在过去射击他，他可能在躲避后几毫秒内仍然被击中。

It is somewhat unfair, but it’s the most agreeable solution for everyone involved.
这有些不公平，但这是对每个人来说最可接受的解决方案。

It would be much worse to miss an unmissable shot!
错过一个不可能错过的投篮会更糟糕！

## Conclusion (结论)

This ends my series on Fast-paced Multiplayer.
我关于快节奏多人游戏的系列文章到此结束。

This kind of thing is clearly tricky to get right, but with a clear conceptual understanding about what’s going on, it’s not exceedingly difficult.
这种事情显然很难做对，但如果对发生的事情有一个清晰的概念理解，它并不是极其困难。

Although the audience of these articles were game developers, it found another group of interested readers: gamers!
虽然这些文章的受众是游戏开发者，但它发现了另一群感兴趣的读者：游戏玩家！

From a gamer point of view it’s also interesting to understand why some things happen the way they happen.
从游戏玩家的角度来看，了解为什么有些事情会这样发生也很有趣。

## Personal Note (个人笔记)

### Core Concepts (核心概念)
*   **Snapshot History (快照历史)**: 为了实现延迟补偿，服务器必须保存过去一段时间（比如 1秒）内的所有世界的快照（世界中所有实体的位置状态）。
*   **Rewind (回溯)**: 当服务器处理一个带有过去时间戳的射击请求时，它会把世界状态（敌人的位置）“回溯”到那个时间点。
*   **Lag Compensation (延迟补偿)**: 在“回溯”的世界中进行命中判定。如果判定命中，即视为有效命中，哪怕在当前的“服务器最新时间”里，敌人已经躲到了墙后面。

### Insights (学习心得)
*   **信任谁的眼睛**：Lag Compensation 的核心哲学是**“所见即所得”**。
*   **公平性的牺牲**：Lag Compensation 牺牲了被攻击者的体验（明明躲了还是死）来换取攻击者的体验（瞄准了就打中）。
