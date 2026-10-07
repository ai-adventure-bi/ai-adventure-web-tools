# The Fly Lab — Fly Goes Bowling v0.2

## Run
Open Terminal in this folder:
`py -m http.server 8000`
Then visit `http://localhost:8000`.

## What v0.2 fixes
v0.1 accidentally gave an untrained fly a trivial solution: the fly, ball and pins were collinear; all Q-values tied at zero; ties selected action 0 (walk); and walking pushed the ball. It therefore looked trained when it was not.

v0.2:
- randomizes fly position and heading
- randomizes ball lateral position
- randomly resolves tied Q-values
- includes an explicit UNTRAINED FLY comparison
- makes ordinary walking impart only a tiny nudge
- makes PUSH a distinct contact action
- lets the state contain ball direction/distance AND target/pin direction
- trains across randomized episodes
- tests from a fresh randomized start
- keeps the child's senses and reward function causally active

## Learning
This is genuine tabular Q-learning. There is no attempt-count skill script.
Because it is deliberately small/discrete, it is intended for classroom-speed learning.

## Science boundary
BANC labels/named walking-control cells are biological grounding.
The bowling state variables, discretisation, Q-learning, rewards, toy physics and action mapping are experimental abstractions.
Exact v888 synapse-level edges are NOT claimed in this prototype.
