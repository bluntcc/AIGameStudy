# Fast-Paced Multiplayer (Part II): Client-Side Prediction and Server Reconciliation

原文：[Fast-Paced Multiplayer (Part II): Client-Side Prediction and Server Reconciliation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html)

## Introduction (简介)

In the [first article](01_Introduction.md) of this series, we explored a client-server model with an authoritative server and dumb clients that just send inputs to the server, and then render the updated game state when the server sends it.
在本系列的第一篇文章中，我们探讨了一个客户端-服务器模型，该模型具有权威服务器和哑客户端，客户端只是将输入发送到服务器，然后在服务器发送更新的游戏状态时渲染它。

A naive implementation of this scheme leads to a delay between user commands and changes on the screen; for example, the player presses the right arrow key, and the character takes half a second before it starts moving.
该方案的简单实现会导致用户命令和屏幕更改之间出现延迟；例如，玩家按下右箭头键，角色需要半秒钟才开始移动。

This is because the client input must first travel to the server, the server must process the input and calculate a new game state, and the updated game state must reach the client again.
这是因为客户端输入必须首先传输到服务器，服务器必须处理输入并计算新的游戏状态，然后更新的游戏状态必须再次传回客户端。

In a networked environment such as the internet, where delays can be ten or hundreds of milliseconds, a game may feel unresponsive at best, or in the worst case, be completely unplayable.
在互联网这样的网络环境中，延迟可能是几十或几百毫秒，游戏充其量会感觉反应迟钝，在最坏的情况下，完全无法玩。

In this article, we’ll find ways to minimize or even eliminate that problem.
在本文中，我们将找到最小化甚至消除该问题的方法。

## Client-side prediction (客户端预测)

Even though there are some cheating players, most of the time the game server is processing valid requests (from non-cheating clients and from cheating clients who aren’t cheating at that particular time).
即使有一些作弊玩家，大多数时候游戏服务器都在处理有效的请求（来自未作弊的客户端以及当时没有作弊的作弊客户端）。

This means most of the input received will be valid and will update the game state as expected; that is, if your character is at (10, 10) and the right arrow key is pressed, it will end up at (11, 10).
这意味着收到的大多数输入将是有效的，并将按预期更新游戏状态；也就是说，如果您的角色在 (10, 10) 并且按下了右箭头键，它将最终到达 (11, 10)。

We can use this to our advantage.
我们可以利用这一点。

If the game world is deterministic enough (that is, given a game state and a set of inputs, the result is completely predictable), we can send the inputs to the server and immediately process them on the client - that is, we predict what the game state will be after the server has processed the inputs; this eliminates the delay between receiving an input and rendering its effect.
如果游戏世界具有足够的确定性（即，给定游戏状态和一组输入，结果是完全可预测的），我们可以将输入发送到服务器并立即在客户端处理它们——也就是说，我们预测服务器处理完输入后的游戏状态；这消除了接收输入和渲染其效果之间的延迟。

Furthermore, most of the time this prediction will be accurate, so there will not be any visible mismatch once the server does send the updated game state.
此外，大多数时候这种预测是准确的，因此一旦服务器确实发送了更新的游戏状态，就不会有任何可见的不匹配。

Let’s suppose we have a 100 ms lag, and the animation of the character moving from one square to the next takes 100 ms.
假设我们有 100 毫秒的滞后，并且角色从一个方块移动到下一个方块的动画需要 100 毫秒。

Using the naive implementation, the whole action would take 200 ms:
使用简单的实现，整个动作将需要 200 毫秒：

![Naive Approach](images/fpm2-01.png)

Since the world is deterministic, we can assume the inputs we send to the server will be executed successfully.
由于世界是确定性的，我们可以假设我们要发送到服务器的输入将成功执行。

Under this assumption, the client can predict the state of the game world after the inputs are processed, and most of the time this will be correct.
在此假设下，客户端可以预测处理输入后游戏世界的状态，并且大多数时候这将是正确的。

Instead of sending the inputs and waiting for the new game state to start rendering it, we can send the input and start rendering the outcome of that inputs as if they had succeded, while we wait for the server to send the “true” game state – which more often than not, will match the state calculated locally :
与其发送输入并等待新的游戏状态开始渲染它，我们可以发送输入并开始渲染该输入的结果，就好像它们已经成功一样，同时我们等待服务器发送“真实”的游戏状态——这种状态通常与本地计算的状态相匹配：

![Prediction](images/fpm2-02.png)

Now there’s absolutely no delay between the player’s actions and the results on the screen, while the server is still authoritative (if a hacked client would send invalid inputs, it could render whatever it wanted on the screen, but it wouldn’t affect the state of the server, which is what the other players see).
现在，玩家的动作和屏幕上的结果之间绝对没有延迟，而服务器仍然是权威的（如果被黑的客户端发送无效的输入，它可以在屏幕上渲染它想要的任何东西，但它不会影响服务器的状态，而这正是其他玩家所看到的）。

## Synchronization issues (同步问题)

In the example above, I chose the numbers carefully to make everything work fine.
在上面的例子中，我仔细选择了数字以使一切正常工作。

However, consider a slightly modified scenario: let’s say we have a 250 ms lag to the server, and moving from a square to the next takes 100 ms.
然而，考虑一个稍微修改过的场景：假设我们到服务器有 250 毫秒的滞后，从一个方块移动到下一个方块需要 100 毫秒。

Let’s also say the player presses the right key 2 times in a row, trying to move 2 squares to the right.
假设玩家连续按两次右键，试图向右移动 2 个方块。

Using the techniques so far, this is what would happen:
使用目前的技术，将会发生以下情况：

![Problem](images/fpm2-03.png)

We run into an interesting problem at t = 250 ms, when the new game state arrives.
我们在 t = 250 ms 时遇到一个有趣的问题，此时新的游戏状态到达。

The predicted state at the client is x = 12, but the server says the new game state is x = 11.
客户端的预测状态为 x = 12，但服务器说新的游戏状态为 x = 11。

Because the server is authoritative, the client must move the character back to x = 11.
因为服务器是权威的，客户端必须将角色移回 x = 11。

But then, a new server state arrives at t = 350, which says x = 12, so the character jumps again, forward this time.
但是，在 t = 350 时到达一个新的服务器状态，它说 x = 12，所以角色再次跳跃，这次是向前。

From the point of view of the player, they pressed the right arrow key twice; the character moved two squares to the right, stood there for 50 ms, jumped one square to the left, stood there for 100 ms, and jumped one square to the right.
从玩家的角度来看，他们按了两次右箭头键；角色向右移动了两个方块，在那里站了 50 毫秒，向左跳了一个方块，在那里站了 100 毫秒，然后向右跳了一个方块。

This, of course, is unacceptable.
这当然是不可接受的。

## Server reconciliation (服务器调节)

The key to fix this problem is to realize that the client sees the game world in present time, but because of lag, the updates it gets from the server are actually the state of the game in the past.
解决这个问题的关键是认识到客户端在当前时间看到游戏世界，但由于滞后，它从服务器获得的更新实际上是过去的游戏状态。

By the time the server sent the updated game state, it hadn’t processed all the commands sent by the client.
当服务器发送更新的游戏状态时，它还没有处理客户端发送的所有命令。

This isn’t terribly difficult to work around, though.
不过，这并不难解决。

First, the client adds a sequence number to each request; in our example, the first key press is request #1, and the second key press is request #2.
首先，客户端向每个请求添加一个序列号；在我们的例子中，第一次按键是请求 #1，第二次按键是请求 #2。

Then, when the server replies, it includes the sequence number of the last input it processed:
然后，当服务器回复时，它包括它处理的最后一个输入的序列号：

![Reconciliation 1](images/fpm2-04.png)

Now, at t = 250, the server says “based on what I’ve seen up to your request #1, your position is x = 11”.
现在，在 t = 250 时，服务器说“基于我看到的直到你的请求 #1，你的位置是 x = 11”。

Because the server is authoritative, it sets the character position at x = 11.
因为服务器是权威的，它将角色位置设置为 x = 11。

Now let’s assume the client keeps a copy of the requests it sends to the server.
现在假设客户端保留它发送到服务器的请求的副本。

Based on the new game state, it knows the server has already processed request #1, so it can discard that copy.
根据新的游戏状态，它知道服务器已经处理了请求 #1，所以它可以丢弃该副本。

But it also knows the server still has to send back the result of processing request #2.
但它也知道服务器仍然必须发回处理请求 #2 的结果。

So applying client-side prediction again, the client can calculate the “present” state of the game based on the last authoritative state sent by the server, plus the inputs the server hasn’t processed yet.
因此，再次应用客户端预测，客户端可以根据服务器发送的最后一个权威状态加上服务器尚未处理的输入来计算游戏的“当前”状态。

So, at t = 250, the client gets “x = 11, last processed request = #1”.
所以，在 t = 250 时，客户端得到“x = 11，最后处理的请求 = #1”。

It discards its copies of sent input up to #1 – but it retains a copy of #2, which hasn’t been acknowledged by the server.
它丢弃直到 #1 的已发送输入副本——但它保留 #2 的副本，该副本尚未被服务器确认。

It updates its internal game state with what the server sent, x = 11, and then applies all the input still not seen by the server – in this case, input #2, “move to the right”.
它用服务器发送的内容更新其内部游戏状态，x = 11，然后应用所有服务器尚未看到的输入——在这种情况下，输入 #2，“向右移动”。

The end result is x = 12, which is correct.
最终结果是 x = 12，这是正确的。

![Reconciliation 2](images/fpm2-05.png)

Continuing with our example, at t = 350 a new game state arrives from the server; this time it says “x = 12, last processed request = #2”.
继续我们的例子，在 t = 350 时，一个新的游戏状态从服务器到达；这次它说“x = 12，最后处理的请求 = #2”。

At this point, the client discards all input up to #2, and updates the state with x = 12.
此时，客户端丢弃直到 #2 的所有输入，并用 x = 12 更新状态。

There’s no unprocessed input to replay, so processing ends there, with the correct result.
没有未处理的输入需要重播，所以处理就在那里结束，结果正确。

## Odds and ends (零碎细节)

The example discussed above implies movement, but the same principle can be applied to almost anything else.
上面讨论的例子暗示了移动，但同样的原则几乎可以应用于任何其他事情。

For example, in a turn-based combat game, when the player attacks another character, you can show blood and a number representing the damage done, but you shouldn’t actually update the health of the character until the server says so.
例如，在回合制格斗游戏中，当玩家攻击另一个角色时，您可以显示血液和代表造成伤害的数字，但在服务器说这样之前，您实际上不应该更新角色的生命值。

Because of the complexities of game state, which isn’t always easily reversible, you may want to avoid killing a character until the server says so, even if its health dropped below zero in the client’s game state (what if the other character used a first-aid kit just before receiving your deadly attack, but the server hasn’t told you yet?)
由于游戏状态的复杂性（并不总是容易逆转），您可能希望避免杀死角色，直到服务器说这样为止，即使在客户端的游戏状态中其生命值已降至零以下（如果另一个角色在受到您的致命攻击之前使用了急救包，但服务器还没有告诉您怎么办？）

This brings us to an interesting point – even if the world is completely deterministic and no clients cheat at all, it’s still possible that the state predicted by the client and the state sent by the server don’t match after a reconciliation.
这将我们带到了一个有趣的点——即使世界是完全确定性的，并且根本没有客户端作弊，在调节后客户端预测的状态和服务器发送的状态仍然可能不匹配。

The scenario is impossible as described above with a single player, but it’s easy to run into when several players are connected to the server at once.
对于上面描述的单个玩家，这种情况是不可能的，但是当多个玩家同时连接到服务器时，很容易遇到这种情况。

This will be the topic of the next article.
这将是下一篇文章的主题。

## Summary (总结)

When using an authoritative server, you need to give the player the illusion of responsiveness, while you wait for the server to actually process your inputs.
当使用权威服务器时，您需要给玩家一种响应能力的错觉，同时等待服务器实际处理您的输入。

To do this, the client simulates the results of the inputs.
为此，客户端模拟输入的结果。

When the updated server state arrives, the predicted client state is recomputed from the updated state and the inputs the client sent but the server hasn’t acknowledged yet.
当更新后的服务器状态到达时，预测的客户端状态将根据更新后的状态以及客户端发送但服务器尚未确认的输入重新计算。

## Personal Note (个人笔记)

### Core Concepts (核心概念)
*   **Client-Side Prediction (客户端预测)**: 客户端不等待服务器确认，直接基于本地逻辑执行并渲染玩家的输入。这是消除输入延迟感的关键技术。
*   **Server Reconciliation (服务器调节/纠错)**: 当客户端收到服务器的权威状态快照时，对比该快照与本地历史记录。如果发现预测错误（位置不一致），则**回滚**到服务器状态，并**重播 (Replay)** 自该状态以来所有未被服务器确认的输入，以计算出正确的当前状态。

### Expert Vocabulary (专家词汇)
*   **Deterministic (确定性)**: 给定相同的初始状态和相同的输入序列，系统总是产生完全相同的结果。这是 Prediction 和 Reconciliation 能完美工作的前提。
*   **Input Sequence Number (输入序列号)**: 给每个输入包打上的唯一递增 ID。
*   **Rubber Banding (橡皮筋效应)**: 当预测严重失败（如被服务器判定撞墙或被击晕），客户端位置被强制拉回服务器位置，表现为角色瞬间“弹回”旧位置。

### Insights (学习心得)
*   **预测与权威的平衡**: 客户端可以“先斩后奏”，但必须随时准备“认错”。
*   **重播作为修正手段**: Server Reconciliation 的核心魔法不是简单的插值修正，而是**重算**。因为物理模拟通常是路径依赖的，简单的位置拉扯会破坏物理连贯性。通过在正确起跑线上重新跑一遍所有输入，能最大程度保证如果没被干扰，结果就是对的。
