# Home Assistant Setup — Brittany's MacBook Pro

Home Assistant runs directly on Brittany's Mac (always-on, hardwired home server).
The config files live in the `Tarango/Home Assistant/` folder, which is the same
folder you see on the network as:

```
smb://Brittany's MacBook Pro._smb._tcp.local/Tarango/Home Assistant
```

Docker uses the **local path** on that machine — not the SMB path. SMB is just
how other devices on your network browse that same folder.

---

## Step 1: Find the local path of the shared folder

On Brittany's Mac, open **System Settings → General → Sharing → File Sharing**.
Click the ⓘ next to File Sharing, then look at the shared folders list.
Find the `Tarango` folder and note its path — it will look like:

```
/Users/brittany/Tarango
```

So the full path for Home Assistant is:
```
/Users/brittany/Tarango/Home Assistant
```

---

## Step 2: Install Docker Desktop on Brittany's Mac

1. Download Docker Desktop for Mac (Intel chip): https://www.docker.com/products/docker-desktop/
2. Install and open it — let it finish starting up
3. Verify in Terminal:
   ```bash
   docker --version
   ```

---

## Step 3: Copy the project files to Brittany's Mac

From this project, copy the entire `homeassistant/` folder into Brittany's
Mac at `~/Tarango/Home Assistant/`. You can do this two ways:

**Option A — via the SMB share from another Mac:**
```
Finder → Go → Connect to Server → smb://Brittany's MacBook Pro.local
```
Then drag the `homeassistant/` folder contents into the `Tarango/Home Assistant` folder.

**Option B — directly on Brittany's Mac:**
```bash
# In Terminal on Brittany's Mac:
mkdir -p ~/Tarango/Home\ Assistant
cd ~/Tarango/Home\ Assistant
# Then copy or clone the project files here
```

---

## Step 4: Start Home Assistant

Open Terminal on Brittany's Mac and run:

```bash
cd ~/Tarango/Home\ Assistant
docker compose up -d
```

First boot takes 2–3 minutes while it downloads the image and initializes.
HA will be available at **http://localhost:8123** on Brittany's Mac,
and at **http://Brittanys-MacBook-Pro.local:8123** from any other device on your network.

---

## Step 5: Complete the onboarding

1. Open **http://Brittanys-MacBook-Pro.local:8123** in any browser on your network
2. Create your admin account (write down these credentials)
3. Set home location: San Antonio, TX
4. Set timezone: America/Chicago
5. HA will scan your network and suggest devices it finds — add anything relevant

---

## Step 6: Add your smart devices

### Smart Lights (Wi-Fi)
Settings → Devices & Services → Add Integration → search your brand:
- **Philips Hue** — needs Hue Bridge on same network
- **TP-Link Kasa** — auto-discovered, just sign in
- **LIFX** — auto-discovered on same Wi-Fi
- **Wyze** — requires HACS first (see Step 8)

After pairing, rename devices to match these config files:
- `Living Room Lights`, `Kitchen Lights`, `Kids Room Lights`, `Porch Light`

### Thermostat
- **Nest** → Settings → Add Integration → "Nest" (needs Google Cloud project — HA walks you through it)
- **Ecobee** → Settings → Add Integration → "Ecobee" → enter API key from ecobee.com

### Smart Locks
- **August / Yale** → Add Integration → "August" → sign in with August account
- **Schlage** → Add Integration → "Schlage"

Rename to: `Front Door`, `Back Door` to match the automation configs.

### Cameras
- **Ring** → Add Integration → "Ring" → sign in
- **Reolink** → Add Integration → "Reolink" → enter camera IP + credentials
- **Wyze** → requires HACS (see Step 8)

---

## Step 7: Update entity IDs in the config files

After adding devices, HA assigns entity IDs like `light.tp_link_kasa_living_room`.
You need to update the placeholder IDs in the config files to match yours.

1. In HA go to **Developer Tools → States**
2. Find your actual entity IDs
3. Edit these two files (open them from Finder via the SMB share or directly on Brittany's Mac):
   - `config/scenes.yaml` — uncomment and update the entity IDs
   - `config/automations.yaml` — uncomment and update the entity IDs
4. Restart HA: Settings → System → Restart

---

## Step 8: Install HACS (optional, needed for Wyze)

HACS = Home Assistant Community Store. Adds integrations not in the official list.

```bash
# Run on Brittany's Mac:
docker exec -it homeassistant bash -c "wget -O - https://get.hacs.xyz | bash -"
docker restart homeassistant
```

Then in HA: Settings → Devices & Services → Add Integration → HACS

---

## Step 9: Generate a Long-Lived Access Token

This lets the Family Command Center dashboard talk to HA.

1. In HA, click your **profile icon** (bottom-left corner)
2. Scroll to **Long-Lived Access Tokens**
3. Click **Create Token**, name it `command-center`
4. **Copy the token immediately** — you can only see it once

---

## Step 10: Connect the Family Command Center

1. Find Brittany's Mac IP address:
   ```bash
   # On Brittany's Mac:
   ipconfig getifaddr en0
   ```
   Example result: `192.168.1.42`

2. Create `.env.local` in the command center project root:
   ```env
   NEXT_PUBLIC_HA_URL=http://192.168.1.42:8123
   NEXT_PUBLIC_HA_TOKEN=paste_your_token_here
   WEATHER_LAT=29.4241
   WEATHER_LON=-98.4936
   ```

   > Tip: You can also use the hostname instead of IP:
   > `NEXT_PUBLIC_HA_URL=http://Brittanys-MacBook-Pro.local:8123`
   > IP is more reliable if the hostname ever changes.

3. Restart the command center dev server:
   ```bash
   npm run dev
   ```

The dashboard footer will change from "Demo Mode" to "HA Connected".

---

## Keeping HA running reliably on Brittany's Mac

Since the Mac is already always-on and hardwired, most of this is already handled.
Just make sure:

1. **Docker auto-starts:** Docker Desktop → Settings → General → ✅ "Start Docker Desktop when you log in"
2. **Container auto-restarts:** Already set in docker-compose.yml (`restart: unless-stopped`)
3. **Static IP via router:** Log into your router → DHCP Reservations → find Brittany's Mac by MAC address → assign fixed IP (e.g., `192.168.1.10`). This ensures `.env.local` never needs updating.
4. **macOS auto-login (optional):** System Settings → Users & Groups → Automatically log in as Brittany. Needed so Docker starts on reboot without manual login.

---

## Useful commands (run on Brittany's Mac)

```bash
# View live HA logs
docker logs homeassistant -f

# Restart HA
docker restart homeassistant

# Stop HA
docker compose -f ~/Tarango/Home\ Assistant/docker-compose.yml down

# Update HA to latest version
cd ~/Tarango/Home\ Assistant
docker compose pull && docker compose up -d

# Manual config backup
cp -r ~/Tarango/Home\ Assistant/config \
      ~/Tarango/Home\ Assistant/config-backup-$(date +%Y%m%d)
```

---

## Accessing HA from around the house

| Device | URL |
|--------|-----|
| Any browser on home network | http://Brittanys-MacBook-Pro.local:8123 |
| Wall-mounted tablet | http://192.168.1.42:8123 (use static IP) |
| Command Center dashboard | Configured via `.env.local` |
| Outside your home (advanced) | Requires Nabu Casa ($7/mo) or VPN setup |

---

## Recommended Wi-Fi Smart Devices

| Category | Budget | Mid-Range | Premium |
|----------|--------|-----------|---------|
| Bulbs | Wyze ($8) | TP-Link Kasa ($12) | LIFX ($40) |
| Switches | Treatlife ($15) | TP-Link Kasa ($18) | Lutron Caseta ($55) |
| Thermostat | — | Honeywell T9 ($150) | Ecobee ($180) |
| Lock | — | Wyze Lock ($80) | August Wi-Fi ($200) |
| Camera | Wyze Cam v3 ($25) | Reolink ($45) | Ring Indoor ($60) |
| Doorbell | Wyze Video Doorbell ($30) | Reolink ($80) | Ring ($100) |
