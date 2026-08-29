# Demo script

A timed presenter script. Fourteen minutes end to end, plus two optional beats.
Read it once, run it once, then present it.

Every beat has three parts: **Do** (what you click), **Say** (out loud), and
**Point at** (the number on screen that carries the beat). The numbers below are
the seeded ones — they are exact, so if the screen disagrees, something is
wrong and it is worth stopping to find out.

Names used here: the store is **Aurora Supply Co.**; the admin brands itself as
Shopify, per the owner's reversal of the old "never render the name or logo"
rule (DECISIONS, 2026-08-29). Say plainly what this is — a study clone built to
be indistinguishable from the real admin, never deployed and never distributed.

---

## Beat 0 — Before the clock starts

Five minutes of setup, none of it on camera.

```bash
docker compose up -d
pnpm db:reset                                    # fresh seed: orders end at #1040
pnpm dev
pnpm --filter @merchant/worker run echo -- --port 4100   # webhook receiver, in its own terminal
```

Then, in the admin:

1. **Apps → Create app.** Name it `Fulfilment partner`, tick the Orders scope,
   create. The API token is shown once — close it, you do not need it.
2. On the app's page, **Add webhook**: Event **Order payment** (`orders/paid`),
   URL `http://localhost:4100/webhooks`. Add a second one on **Order creation**
   (`orders/create`) at the same URL. Each signing secret is shown once; the
   echo receiver reads them from the database, so you can dismiss them.
3. Open five tabs and leave them there: admin Home, admin Analytics, the
   storefront http://demo.lvh.me:3002, Mailpit http://localhost:8025, and the
   terminal running the echo receiver.

Check before you start: Mailpit is empty, the delivery log is empty, and the
last seeded order is **#1040**. The first order you place live will be **#1041**.

---

## Beat 1 — 0:00 Log in

**Do.** http://admin.lvh.me:3000 → `owner@demo.dev` / `password123` → **Log in**.

**Say.** "This is one deployment serving every store on it. I am logging in as
the owner of one of them."

**Point at.** The Home greeting — *"Good morning, Aurora Supply Co."* — and the
dashboard under it: the date-range and comparison pills, four metric tiles
(**Total sales $6,559.11**, **Orders 24**, Sessions, Average order value, over
Last 30 days), the two-series sales chart against the previous period, and the
Total sales breakdown beside it.

There is **no setup guide on this Home**, and that is the thing to say if anyone
asks. Its four tasks are checked from real state rather than a stored flag, and
Aurora has products, a theme, a processor and orders — so the card hides itself,
the way Shopify's does once a store is set up. Beat 9 shows the other half of
that: a brand-new store where the same card appears at 1 of 4.

---

## Beat 2 — 1:00 The admin tour

Move fast. Two minutes, six pages, no clicking into detail unless asked.

**Do → Say → Point at**, one nav item at a time:

- **Products.** "Thirty-two products, a hundred and thirty-three variants."
  Point at the tabs and the search field, then open one product and point at the
  two-column form — title, description, media and variants on the left; status,
  publishing and organization on the right. Change the title and stop: point at
  the **save bar** that slides in from the top, then discard.
- **Orders.** "Forty orders over the last sixty days, in the states a real store
  is in." Point at the mixed badges — Paid, Partially fulfilled, Refunded — and
  at the count on the Orders nav item.
- **Customers.** "Twenty-five, with their order counts and lifetime spend
  computed, not stored decoratively."
- **Discounts.** Point at **WELCOME10**, Active. "We will use this one in a
  minute."
- **Inventory.** "Two locations." Point at the location switcher, then edit an
  Available cell so the Save button appears — and discard. "Every change goes
  through the adjustment service, so there is a history row behind each number."
- **Analytics.** Set the range to **Last 30 days**. Same chrome as Home, then
  the rest of the report: Total sales by sales channel, Total sales by product,
  and the conversion funnel — Sessions → Viewed a product → Added to cart →
  Reached checkout → Purchased — with Live view under it. "Remember the Orders
  number. We are going to move it."

---

## Beat 3 — 3:30 Build the storefront with AI

**Do.** Nav → **Storefront**. The screen splits: chat on the left, a live
preview of the real storefront on the right. Toggle the preview to mobile and
back, and switch the page selector from Home to Product.

**Say.** "This is the storefront builder. The preview on the right is not a
mockup — it is the actual storefront rendering a draft theme."

**Do.** If the server has an `ANTHROPIC_API_KEY`, type something concrete —
*"Make it feel like a winter outfitter: near-black, one accent, big type, and
put the featured collection above the testimonials"* — and send. The model
returns a complete theme document; it is validated before it is ever previewed.

If there is no API key, say so and use the presets: **Apply** on **Monochrome**.
Toast reads *"Monochrome applied"*.

**Do.** **Publish** → the dialog asks *"Publish this theme?"* → **Publish**.

**Point at.** The toast *"Theme published"* and the **Live** badge on the
version you just published. Then the version list: "Every generation is a
version. You can restore any of them."

> Timing note: Publish pings the storefront's revalidation hook, so the live
> shop flips within a second or two (measured live, repo review 2026-08-29).
> If the ping ever misses (its one dev-mode gap: the route's first compile),
> the 60-second cache is the fallback — reload once.

---

## Beat 4 — 5:30 Open the shop

**Do.** Switch to http://demo.lvh.me:3002 and reload.

**Say.** "Same deployment, different hostname. The subdomain is what resolves
the tenant — there is no per-store deployment anywhere in this."

**Point at.** The theme you just published: the colours, the type and the
sections are the ones from Beat 3. Scroll past the hero to the product grid.

**Do.** Open **Basin Wool Socks** → choose size **M** → **Add to cart** →
*"Added to your cart."* → **View cart** → **Check out**.

**Point at.** The price: **$18.00**.

---

## Beat 5 — 6:30 Checkout, declined then paid

The checkout is a single page: express row, Contact, Delivery, Payment on the
left; the order summary on the right.

**Do.** Fill Contact and Delivery:

```
Email       demo@example.dev
First name  Alex        Last name  Rivera
Address     100 Test Street
City        Portland    State  OR    ZIP code  97201
```

Tab out of the ZIP field. The shipping rates only appear once the address is
complete — pick **Standard shipping (3–5 days)**.

**Point at.** The sidebar: subtotal **$18.00**, shipping **$8.95**, tax
**$1.53** (a flat 8.5%), total **$28.48**.

### 7:00 — the decline

**Do.** In Payment, enter `4000 0000 0000 0002`, expiry `12/29`, CVC `123`, name
`Alex Rivera`. **Pay now**.

**Say.** "That is the test card that declines. Two things matter here. The card
number never touched our checkout server — it went straight to the vault, which
returned a token. And a decline is not a failure of the checkout."

**Point at.** The red banner above the card fields: *"Your card was declined."*
The checkout is still open, still filled in, still payable. "A decline also does
not cascade to another processor. The card was rejected; retrying it elsewhere
would be shopping for a yes."

### 7:45 — the sale

**Do.** Replace the number with `4242 4242 4242 4242`, same expiry and CVC.
**Pay now**.

**Point at.** The thank-you page: **Confirmation #1041**, total **$28.48**.

> Optional, ten seconds: before paying, type `WELCOME10` into the discount box
> and **Apply**. The sidebar shows **−$1.80** and the total becomes **$26.53**.
> Remove it, or keep it and use $26.53 for the rest of the script.

---

## Beat 6 — 8:30 The order in the admin

**Do.** Back to the admin → **Orders** → search `#1041` → open it.

**Say.** "Same order, thirty seconds old, in the merchant's admin."

**Point at.** The total **$28.48** matching the thank-you page; the **Paid** and
**Unfulfilled** badges; the customer created from the checkout email on the
right; and the timeline at the bottom — order placed, payment captured.

---

## Beat 7 — 9:30 Analytics, email, webhook

Three tabs, twenty seconds each.

**Do.** **Analytics** → range **Today**.

**Point at.** **Orders: 1** and **Total sales $28.48**, and the **Live view**
card — visitors in the last thirty minutes, and orders today. "Purchases are
recorded server-side at order creation, so revenue is not something a browser
told us."

**Do.** Switch to **Mailpit** (http://localhost:8025).

**Point at.** The order confirmation email that arrived for `demo@example.dev`,
with the same total. "Sent by the worker, off a queue."

**Do.** Switch to the **echo receiver terminal**.

**Point at.** Two deliveries — `orders/create` and `orders/paid` — each printed
with **✓ signature verified**. "Every webhook is HMAC-signed with a per
subscription secret, and retried five times with backoff if a receiver is down."

**Do.** Admin → **Apps** → your app.

**Point at.** The delivery log: both topics, status delivered, response 200,
attempt count 1.

---

## Beat 8 — 11:00 Refund it

**Do.** Back to order **#1041** → **Refund**. Set the line quantity to **1** and
the shipping amount to **8.95**.

**Point at.** The button pricing itself: **Refund $28.48**. Click it.

**Point at.** The toast *"Refund issued"*, the order's financial status now
**Refunded**, and the new timeline entry. "That refund went back through the
same processor that captured the payment, against the same transaction."

---

## Beat 9 — 12:00 A second shop, from nothing

This is the beat that proves the platform, and nothing about it is prepared.

**Do.** Open http://admin.lvh.me:3000/signup in a new tab. Store name
**Northwind Goods**, your name, an email nobody has used, password
`password123`. **Create store**.

**Say.** "New store, new tenant, same deployment. Signing up logs me in."

**Point at.** The URL — `/store/northwind-goods` — "the store URL was derived
from the name and de-duplicated server-side" — and the Home setup guide, which
Aurora's Home did not show, here at **1 of 4 tasks complete**: the store already has a published theme,
because signup installs one so a new shop never opens on a blank page.

**Do.** Click **Products**.

**Point at.** The empty state: *"Add your first product."* "Not an empty table.
The demo store's thirty-two products are two hundred milliseconds away in the
same database, and this store cannot see one of them. Every query in the API
runs through a client that injects the shop id — it is not something a
developer has to remember at each call site."

**Do.** Open `http://northwind-goods.lvh.me:3002`.

**Point at.** A real storefront, on the default theme installed at signup, with
the new store's name on it and none of Aurora's products. Then flip back to
http://demo.lvh.me:3002 — untouched.

---

## Beat 10 — 13:30 Close

**Say.** "One deployment. Every store gets an admin, a themed storefront, a
checkout that never sees a card number, its own payment routing, its own
analytics and its own webhooks — and cannot see another store's data. What you
just watched took fourteen minutes and nothing was pre-recorded."

---

## Optional beats

Keep these in your pocket for questions. Neither is in the fourteen minutes.

### Processor failover — "what if a processor goes down?"

Set up: Settings → **Payments** → connect **Maverick** (no credentials needed;
it runs simulated) alongside Mock Gateway, and leave both enabled.

**Do.** Check out again with `4000 0000 0000 0119`.

**Say.** "This card makes a processor fall over — a network-level failure, not a
decline. The router fails the payment over to the next processor in the chain,
and it approves there."

**Point at.** The successful thank-you page, then the order's payment record
naming the processor that actually took it. "Hard failures fail over. Declines
never do."

### Charge a saved card — "can you bill a customer again?"

**Do.** Orders → open any order for `marcus.oyelaran@example.com` → the
**Payment methods** card on the right → **Charge** → the amount is prefilled.

**Point at.** The *"payment collected"* toast and the new captured payment on
the order. "That is the repeat-billing primitive: a reusable token plus a charge
API. A subscription engine on top of it is a scheduler, not a payments problem."

---

## If something goes wrong

- **The admin bounces you to /login mid-demo.** Another dev stack has taken port
  3001 and your session id is not in its Redis. `pnpm stack status`, then
  `pnpm stack up`.
- **The storefront still shows the old theme.** Publish revalidates it within
  ~2s; if that ping missed, the fallback cache expires in 60 seconds. Wait and
  reload.
- **No shipping rates at checkout.** The address is not complete yet — every
  required field, then blur the last one.
- **The order number is not #1041.** Someone has placed orders since the last
  `pnpm db:reset`. Read the number off the thank-you page and use that one.
- **The delivery log shows failed.** The echo receiver is not running, or is on
  a different port than the subscription URL.
