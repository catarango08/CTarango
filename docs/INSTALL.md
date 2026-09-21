# Getting it on the iPhone and iPad

One thing up front: **iOS cannot run the server itself.** There is no Node on
iPhone or iPad, so "running it local" means the server runs on a computer or a
host somewhere and the phone opens it in Safari. Once it is open, *Add to Home
Screen* makes it a real app — full screen, TE icon, no Safari chrome.

Pick the path that matches how you work.

| | Works in the truck? | Needs a computer? | Setup |
| --- | --- | --- | --- |
| **A — Mac or PC on your Wi-Fi** | No, shop only | Yes, left running | 5 min |
| **B — Tailscale** | Yes | Yes, left running | 20 min |
| **C — Vercel** | Yes | No, iPad is enough | 15 min |

**If you want one answer: C.** A truck app that only works in the shop driveway
is not a truck app, and C is the only option that does not depend on a machine
at home staying awake.

---

## Before any of them: set a passcode

The app has a customer list and writes to your Notion. Anything reachable beyond
your own Wi-Fi needs `APP_PASSCODE` set, or anyone with the address is in.

```
APP_PASSCODE=1874          # any string; you type it once per device per 90 days
```

With it unset the app is wide open — which is fine on your own laptop, and the
setup screen says so in red if you forget.

---

## A — Mac or PC on the same Wi-Fi

Good for trying it at the shop bench. It only works while both devices are on
the same network and the computer is awake.

On the computer:

```bash
git clone https://github.com/catarango08/CTarango.git
cd CTarango
npm install
cp .env.example .env.local        # add NOTION_TOKEN and APP_PASSCODE
npm run build
npm start -- -H 0.0.0.0           # listen on the network, not just localhost
```

Find the computer's address — on a Mac, System Settings → Wi-Fi → Details, a
number like `192.168.1.42`. On the iPhone, open `http://192.168.1.42:3000`.

macOS will ask to allow incoming connections the first time. Say yes.

---

## B — Tailscale

Same as A, but reachable from anywhere without putting anything on the public
internet. Tailscale is a private network between your own devices; it is free
for personal use.

1. Install Tailscale on the computer and on both iOS devices, signed into the
   same account.
2. Run the app on the computer exactly as in A.
3. On the phone, open `http://<computer-name>:3000` — Tailscale gives the
   computer a name like `mac-mini`.

Downside: if the computer sleeps, the app is gone. A Mac mini that stays on is
ideal; a laptop that goes in a bag is not.

---

## C — Vercel  *(recommended)*

Free, always on, works on cell service, and you can do the whole thing from the
iPad. Vercel made Next.js, so this app needs no changes to run there.

1. **Sign in** at vercel.com with the GitHub account that owns this repo.
2. **Add New → Project**, pick `catarango08/CTarango`, and set the branch to
   `claude/electrical-service-app-design-xe9ndb` (or merge the PR to `master`
   first and leave it on the default).
3. **Environment Variables** — add these two before the first deploy:
   - `NOTION_TOKEN` — the integration secret (see below)
   - `APP_PASSCODE` — whatever you want to type on your phone
4. **Deploy.** You get an address like `ctarango.vercel.app`.

Every push to that branch redeploys on its own.

### The Notion token

Do this once, on any device:

1. notion.so/my-integrations → **New integration**, name it "Tarango field
   desk", give it read, update and insert content.
2. Copy the secret — it starts `ntn_`. That is `NOTION_TOKEN`.
3. Open the **Tarango Electric OS** page in Notion → **⋯** → **Connections** →
   add the integration. Sharing the parent page shares all nine databases under
   it.

The database ids are already in `notion.config.json`, so the token is the only
secret you supply. Until it is set, the app runs on sample data and says so in
the sidebar.

---

## Add it to the home screen

Once you can open the app in Safari on the device:

1. Tap **Share** (the square with the arrow).
2. **Add to Home Screen**.
3. Name it **Tarango**. Tap **Add**.

You get the TE icon on the home screen, and it opens full screen with no address
bar. Long-press the icon for quick actions: **New call**, **Jobs**, **Rate book**.

Do it on the iPad too. They are separate installs and each remembers its own
passcode for 90 days.

### Worth knowing on iOS

- **The camera works from the browser.** The photo uploader opens the camera
  directly — the closeout photos do not need a separate app.
- **Day and night** follow the toggle in the sidebar, not the iOS setting, and
  each device remembers its own.
- **It needs a signal.** This is a server-rendered app; there is no offline mode.
  In a metal building with no bars, it will not load. Take the photos with the
  camera app and attach them when you have service.
- **A home-screen app has its own cookie jar.** Signing in inside Safari does not
  sign in the installed icon; you will type the passcode once in each.

---

## Which to actually pick

Start with **C**. It is the only one that works at a customer's house, it costs
nothing at this size, and it does not care whether anything at home is turned on.
Use **A** if you only want to look at it at the bench before committing, and
**B** if you would rather nothing about the business sit on the public internet
at all — that is a reasonable position, it just costs you a machine that never
sleeps.
