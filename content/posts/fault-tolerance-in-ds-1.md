+++
author = "Shantanu Alshi"
title = "Fault Tolerance in Distributed Systems: Introduction"
date = 2014-10-28
tags = ["distributed systems", "concepts"]
+++

Fault tolerance—or the ability to handle any type of fault—is a core motivation for distributed systems. This is one of the most widely studied topics in the area of Distributed Systems. If you are talking about a distributed environment of thousands of machines, it is evident that almost always, some will fail. Due to this very obvious fact, failures have become the norm rather than an exception.

<!--more-->

> A distributed system is one in which the failure of a computer you didn't  
> even know existed can render your own computer unusable.

A poorly designed distributed system is counter-intuitive and worse than a non-distributed system. Leslie Lamport, known for his seminal work in this area, wrote once [in an e-mail](http://research.microsoft.com/en-us/um/people/lamport/pubs/distributed-system.txt):

{{< highlight text >}}
There has been considerable debate over the years about what
constitutes a distributed system.  It would appear that the following
definition has been adopted at SRC:

A distributed system is one in which the failure of a computer you didn't
even know existed can render your own computer unusable.

The current electrical problem in the machine room is not the culprit--it just highlights
a situation that has been getting progressively worse.  It seems that each new version of
the nub makes my FF more dependent upon programs that run elsewhere.

Having to wait a few seconds for a program to be swapped in is a lot
less annoying than having to wait an hour or two for someone to reboot
the servers.  I therefore propose a development project to make our
system more robust.  I am not proposing any particular approach
(enabling stand-alone operation is just one possibility).

I will begin the effort by volunteering to gather some data on the
problem.  If you know of any instance of user's FF becoming inoperative
through no fault of its own, please send me a message indicating the
user, the time, and the cause (if known).
{{< /highlight >}}

---

## Failure Models

Any behavior can be classified in a failure model if it does not comply with the designed protocol or contract.

Let's look at some of the failure models considered in dealing with fault tolerance.

Failure models can be classified into two broad categories:

1. **Node failures**: Failures caused at individual nodes participating in a distributed system.
2. **Communication failures**: Failures caused due to unreliable communication channels connecting the nodes.

Let's classify these even further:

### 1. Node Failures

#### a. Crash Failure (Fail-stop)
This model deals with the crash of a node in the system.

#### b. Omission Failure (Fail-silent)
A node runs normally but misses sending or receiving messages, possibly due to full buffers, slow processing, etc. Crash failures are a special case of omission failures. Systems that tolerate omission failures can tolerate crash failures, but not vice versa. Omission failures can be due to send or receive omission, infinite loops, or improper memory management.

#### c. Timing Failure
The server's response lies outside the specified time interval—either too late due to performance issues or too soon, causing buffer issues.

#### d. Response Failure
The server's response is incorrect. This can be a "value failure" (incorrect data) or a "state transition failure" (unexpected request handling).

#### e. Byzantine Failure / Arbitrary Failure
Failures caused by a malicious node controlled by an attacker. Even large companies are concerned about Byzantine failures due to data corruption at scale. Measures to avoid Byzantine failures are needed for large-scale data. First analyzed by Pease et al. (1980) and Lamport et al. (1982).

#### f. Selfish Behavior
A node is uncooperative, e.g., in a P2P scenario like torrents, a participant downloads at full bandwidth but refuses to seed.

Failure models a, b, c, d, and f are described in [Cristian (1991)](http://www.ict.kth.se/courses/2G1126/vt03/papers/cristian93understanding.pdf) and [Hadzilacos and Toueg (1993)](http://disi.unitn.it/~montreso/ds/syllabus/papers/FaultTolerantBroadcast.pdf).

### 2. Communication Failures

Communication channels can be prone to failures and drop messages transmitted via the network.

Many other failure models can be defined specific to any context, but these definitions are rarely used and hence not documented in the general sense.

---

Also look at **Part 2: Timing models used in distributed context.**