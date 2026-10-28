# Canggu Kitchen · Ink & Linen

A real-time cooperative kitchen game for 1–4 players, one iPad each, played in the browser. It adapts the eight scenarios and five Master Chef missions of Kitchen Rush Revised Edition, with its own dishes and artwork. See [the rules review](RULES-REVIEW.md) for verified mechanics and remaining differences.

## Canggu edition (beta)

`canggu/` holds the Canggu edition, the version heading for the App Store: https://ikarus-eth.github.io/CangguKitchen/canggu/. It started as a copy of this game and changes on its own; the game at the root stays as it is. It uses its own relay topic (`canggukitchen1`) and its own saved settings (`cg:` keys), so games of the two versions never mix.

New so far: difficulty presets (Chill, Normal, Hectic, Full Canggu), cancelling a working chef, radar pings with "On it!" claims, and three team moments (birthday table, melting delivery, influencer). Tests: `node tests/canggu-regression.cjs`, `node tests/canggu-browser.cjs` (static server on :8765), and the shared tests with `KC_HTML=canggu/index.html` or `BASE_URL=http://localhost:8765/canggu/`.

## Restaurants

1. Your first restaurant — one sand timer each, 8 friends as guests, every chef serves 2 meals. Wrong ingredients can be put back.
2. The first week — adds the greenhouse with spices, a second sand timer each, 22 more guests, and plates one size bigger are allowed. No more putting back. The team serves 8 meals (3 players).
3. Cleaning up — most plates start dirty and must be washed at the sink, guests buy a drink (+1 coin) when seated, served meals pay their price, and unserved orders cost a free drink. Botched meals can be binned. The team earns 25 coins (34 in challenge mode).
4. The big rush — two shifts with a break, the Shop on the floor plan buys 5 of one ingredient, 3 cheap spices or 2 expensive spices for 1 coin, and 18 demanding ⭐ guests join. Between shifts served meals pay, unfinished meals carry over, mistakes are thrown away. The team earns 35 coins (48 in challenge mode).
5. Spoiled ingredients — bread and pasta live only in storage room 3, and after every shift the chefs take a salary of 3 coins per sand timer (18 for three chefs). If the office can't pay, the restaurant closes. Challenge mode: end with 14 coins.
6. The press — reputation ⭐: served ⭐ guests +1, ⭐ guests left waiting −1. Serve finished meals early in the dining room for a tip 🛎️ (a wrong early meal costs 1 more reputation). Throw 1–2 guests out at the reception; their replacements buy no drinks. Goal: pay all salaries and reach 4 reputation (challenge: 16 coins and 7).
7. The first star — VIP guests 👑 order two dishes and only pay if both are right (+2 / −2 reputation). Reputation wins awards 🏆. Four shifts. Timers that can't be paid go on strike; the Office on the floor plan brings them back for 3 coins. Goal: 10 coins, 11 reputation, nobody on strike.
8. Setbacks — storage room 2 is locked and one stove is broken; a shared temp 🤍 helps whoever has no free timer. The office calls the locksmith or technician, hires a second temp or buys plates. Goal: 12 coins, 11 reputation, nobody on strike.

Master chef missions (rules of restaurant 8): Equality, Striking workers, Kitchen rush, Empty storage rooms, Special challenge.

Adaptations: dish recipes and prices, award effects and thresholds, office card prices, and automatic selection of unpaid workers (temps first, then each player’s second worker). These are not verified reproductions of the printed cards. The optional 24-card event deck is not included.

Goals scale with the number of players, as in the board game.

## Putting meals aside

Tap Set aside twice on a ticket to put the meal aside: it shrinks into the set-aside row beside your tickets. Tap the card, then Back to my orders to resume working on it. It is checked at the end of the shift like every other meal, and from restaurant 6 it can be served early from the Ready row. This is an optional screen aid; it does not certify the meal as correct. In multi-shift games a meal that was not finished at the shift's end comes back as a normal ticket.

## Two-chef helpers (extra)

The standard restaurants use the revised edition as their rules baseline. With exactly two players, the host can switch on these extras in the lobby under "Extras" (our own, not in the rulebook; off by default):

- A shared helper sand timer 🤝 (top bar) that either chef uses automatically when their own timers are busy, based on the neutral Helper timer of the original edition. It is paid first and goes on strike last.
- Teamwork: you may put ingredients and spices on your partner's meals and cook them — tap their row at the bottom right. Plates and serving stay with the chef who took the order, and the meal counts for them. The score table shows how often each chef helped.
- Each van trip allows two purchases (1 coin each).

## Solo campaign (extra)

"Solo campaign" on the start screen plays alone on one iPad, without any connection to other iPads. Win a restaurant to open the next one; the master chef missions open after restaurant 8. After a lost round you can try again or continue anyway. Progress is saved on the iPad per player name. The rulebook has no one-player goals, so the solo goals are our own, scaled down from the two-player goals. If every sand timer is on strike, the game ends at once, because nobody could pay a timer back.

## Publish

The game is deployed on GitHub Pages at https://ikarus-eth.github.io/CangguKitchen/.

Pages serves the `main` branch from `/ (root)`. Keep `index.html`, `design.css`, `reference.css`, `refinement.css`, `overview.css`, `.nojekyll`, and `assets/` together. A push to `main` updates the game after GitHub completes its Pages deployment.

No build step is required for GitHub Pages. `node build.mjs` also produces a portable `dist/` folder for other static hosts. The `.openai/hosting.json` manifest belongs to the separate Sites preview and is not needed by GitHub Pages.

The illustrated edition uses a zoomable kitchen plan, live stock quantities, and four selectable overhead chef characters. Choose a chef on the start screen; all of your workers wear the same apron colour.

## Start a game

1. On every iPad, open the game address in Safari, type a name and choose a chef.
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
- Meal checks: “At shift end” keeps quantities and recipes visible without live correctness hints. Every mistake is listed in the shift report. “Practice: live hints” gives immediate help and blocks wrong plates, excess ingredients/spices and overcooking.
- Standing spaces have visible green dashed rings, apron-coloured occupied rings, and distinct locked/broken markings. My chefs lets you release a finished worker without starting a new visit.
- Shopping can split one ingredient bundle between eligible storerooms. General ingredient and spice supplies are finite, and availability is shown in the Shop.
- At the end of a shift, new worker placements are closed. An action already under way runs as long as its sand timer, and at least 10 seconds; a banner counts down. An action nobody finished (a forgotten Done) then closes by itself, so the shift report always appears.
- Picking a plate, ingredient or spice shows where it went: the item flies to the ticket, the ticket line flashes and the shelf shows −1. Empty shelves are greyed out and stamped EMPTY; a shelf with one left is marked amber.
- In the dining room a sheet shows the waiting guests at full size. Tapping a guest on the plan without a chef there opens the same card as a preview.
- Shopping: choose one of three tabs (ingredient, cheap spices, expensive spices). For an ingredient, a slider splits the delivery between Storage A (purple) and Storage B (teal); tapping an item also moves the split.
- Plates: clean plates sit on a cream tray labelled “Clean plates”; dirty plates on a terracotta tray labelled “Dirty plates” at the sink, stained, with a wash arrow between them. A taken plate shows as a green chip on the ticket.
- Landscape iPads put the player's chefs, the current instruction and the waiting guests' full orders in a column left of the plan; portrait shows the guest list under the tickets. On the plan each guest is a card with the dish picture and name.

## Game log

After each round the host iPad stores the result. "Download game log" in the menu saves all rounds as a JSON file, including each chef's meals, mistakes and number of actions.

## How it syncs

The host iPad holds the game and shares it through a free public MQTT relay (HiveMQ, with EMQX and Mosquitto as fallbacks). Only game moves and first names are sent. For testing with your own relay, add `?broker=wss://your-relay/mqtt` to the address.

## Verification

`node tests/rules-regression.cjs` checks core rules and mistakes. `node tests/run-simulations.cjs` runs 215 simulated games across all scenarios. `tests/browser-regression.cjs` uses Playwright against a static server (`BASE_URL`, default `http://localhost:8765/`) to check scenario capacities, iPad layouts, fixed meal titles, shopping and reports. Set `BROWSER_CHANNEL=chrome` to use installed Chrome.

## Linen interface update (28 October 2026)

Standard play confirms actions, never recipe correctness. Wrong plates, unrelated or excessive ingredients, and overcooking remain possible. The selected order receives your action; taking another plate never silently switches to a different order. Set aside is an unchecked player decision. Practice mode retains its explicit checks.

Use Stations for full-size station buttons with the same occupancy and timers as the plan. Storage, spices and washing open an action tray; Plates opens every stocked plate size without recipe filtering. On landscape iPads the tray sits beside the plan; on narrower screens it sits above the tickets. Recipe titles and action footers stay visible while the recipe scrolls. Pickup receipts confirm the item and destination, without success colours or correctness warnings.

The visual pass unifies typography, icons, stock labels, status controls, panels and results. The service ledger starts with goals and contributions, with expandable per-chef meal details. Gameplay artwork remains decorative; actual inventory and worker capacities still come from the rules engine.

`node tests/refinement-regression.cjs` checks standard/practice separation, explicit plate targeting, neutral feedback, large controls, pinned actions and report disclosure. It uses the same browser environment variables as the existing browser suite.

## Plan-first overview

The full floor plan gets the main screen. Orders appear as compact summaries with plate, cooking and ingredient have/recipe counts. Tap an order to open its full recipe and actions. Storage and spice visits open a work menu with large choices and the selected recipe; Back to plan closes the menu without ending the visit. Reopen it from the Storage/Spices button. Plate, wash, shop and dining controls remain in their dedicated menus.

Landscape iPads reserve 236 pixels for up to four order summaries. Portrait layouts use two columns. Larger order collections use more rows; exceptionally large collections can scroll. Nothing in the overview grades a standard-mode meal. Rejoining games, disconnect pauses and the public version's shop and reception behavior are retained.
