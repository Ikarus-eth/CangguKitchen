# Rules and interface review · 27 October 2026

The implementation uses **Kitchen Rush Revised Edition (Pegasus, 2019)** as its baseline: eight teaching scenarios and five missions. The earlier Artipia edition is a different ruleset. This Bali adaptation is not an exact reproduction of either edition.

Source: [publisher's rulebook](https://pegasusna.com/media/pdf/78/1e/77/4250231717918_gbnBdOmFgNKAKIK.pdf), also inspected as a [hosted copy of the same PDF](https://pakufuda.store/wp-content/uploads/2022/08/Kitchen_Rush_rules_eng.pdf). The final page was rendered to resolve the mission-table column order.

## Changes from the review

- Standard play now leaves correctness decisions to the players until the shift report. Recipes, actual quantities, plate sizes and cooking counts remain visible. No green completion badges, automatic next-step hints or correctness-dependent service confirmation. The optional practice setting retains live assistance.
- Reports show every error, rather than hiding errors after the first three. Illegal actions still explain why they cannot be performed immediately.
- A shift no longer cuts off an existing action after 20 extra seconds. Once the clock stops, new visits are blocked and the shift ends when everyone finishes or skips their current action.
- A shopping bundle can be distributed between eligible storerooms. Locked stores and bread/pasta separation are enforced. General supply counts include stored items and items on plates, including meals served early. Binned and completed meals return ingredients to general supply.
- A finished chef can be recalled to free a standing space without starting another action. Shared workers can be reused by another player, and doing so ends their previous visit without leaving duplicate occupancy.
- Mission 3 requires the patron mix; Mission 4 requires 12/18/24 coins for 2/3/4 players. The coin requirement had been attached to Mission 3, and Mission 4 had inherited scenario 8's reputation target. Both are corrected.
- Putting a meal aside is reversible, so collapsing a ticket no longer prevents further preparation.
- Meal headings remain outside the recipe scroll area. Set-aside cards also show meal names. Free, occupied, locked and broken standing spaces have distinct visible markings.

## Verified mechanics

The regression checks cover station capacities across 13 scenarios and 1–4 players; worker waiting times and exclusive occupancy; multitasking; exact and one-size-larger plates; ingredient locking after cooking; spices after cooking; scenario 1 ingredient returns; three plates per wash visit; shopping and office actions; delayed early-service penalties; VIP orders with two dishes; salaries and strikes; and recoverable versus irrecoverable meals between shifts.

The browser suite checks 52 scenario/player layouts, pinned titles at five viewport sizes, unobstructed standing-space centres, two simultaneous dishwashers, worker recall, split delivery and complete error lists. Simulations exercise 215 games, including high order loads. These are automated checks, not a substitute for multiplayer playtesting on physical iPads.

## Remaining adaptations

- Recipes, meal prices, illustration categories, award effects and thresholds, and office-card prices are custom. The rulebook does not reproduce the complete card decks; these values must not be described as verified original card values.
- Optional event cards are not implemented. Solo targets and the two-player helper option are custom modes. Worker assignment and the order of salary-related strikes are automated.
- Chef characters replace physical sand timers. Players can configure timing; normal revised play uses 30-second workers and 4-minute shifts, with 4:30 for scenario 1. Master Chef missions specify 4-minute shifts in the rulebook.

The in-game help and README disclose these differences. Further claims of complete rules parity require verifying the printed card decks and physical board details, not guessing their contents.
