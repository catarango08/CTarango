# A day in the system

This is how the pieces are meant to fit together on a working day. It doubles as a tour
of the screens.

## The call comes in

Someone calls about a panel that trips. The dispatcher logs an **Interaction** against the
customer (channel: Inbound Call) and creates a **Job** with the problem *in the customer's
own words* — the schema help text says as much, because a paraphrased complaint is how
callbacks start.

If the customer is new, the **Customer** record captures the lead source. That field is
what makes the *lifetime value by lead source* report on `/reports` worth reading: it is
the difference between "we get a lot of Google calls" and "Google calls are worth $18k a
year and yard signs are worth $60k."

The job lands **Unscheduled** and shows up in the backlog column on `/dispatch`.

## Dispatch

`/dispatch` is five days by crew. Each cell shows the jobs assigned to that tech that day
and the hours booked; multi-day work is pro-rated across the days it spans, so a 26-hour
rough-in reads as three ordinary days rather than one impossible one. Over 10 hours in a
day is flagged.

Before assigning, the dispatcher can see the tech's skills on the row. The **Team** page
carries the other half of that decision: licenses, certifications and their expiry dates.
A lapsed license is a critical alert on the dashboard, and the reason is practical — you
cannot pull a permit under it.

## On site

The tech opens the job and sees what they actually need before ringing the bell:

- the **Service Location**'s panel make, service size and voltage
- **known hazards** and arc flash PPE category
- **access notes** — gate codes, lockbox, dogs, the fact that the driveway is soft

They clock in (a **Time Entry**, typed Labor / Travel / Warranty), photograph the existing
condition, and work.

## Photos

Photos are not a nice-to-have; they are the defence in a dispute and the best selling tool
you have. The uploader is on the job page and the library, takes several files at once,
opens the camera on a phone, and writes each one straight into Notion storage with:

- **stage** — Before, During, After, Code Violation, Thermal Scan, Equipment Label…
- **where on site**, tags, and *Include in customer report*
- links to the job, the customer and the location in one write

The job page groups them by stage. `/photos` filters the whole library by stage, tag, job
or customer, which is how you answer "show me every FPE panel we have photographed."

## Finishing the job

The tech fills in diagnosis, work performed and — the field that pays for the system —
**recommendations**. Anything they noticed but did not fix is future work, and the job
page offers to turn it into an estimate.

Materials consumed get logged as **Material Usage**, which decrements the truck stock
picture on `/inventory` and gives the job a real material cost rather than an estimated one.

## Money

An **Estimate** carries costed line items, so the margin is on screen before it is sent.
Options are tiered Good / Better / Best. Declines record a reason, and `/estimates` shows
the tally — losing on price and losing on timing call for different responses.

An **Invoice** rolls up payments; `recalculateInvoice` sets the balance and moves the
status. `/invoices` shows A/R aging, days-sales-outstanding, and the field that most
contractors learn about the hard way: the **lien deadline**. If a balance is open and the
clock is inside two weeks, it is a critical alert on the dashboard.

## Permits and compliance

`/permits` tracks the application, the inspection appointment and the result. A failed
inspection with corrections is a critical dashboard alert, because it blocks cover and
nothing else in the schedule can move until it clears.

`/safety` holds the JHAs, LOTO records, energized work permits and incidents — hazards
identified, PPE required, voltage level, controls applied. The day you need this
documentation, you need all of it.

## What the dashboard watches for you

`/` leads with alerts, in severity order, all computed from the data rather than entered
by hand:

| Alert | Why it matters |
| --- | --- |
| Expired or expiring license | You cannot pull a permit under a lapsed license |
| Overdue equipment calibration | Readings from an out-of-cal meter are not defensible |
| Failed inspection | Blocks cover; the schedule is already slipping |
| Lien deadline inside 14 days | Miss it and the claim is gone |
| Stock at or below reorder point | The reason a tech drives to the supply house mid-job |
| Customer on credit hold | Do not dispatch |
| Expired vehicle registration | Should not be on the road |

Beneath that: invoiced MTD, A/R, open estimate value, win rate, billable utilization and
first-time-fix rate — the six numbers that tell you whether the business is working, not
just busy.

## Recurring revenue

**Service Agreements** carry a frequency and a next-service date. Renewals and upcoming
visits surface on `/reports`. For most electrical shops this is the most under-used part of
the business: a reason to be on a property every year, and the cheapest job you will ever
sell.
