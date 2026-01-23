# Fast-Paced Multiplayer (Part I): Client-Server Game Architecture

原文：[Fast-Paced Multiplayer (Part I): Client-Server Game Architecture](https://www.gabrielgambetta.com/client-server-game-architecture.html)

## Introduction (简介)

This is the first in a series of articles exploring the techniques and algorithms that make fast-paced multiplayer games possible.
这是探索使快节奏多人游戏成为可能的技术和算法系列文章的第一篇。

If you’re familiar with the concepts behind multiplayer games, you can safely skip to the next article – what follows is an introductory discussion.
如果您熟悉多人游戏背后的概念，您可以放心地跳到下一篇文章——接下来是介绍性讨论。

Developing any kind of game is itself challenging; multiplayer games, however, add a completely new set of problems to be dealt with.
开发任何类型的游戏本身就是具有挑战性的；然而，多人游戏增加了一套全新的需要处理的问题。

Interestingly enough, the core problems are human nature and physics!
有趣的是，核心问题是人性和物理学！

## The problem of cheating (作弊的问题)

It all starts with cheating.
一切始于作弊。

As a game developer, you usually don’t care whether a player cheats in your single-player game – their actions don’t affect anyone but him.
作为游戏开发者，通常您并不在意玩家是否在您的单人游戏中作弊——他们的行为只会影响他自己。

A cheating player may not experience the game exactly as you planned, but since it’s their game, they have the right to play it in any way they please.
作弊玩家可能无法完全按照您的计划体验游戏，但既然是他们的游戏，他们有权以任何他们喜欢的方式进行游戏。

Multiplayer games are different, though.
然而，多人游戏是不同的。

In any competitive game, a cheating player isn’t just making the experience better for himself, they’re also making the experience worse for the other players.
在任何竞技游戏中，作弊玩家不仅是让自己体验更好，他们也在让其他玩家的体验变差。

As the developer, you probably want to avoid that, since it tends to drive players away from your game.
作为开发者，您可能希望避免这种情况，因为它往往会把玩家从您的游戏中赶走。

There are many things that can be done to prevent cheating, but the most important one (and probably the only really meaningful one) is simple : don’t trust the player.
有很多事情可以做来防止作弊，但最重要的一件（也可能是唯一真正有意义的一件）很简单：不要信任玩家。

Always assume the worst – that players will try to cheat.
总是假设最坏的情况——即玩家会试图作弊。

## Authoritative servers and dumb clients (权威服务器和哑客户端)

This leads to a seemingly simple solution – you make everything in your game happen in a central server under your control, and make the clients just privileged spectators of the game.
这导致了一个看似简单的解决方案——您让游戏中的一切都在您控制下的中央服务器中发生，并让客户端仅仅是游戏的特权观众。

In other words, your game client sends inputs (key presses, commands) to the server, the server runs the game, and you send the results back to the clients.
换句话说，您的游戏客户端将输入（按键，命令）发送到服务器，服务器运行游戏，然后您将结果发送回客户端。

This is usually called using an authoritative server, because the one and only authority regarding everything that happens in the world is the server.
这通常被称为使用权威服务器，因为关于世界上发生的一切的唯一权威是服务器。

Of course, your server can be exploited for vulnerabilities, but that’s out of the scope of this series of articles.
当然，您的服务器可能会被利用漏洞，但这超出了本系列文章的范围。

Using an authoritative server does prevent a wide range of hacks, though.
不过，使用权威服务器确实可以防止大量的黑客攻击。

For example, you don’t trust the client with the health of the player; a hacked client can modify its local copy of that value and tell the player it has 10000% health, but the server knows it only has 10% – when the player is attacked it will die, regardless of what a hacked client may think.
例如，您不信任客户端拥有玩家的生命值；被黑的客户端可以修改该值的本地副本并告诉玩家它有 10000% 的生命值，但服务器知道它只有 10%——当玩家受到攻击时它会死亡，不管被黑的客户端怎么想。

You also don’t trust the player with its position in the world.
您也不信任玩家在世界中的位置。

If you did, a hacked client would tell the server “I’m at (10,10)” and a second later “I’m at (20,10)”, possibly going through a wall or moving faster than the other players.
如果您这样做，被黑的客户端会告诉服务器“我在 (10,10)”，一秒钟后“我在 (20,10)”，可能会穿过墙壁或比其他玩家移动得更快。

Instead, the server knows the player is at (10,10), the client tells the server “I want to move one square to the right”, the server updates its internal state with the new player position at (11,10), and then replies to the player “You’re at (11, 10)”
相反，服务器知道玩家在 (10,10)，客户端告诉服务器“我想向右移动一格”，服务器用新的玩家位置 (11,10) 更新其内部状态，然后回复玩家“你在 (11, 10)”。

![Authoritative Server](images/fpm1-01.png)

In summary: the game state is managed by the server alone.
总之：游戏状态仅由服务器管理。

Clients send their actions to the server.
客户端将其动作发送到服务器。

The server updates the game state periodically, and then sends the new game state back to clients, who just render it on the screen.
服务器定期更新游戏状态，然后将新的游戏状态发送回客户端，客户端只是在屏幕上渲染它。

## Dealing with networks (处理网络)

The dumb client scheme works fine for slow turn based games, for example strategy games or poker.
哑客户端方案对于慢节奏的回合制游戏效果很好，例如策略游戏或扑克。

It would also work in a LAN setting, where communications are, for all practical purposes, instantaneous.
在局域网环境中，它也可以工作，因为出于所有实际目的，通信是即时的。

But this breaks down when used for a fast-paced game over a network such as the internet.
但是，当用于互联网等网络上的快节奏游戏时，这种方法就会崩溃。

Let’s talk physics. Suppose you’re in San Francisco, connected to a server in the NY.
让我们谈谈物理学。假设您在旧金山，连接到纽约的服务器。

That’s approximately 4,000 km, or 2,500 miles (that’s roughly the distance between Lisbon and Moscow).
那大约是 4,000 公里，或 2,500 英里（这大约是里斯本和莫斯科之间的距离）。

Nothing can travel faster than light, not even bytes on the Internet (which at the lower level are pulses of light, electrons in a cable, or electromagnetic waves).
没有什么能比光快，即使是互联网上的字节（在较低的层面上是光脉冲、电缆中的电子或电磁波）。

Light travels at approximately 300,000 km/s, so it takes 13 ms to travel 4,000 km.
光速约为 300,000 公里/秒，因此行驶 4,000 公里需要 13 毫秒。

This may sound quite fast, but it’s actually a very optimistic setup – it assumes data travels at the speed of light in a straight path, with is most likely not the case.
这听起来可能很快，但这实际上是一个非常乐观的设置——它假设数据以光速沿直线路径传播，这很可能不是情况。

In real life, data goes through a series of jumps (called hops in networking terminology) from router to router, most of which aren’t done at lightspeed; routers themselve introduce a bit of delay, since packets must be copied, inspected, and rerouted.
在现实生活中，数据会经过一系列跳转（网络术语中称为跳跃），从一个路由器到另一个路由器，其中大多数不是以光速完成的；路由器本身会引入一些延迟，因为必须复制、检查和重新路由数据包。

For the sake of the argument, let’s assume data takes 50 ms from client to server.
为了讨论起见，让我们假设数据从客户端到服务器需要 50 毫秒。

This is close to a best-case scenario – what happens if you’re in NY connected to a server in Tokyo?
这接近于最佳情况——如果您在纽约连接到东京的服务器会发生什么？

What if there’s network congestion for some reason?
如果由于某种原因出现网络拥塞怎么办？

Delays of 100, 200, even 500 ms are not unheard of.
100、200 甚至 500 毫秒的延迟并非闻所未闻。

Back to our example, your client sends some input to the server (“I pressed the right arrow”).
回到我们的例子，您的客户端向服务器发送一些输入（“我按下了右箭头”）。

The server gets it 50 ms later.
服务器在 50 毫秒后收到它。

Let’s say the server processes the request and sends back the updated state immediately.
假设服务器处理请求并立即发回更新后的状态。

Your client gets the new game state (“You’re now at (1, 0)”) 50 ms later.
您的客户端在 50 毫秒后收到新的游戏状态（“你现在在 (1, 0)”）。

From your point of view, what happened is that you pressed the right arrow key but nothing happened for a tenth of a second; then your character finally moved one square to the right.
从您的角度来看，发生的事情是您按下了右箭头，但十分之一秒内什么也没发生；然后您的角色终于向右移动的一格。



This perceived lag between your inputs and its consequences may not sound like much, but it’s noticeable – and of course, a lag of half a second isn’t just noticeable, it actually makes the game unplayable.
这种输入及其后果之间的感知滞后听起来可能不算什么，但它是显而易见的——当然，半秒的滞后不仅显而易见，实际上它使游戏变得无法玩。

## Summary (总结)

Networked multiplayer games are incredibly fun, but introduce a whole new class of challenges.
网络多人游戏非常有趣，但也引入了全新的挑战。

The authoritative server architecture is pretty good at stopping most cheats, but a straightforward implementation may make games quite unresponsive to the player.
权威服务器架构在阻止大多数作弊方面非常出色，但简单的实现可能会使游戏对玩家的反应非常迟钝。

In the following articles, we’ll explore how can we build a system based on an authoritative server, while minimizing the delay experienced by the players, to the point of making it almost indistinguishable from local or single player games.
在接下来的文章中，我们将探讨如何在基于权威服务器的系统上构建系统，同时尽量减少玩家体验到的延迟，使其几乎与本地或单人游戏无法区分。

## Personal Note (个人笔记)

### Core Concepts (核心概念)
*   **Authoritative Server (权威服务器)**: 游戏逻辑和状态的唯一真理源。客户端只负责发送输入和渲染服务器返回的状态，本身不进行有约束力的逻辑计算。这是防作弊的基石。
*   **Dumb Client (哑客户端)**: 纯粹的输入采集器和渲染器。如果不加任何预测逻辑（如文章后文会提到的 Client-Side Prediction），在网络延迟下会导致极差的游戏体验（按下按钮后有明显延迟才有反应）。

### Expert Vocabulary (专家词汇)
*   **RTT (Round Trip Time)**: 往返时间。即数据从客户端到服务器再返回的时间。
*   **Hops**: 跳数。数据包经过的中间路由设备的数量。

### Insights (学习心得)
这一章主要阐述了多人游戏架构的基本矛盾：**安全性**与**响应性**的冲突。
*   为了安全，我们需要 Authoritative Server。
*   为了响应性，我们需要即时反馈。
*   接下来的系列文章将介绍如何通过预测和插值来解决这个矛盾。
