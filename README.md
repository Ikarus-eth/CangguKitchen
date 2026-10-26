# Küchen-Chaos

A real-time cooperative kitchen game for 1–4 players, one iPad each, played in the browser. It follows all eight scenarios and the five Master Chef missions of the Kitchen Rush revised rules, with its own dishes and artwork.

## Restaurants

1. Your first restaurant — one sand timer each, 8 friends as guests, every chef serves 2 meals. Wrong ingredients can be put back.
2. The first week — adds the greenhouse with spices, a second sand timer each, 22 more guests, and plates one size bigger are allowed. No more putting back. The team serves 8 meals (3 players).
3. Cleaning up — most plates start dirty and must be washed at the sink, guests buy a drink (+1 coin) when seated, served meals pay their price, and unserved orders cost a free drink. Botched meals can be binned. The team earns 25 coins (34 in challenge mode).
4. The big rush — two shifts with a break, the van (🚐 Shop in the top bar) buys 5 of one ingredient, 3 cheap spices or 2 expensive spices for 1 coin, and 18 demanding ⭐ guests join. Between shifts served meals pay, unfinished meals carry over, mistakes are thrown away. The team earns 35 coins (48 in challenge mode).
5. Spoiled ingredients — bread and pasta live only in storage room 3, and after every shift the chefs take a salary of 3 coins per sand timer (18 for three chefs). If the office can't pay, the restaurant closes. Challenge mode: end with 14 coins.
6. The press — reputation ⭐: served ⭐ guests +1, ⭐ guests left waiting −1. Serve finished meals early in the dining room for a tip 🛎️ (a wrong early meal costs 1 more reputation). Throw 1–2 guests out at the reception; their replacements buy no drinks. Goal: pay all salaries and reach 4 reputation (challenge: 16 coins and 7).
7. The first star — VIP guests 👑 order two dishes and only pay if both are right (+2 / −2 reputation). Reputation wins awards 🏆. Four shifts. Timers that can't be paid go on strike; the office 🏢 (top bar) brings them back for 3 coins. Goal: 10 coins, 11 reputation, nobody on strike.
8. Setbacks — storage room 2 is locked and one stove is broken; a shared temp 🤍 helps whoever has no free timer. The office calls the locksmith or technician, hires a second temp or buys plates. Goal: 12 coins, 11 reputation, nobody on strike.

Master chef missions (rules of restaurant 8): Equality, Striking workers, Kitchen rush, Empty storage rooms, Special challenge.

Not in the rulebook text, so made up for this version: dish recipes and prices, the award cards (thresholds 4/8/12 reputation for three chefs), office card costs, two sink spaces, and the order in which unpaid timers strike (temps first, then each chef's second timer). The 24 event cards are not included.

Goals scale with the number of players, as in the board game.

## Putting meals aside

Tap ✓ Ready twice on a ticket to put the meal aside: it shrinks into the Ready row above your tickets and can't be changed any more. It is checked at the end of the shift like every other meal, and from restaurant 6 it can be served early from the Ready row. A screen aid only; it changes no rule. In multi-shift games a meal that was not finished at the shift's end comes back as a normal ticket.

## Two-chef helpers (extra)

The standard restaurants follow the rulebook. With exactly two players, the host can switch on these extras in the lobby under "Extras" (our own, not in the rulebook; off by default):

- A shared helper sand timer 🤝 (top bar) that either chef uses automatically when their own timers are busy, based on the neutral Helper timer of the original edition. It is paid first and goes on strike last.
- Teamwork: you may put ingredients and spices on your partner's meals and cook them — tap their row at the bottom right. Plates and serving stay with the chef who took the order, and the meal counts for them. The score table shows how often each chef helped.
- Each van trip allows two purchases (1 coin each).

## Solo campaign (extra)

"Solo campaign" on the start screen plays alone on one iPad, without any connection to other iPads. Win a restaurant to open the next one; the master chef missions open after restaurant 8. After a lost round you can try again or continue anyway. Progress is saved on the iPad per player name. The rulebook has no one-player goals, so the solo goals are our own, scaled down from the two-player goals. If every sand timer is on strike, the game ends at once, because nobody could pay a timer back.

## Publish

1. Create a new GitHub repository, for example `CangguKitchen`.
2. Upload `index.html` (and this README) to the main branch.
3. In the repository, open Settings → Pages, choose "Deploy from a branch", branch `main`, folder `/ (root)`, and save.
4. After a minute the game runs at `https://<your-username>.github.io/CangguKitchen/`.

Everything is in the single `index.html`. No account or server setup is needed.

## Start a game

1. On every iPad, open the game address in Safari, type a name and pick a colour.
2. On one iPad (the host), tap "Open the restaurant". It shows a code such as `MANGO42`.
3. On the other iPads, type that code and tap "Join".
4. The host picks the settings and taps "Set the tables", then "Start the shift" once you have made a plan.

The iPads need internet access. They do not need to be on the same Wi-Fi. If the host iPad reloads, tap "Continue …" on its start screen.

Tips for the iPads:
- In Safari, tap Share → "Add to Home Screen" and start the game from that icon. It then runs full screen, which leaves more room for the board.
- Set Settings → Display & Brightness → Auto-Lock to "Never" on the host iPad while you play. If the host iPad locks, the other iPads pause until it wakes.
- A guest iPad that reloads goes straight back into its game.

## Settings

- Sand timer: how long each action blocks a space (the board game's timers run 25–30 s).
- Shift length: 4:30 is the normal time for this scenario, 5:00 the family time.
- Wrong moves: "Allowed" plays like the board game, where meals are checked when time is up. "Blocked" stops wrong plates, wrong ingredients and overcooking.

## Game log

After each round the host iPad stores the result. "Download game log" in the menu saves all rounds as a JSON file, including each chef's meals, mistakes and number of actions.

## How it syncs

The host iPad holds the game and shares it through a free public MQTT relay (HiveMQ, with EMQX and Mosquitto as fallbacks). Only game moves and first names are sent. For testing with your own relay, add `?broker=wss://your-relay/mqtt` to the address.
