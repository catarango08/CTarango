# Home Assistant Setup — Brittany's MacBook Pro

Home Assistant Core runs directly on Brittany's Mac (macOS 12.7 Monterey,
always-on, hardwired home server) using Python — no Docker required.

Config lives at:  `~/Tarango/Home Assistant/config/`
Network path:     `smb://Brittany's MacBook Pro._smb._tcp.local/Tarango/Home Assistant`
Access HA at:     `http://Brittanys-MacBook-Pro.local:8123`

---

## Step 1: Install Homebrew

Open Terminal on Brittany's Mac:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Verify it works:
```bash
brew --version
```

---

## Step 2: Install Python 3.12

HA Core requires Python 3.12. Install it via Homebrew:

```bash
brew install python@3.12
```

Verify:
```bash
python3.12 --version
# Should print: Python 3.12.x
```

---

## Step 3: Copy the project config files

Copy the `homeassistant/` folder from this project onto Brittany's Mac.
You can drag it over the SMB share from another Mac on your network, or
clone the repo directly on Brittany's Mac.

The config folder should end up at:
```
~/Tarango/Home Assistant/config/
```

---

## Step 4: Create a Python virtual environment

```bash
cd ~/Tarango/Home\ Assistant

# Create the virtual environment
python3.12 -m venv venv

# Activate it
source venv/bin/activate

# Install Home Assistant Core
pip install homeassistant

# Verify
hass --version
```

Installation takes 3–5 minutes — it pulls in a lot of dependencies.

---

## Step 5: Start Home Assistant for the first time

```bash
cd ~/Tarango/Home\ Assistant
source venv/bin/activate
hass -c ./config
```

Watch the Terminal output. When you see:
```
Home Assistant initialized in X.Xs
```
...open a browser and go to **http://Brittanys-MacBook-Pro.local:8123**.

The first boot takes 2–3 minutes. Keep Terminal open for now.
Press `Ctrl+C` to stop once you've confirmed it works — then move on to Step 6
to make it start automatically.

---

## Step 6: Auto-start HA on login (launchd)

This makes HA start automatically whenever the Mac boots or you log in.

Copy the launchd plist into place:

```bash
cp ~/Tarango/Home\ Assistant/homeassistant.plist \
   ~/Library/LaunchAgents/com.tarango.homeassistant.plist
```

Load it so it starts now (and on every future login):

```bash
launchctl load ~/Library/LaunchAgents/com.tarango.homeassistant.plist
```

Verify it's running:
```bash
launchctl list | grep tarango
# Should show a process ID in the first column
```

HA logs go to:
```
~/Tarango/Home Assistant/logs/homeassistant.log
```

---

## Step 7: Complete the onboarding

Open **http://Brittanys-MacBook-Pro.local:8123** in any browser on your network.

1. Create your admin account (write these down)
2. Home location: San Antonio, TX
3. Timezone: America/Chicago
4. HA will scan your network — add any devices it finds

---

## Step 8: Add your smart devices

Settings → Devices & Services → Add Integration → search your brand:

### Smart Lights (Wi-Fi)
- **TP-Link Kasa** — auto-discovered on your network
- **Philips Hue** — needs the Hue Bridge plugged into your router
- **LIFX** — auto-discovered
- **Wyze** — install HACS first (see Step 10), then add Wyze integration

Rename devices to match the config:
`Living Room Lights`, `Kitchen Lights`, `Kids Room Lights`, `Porch Light`

### Thermostat
- **Nest** → Add Integration → "Nest" (needs a Google Cloud project — HA walks you through it)
- **Ecobee** → Add Integration → "Ecobee" → enter API key from ecobee.com

### Smart Locks
- **August / Yale** → Add Integration → "August" → sign in
- **Schlage** → Add Integration → "Schlage"

Rename to: `Front Door`, `Back Door`

### Cameras
- **Ring** → Add Integration → "Ring" → sign in
- **Reolink** → Add Integration → "Reolink" → enter camera IP + credentials

---

## Step 9: Update entity IDs in config files

After adding devices, update the placeholder entity IDs in the config:

1. In HA go to **Developer Tools → States**
2. Note your actual entity IDs (e.g., `light.kasa_living_room`)
3. Edit these files (open from Finder via the SMB share or directly on Brittany's Mac):
   - `config/scenes.yaml`
   - `config/automations.yaml`
4. Restart HA: Settings → System → Restart

---

## Step 10: Install HACS (optional — needed for Wyze)

```bash
cd ~/Tarango/Home\ Assistant
source venv/bin/activate

# Download and run the HACS installer
wget -O - https://get.hacs.xyz | bash -
```

Then restart HA and add HACS from Settings → Devices & Services → Add Integration.

---

## Step 11: Generate a Long-Lived Access Token

Connects the Family Command Center dashboard to HA:

1. In HA click your **profile icon** (bottom-left)
2. Scroll to **Long-Lived Access Tokens** → Create Token
3. Name it `command-center`
4. **Copy it immediately** — shown only once

---

## Step 12: Connect the Family Command Center

Find Brittany's Mac IP:
```bash
# On Brittany's Mac:
ipconfig getifaddr en0
```

Create `.env.local` in the command center project root:
```env
NEXT_PUBLIC_HA_URL=http://192.168.1.42:8123
NEXT_PUBLIC_HA_TOKEN=paste_your_token_here
WEATHER_LAT=29.4241
WEATHER_LON=-98.4936
```

Restart the command center: `npm run dev`

The footer changes from "Demo Mode" → "HA Connected".

> Tip: Reserve a static IP for Brittany's Mac in your router (DHCP Reservations)
> so this address never changes.

---

## Useful commands

```bash
# Tail live HA logs
tail -f ~/Tarango/Home\ Assistant/logs/homeassistant.log

# Stop HA
launchctl unload ~/Library/LaunchAgents/com.tarango.homeassistant.plist

# Start HA
launchctl load ~/Library/LaunchAgents/com.tarango.homeassistant.plist

# Update HA to latest version
cd ~/Tarango/Home\ Assistant
source venv/bin/activate
pip install --upgrade homeassistant
launchctl unload ~/Library/LaunchAgents/com.tarango.homeassistant.plist
launchctl load ~/Library/LaunchAgents/com.tarango.homeassistant.plist

# Manual config backup
cp -r ~/Tarango/Home\ Assistant/config \
      ~/Tarango/Home\ Assistant/config-backup-$(date +%Y%m%d)
```

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
