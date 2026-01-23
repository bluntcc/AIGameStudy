# Fast-Paced Multiplayer (Part III): Entity Interpolation

原文：[Fast-Paced Multiplayer (Part III): Entity Interpolation](https://www.gabrielgambetta.com/entity-interpolation.html)

## Introduction (简介)

In the [first article](01_Introduction.md) of the series, we introduced the concept of an authoritative server and its usefulness to prevent client cheats.
在本系列的第一篇文章中，我们介绍了权威服务器的概念及其在防止客户端作弊方面的作用。

However, using this technique naively can lead to potentially showstopper issues regarding playability and responsiveness.
然而，简单地使用这种技术可能会导致关于可玩性和响应能力的潜在致命问题。

In the [second article](02_Client_Side_Prediction.md), we proposed client-side prediction as a way to overcome these limitations.
在第二篇文章中，我们提出了客户端预测作为克服这些限制的一种方法。

The net result of these two articles is a set of concepts and techniques that allow a player to control an in-game character in a way that feels exactly like a single-player game, even when connected to an authoritative server through an internet connection with transmission delays.
这两篇文章的最终结果是一套概念和技术，允许玩家以一种感觉完全像单人游戏的方式控制游戏中的角色，即使通过具有传输延迟的互联网连接连接到权威服务器也是如此。

In this article, we’ll explore the consequences of having other player-controled characters connected to the same server.
在本文中，我们将探讨将其他玩家控制的角色连接到同一服务器的后果。

## Server time step (服务器时间步)

In the previous article, the behavior of the server we described was pretty simple – it read client inputs, updated the game state, and sent it back to the client.
在上一篇文章中，我们描述的服务器行为非常简单——它读取客户端输入，更新游戏状态，然后将其发送回客户端。

When more than one client is connected, though, the main server loop is somewhat different.
然而，当连接多个客户端时，主服务器循环会有所不同。

In this scenario, several clients may be sending inputs simultaneously, and at a fast pace (as fast as the player can issue commands, be it pressing arrow keys, moving the mouse or clicking the screen).
在这种情况下，多个客户端可能同时快速发送输入（快到玩家发出命令的速度，无论是按箭头键、移动鼠标还是点击屏幕）。

Updating the game world every time inputs are received from each client and then broadcasting the game state would consume too much CPU and bandwidth.
每当从每个客户端接收到输入时更新游戏世界，然后广播游戏状态将消耗过多的 CPU 和带宽。

A better approach is to queue the client inputs as they are received, without any processing.
更好的方法是在接收到客户端输入时将其排队，不进行任何处理。

Instead, the game world is updated periodically at low frequency, for example 10 times per second.
相反，游戏世界以低频定期更新，例如每秒 10 次。

The delay between every update, 100ms in this case, is called the time step.
每次更新之间的延迟（在本例中为 100 毫秒）称为时间步长。

In every update loop iteration, all the unprocessed client input is applied (possibly in smaller time increments than the time step, to make physics more predictable), and the new game state is broadcast to the clients.
在每次更新循环迭代中，应用所有未处理的客户端输入（可能以比时间步长更小的时间增量，以使物理更加可预测），并将新的游戏状态广播给客户端。

In summary, the game world updates independent of the presence and amount of client input, at a predictable rate.
总之，游戏世界以可预测的速度更新，独立于客户端输入的存在和数量。

## Dealing with low-frequency updates (处理低频更新)

From the point of view of a client, this approach works as smoothly as before – client-side prediction works independently of the update delay, so it clearly also works under predictable, if relatively infrequent, state updates.
从客户端的角度来看，这种方法像以前一样流畅地工作——客户端预测独立于更新延迟工作，因此它显然也可以在可预测的、即使相对不频繁的状态更新下工作。

However, since the game state is broadcast at a low frequency (continuing with the example, every 100ms), the client has very sparse information about the other entities that may be moving throughout the world.
然而，由于游戏状态以低频广播（继续前面的例子，每 100 毫秒），客户端关于可能在世界各地移动的其他实体的信息非常稀疏。

A first implementation would update the position of other characters when it receives a state update; this immediately leads to very choppy movement, that is, discrete jumps every 100ms instead of smooth movement.
第一个实现会在收到状态更新时更新其他角色的位置；这立即导致非常不连贯的运动，即每 100 毫秒发生一次离散跳跃，而不是平滑移动。

![Choppy](images/fpm3-01.png)

Depending on the type of game you’re developing there are many ways to deal with this; in general, the more predictable your game entities are, the easier it is to get it right.
根据您正在开发的游戏类型，有很多方法可以处理这个问题；一般来说，您的游戏实体越可预测，就越容易做对。

## Dead reckoning (航位推测)

Suppose you’re making a car racing game.
假设您正在制作一款赛车游戏。

A car that goes really fast is pretty predictable – for example, if it’s running at 100 meters per second, a second later it will be roughly 100 meters ahead of where it started.
一辆开得很快的汽车是相当可预测的——例如，如果它以每秒 100 米的速度行驶，一秒钟后它将大约在起始位置前方 100 米处。

Why “roughly”?
为什么是“大约”？

During that second the car could have accelerated or decelerated a bit, or turned to the right or to the left a bit – the key word here is “a bit”.
在那一秒钟内，汽车可能加速或减速了一点，或者是向右或向左转了一点——这里的关键词是“一点”。

The maneuverability of a car is such that at high speeds its position at any point in time is highly dependent on its previous position, speed and direction, regardless of what the player actually does.
汽车的机动性使得在高速行驶时，其任何时间点的位置高度依赖于其先前的位置、速度和方向，而不管玩家实际做什么。

In other words, a racing car can’t do a 180º turn instantly.
换句话说，赛车不能瞬间进行 180 度转弯。

How does this work with a server that sends updates every 100 ms?
这对于每 100 毫秒发送一次更新的服务器如何工作？

The client receives authoritative speed and heading for every competing car; for the next 100 ms it won’t receive any new information, but it still needs to show them running.
客户端接收每辆竞争赛车的权威速度和航向；在接下来的 100 毫秒内，它不会收到任何新信息，但它仍然需要显示它们在运行。

The simplest thing to do is to assume the car’s heading and acceleration will remain constant during that 100 ms, and run the car physics locally with those parameters.
最简单的做法是假设汽车的航向和加速度在那 100 毫秒内保持不变，并使用这些参数在本地运行汽车物理。

Then, 100 ms later, when the server update arrives, the car’s position is corrected.
然后，100 毫秒后，当服务器更新到达时，汽车的位置得到纠正。

The correction can be big or relatively small depending on a lot of factors.
校正可能很大或相对较小，具体取决于许多因素。

If the player does keep the car on a straight line and doesn’t change the car speed, the predicted position will be exactly like the corrected position.
如果玩家确实保持汽车直线行驶并且不改变车速，预测位置将与校正位置完全相同。

On the other hand, if the player crashes against something, the predicted position will be extremely wrong.
另一方面，如果玩家撞到了什么东西，预测位置将是非常错误的。

Note that dead reckoning can be applied to low-speed situations – battleships, for example.
请注意，航位推测可以应用于低速情况——例如战列舰。

In fact, the term “dead reckoning” has its origins in marine navigation.
事实上，“也就是 Dead Reckoning”一词起源于航海导航。

## Entity interpolation (实体插值)

There are some situations where dead reckoning can’t be applied at all – in particular, all scenarios where the player’s direction and speed can change instantly.
有些情况下根本不能应用航位推测——特别是玩家的方向和速度可以瞬间改变的所有场景。

For example, in a 3D shooter, players usually run, stop, and turn corners at very high speeds, making dead reckoning essentially useless, as positions and speeds can no longer be predicted from previous data.
例如，在 3D 射击游戏中，玩家通常以非常高的速度奔跑、停止和转弯，这使得航位推测基本上没用，因为位置和速度无法再从先前的数据中预测。

You can’t just update player positions when the server sends authoritative data; you’d get players who teleport short distances every 100 ms, making the game unplayable.
因为实际上您不能仅在服务器发送权威数据时更新玩家位置；您会让玩家每 100 毫秒传送短距离，导致游戏无法玩。

What you do have is authoritative position data every 100 ms; the trick is how to show the player what happens inbetween.
您拥有的是每 100 毫秒一次的权威位置数据；诀窍是如何向玩家展示这期间发生的什么。

The key to the solution is to show the other players in the past relative to the user’s player.
解决方案的关键是相对于用户的玩家，展示处于过去的其他玩家。

Say you receive position data at t = 1000.
假设您在 t = 1000 时收到位置数据。

You already had received data at t = 900, so you know where the player was at t = 900 and t = 1000.
您已经在 t = 900 时收到了数据，所以您知道玩家在 t = 900 和 t = 1000 时在哪里。

So, from t = 1000 and t = 1100, you show what the other player did from t = 900 to t = 1000.
因此，从 t = 1000 到 t = 1100，您展示其他玩家从 t = 900 到 t = 1000 做了什么。

This way you’re always showing the user actual movement data, except you’re showing it 100 ms “late”.
通过这种方式，您向用户展示的主要是实际移动数据，除了您是“延迟” 100 毫秒显示的。

![Interpolation](images/fpm3-02.png)

The position data you use to interpolate from t = 900 to t = 1000 depends on the game.
您用于从 t = 900 到 t = 1000 进行插值的位置数据取决于游戏。

Interpolation usually works well enough.
插值通常效果很好。

If it doesn’t, you can have the server send more detailed movement data with each update – for example, a sequence of straight segments followed by the player, or positions sampled every 10 ms which look better when interpolated (you don’t need to send 10 times more data – since you’re sending deltas for small movements, the format on the wire can be heavily optimized for this particular case).
如果不行，您可以让服务器在每次更新时发送更详细的移动数据——例如，玩家遵循的一系列直线段，或者是每 10 毫秒采样的位置，这些位置在插值时看起来更好（您不需要发送 10 倍以上的数据——因为您发送的是小移动的增量，线路上的格式可以针对这种特定情况进行大量优化）。

Note that using this technique, every player sees a slightly different rendering of the game world, because each player sees itself in the present but sees the other entities in the past.
请注意，使用这种技术，每个玩家都会看到游戏世界的渲染略有不同，因为每个玩家都看到自己在现在，但看到其他实体在过去。

Even for a fast paced game, however, seeing other entities with a 100 ms isn’t generally noticeable.
然而，即使对于节奏很快的游戏，看到其他实体延迟 100 毫秒通常也不明显。

There are exceptions – when you need a lot of spatial and temporal accuracy, such as when the player shoots at another player.
也有例外——当您需要大量的空间和时间精度时，例如当玩家射击另一个玩家时。

Since the other players are seen in the past, you’re aiming with a 100 ms delay – that is, you’re shooting where your target was 100 ms ago!
由于其他玩家是在过去被看到的，您的瞄准有 100 毫秒的延迟——也就是说，您正在射击您的目标 100 毫秒前所在的位置！

We’ll deal with this in the next article.
我们将在下一篇文章中处理这个问题。

## Summary (总结)

In a client-server environment with an authoritative server, infrequent updates and network delay, you must still give players the illusion of continuity and smooth movement.
在具有权威服务器、不频繁更新和网络延迟的客户端-服务器环境中，您仍然必须给玩家连续性和流畅移动的错觉。

In [part 2 of the series](02_Client_Side_Prediction.md) we explored a way to show the user controlled player’s movement in real time using client-side prediction and server reconciliation; this ensures user input has an immediate effect on the local player, removing a delay that would render the game unplayable.
在本系列的[第二部分](02_Client_Side_Prediction.md)中，我们探索了一种使用客户端预测和服务器调节实时显示用户控制玩家移动的方法；这确保了用户输入对本地玩家有直接影响，消除了会导致游戏无法玩的延迟。

Other entities are still a problem, however.
然而，其他实体仍然是一个问题。

In this article we explored two ways of dealing with them.
在本文中，我们探讨了处理它们的两种方法。

The first one, dead reckoning, applies to certain kinds of simulations where entity position can be acceptably estimated from previous entity data such as position, speed and acceleration.
第一种，航位推测，适用于某些类型的模拟，其中可以从先前的实体数据（如位置、速度和加速度）中可接受地估计实体位置。

This approach fails when these conditions aren’t met.
当不满足这些条件时，这种方法就会失败。

The second one, entity interpolation, doesn’t predict future positions at all – it uses only real entity data provided by the server, thus showing the other entities slightly delayed in time.
第二种，实体插值，根本不预测未来位置——它只使用服务器提供的真实实体数据，因此显示其他实体在时间上略有延迟。

The net effect is that the user’s player is seen in the present and the other entities are seen in the past.
净效应是用户的玩家被看作是在现在，而其他实体被看作是在过去。

This usually creates an incredibly seamless experience.
这通常会创造一种极其无缝的体验。

However, if nothing else is done, the illusion breaks down when an event needs high spatial and temporal accuracy, such as shooting at a moving target: the position where Client 2 renders Client 1 doesn’t match the server’s nor Client 1′s position, so headshots become impossible!
然而，如果不做其他事情，当事件需要高空间和时间精度时，幻觉就会破灭，例如射击移动目标：客户端 2 渲染客户端 1 的位置与服务器或客户端 1 的位置不匹配，所以爆头变得不可能！

Since no game is complete without headshots, we’ll deal with this issue in the next article.
由于没有爆头游戏就不算完整，我们将在下一篇文章中处理这个问题。

## Personal Note (个人笔记)

### Core Concepts (核心概念)
*   **Time Step (时间步)**: 服务器因为性能原因，不能每收到一个包就更新一次世界，而是以固定的频率（如 10Hz, 20Hz, 60Hz）更新。
*   **Entity Interpolation (实体插值)**: 客户端不预测其他玩家的**未来**位置，而是播放他们**过去**的已知位置。这需要客户端有一个缓冲区，总是落后于最新收到的服务器数据一段时间（如 100ms）。

### Insights (学习心得)
*   **本地玩家 vs 其他玩家**: 这是一个关键区别。本地玩家用 **Prediction**（预测未来，为了响应性）。其他玩家用 **Interpolation**（插值过去，为了平滑性）。
*   **时空的错位**: 使用 Interpolation 意味着你看到的所有敌人实际上都是它们 100ms 之前的样子。这对于移动没有问题（看起来很平滑），但对于交互（如瞄准射击）是一个巨大问题。
