# Home Assistant Setup Guide

Complete guide to setting up Home Assistant on your Intel MacBook and connecting it to the Family Command Center.

## Step 1: Install Docker on the MacBook

1. Download Docker Desktop for Mac (Intel): https://www.docker.com/products/docker-desktop/
2. Install and launch Docker Desktop
3. Verify it's running:
   ```bash
   docker --version
   ```

## Step 2: Start Home Assistant

```bash
cd homeassistant
docker compose up -d
```

Home Assistant will be available at **http://localhost:8123** (first boot takes 2-3 minutes).

## Step 3: Initial HA Setup (Onboarding)

1. Open http://localhost:8123 in a browser
2. Create your admin account (save these credentials!)
3. Set your home location to San Antonio, TX (or your actual location)
4. Set timezone to America/Chicago
5. HA will auto-discover devices on your network — add any it finds

## Step 4: Add Your Smart Devices

### Smart Lights (Wi-Fi)

**Philips Hue / LIFX / Wyze / TP-Link Kasa:**
1. Go to Settings → Devices & Services → Add Integration
2. Search for your brand (e.g., "Hue", "LIFX", "TP-Link Kasa")
3. Follow the pairing prompts
4. Devices appear as `light.living_room`, `light.kitchen`, etc.

**Tip:** Rename devices in HA to match the config files:
- Settings → Devices → Click device → Edit name
- Use names like: `Living Room Lights`, `Kitchen Lights`, `Kids Room Lights`, `Porch Light`

### Thermostat

**Nest:**
1. Settings → Devices & Services → Add Integration → "Nest"
2. Requires a Google Cloud project (HA docs walk you through it)
3. Appears as `climate.thermostat`

**Ecobee:**
1. Settings → Devices & Services → Add Integration → "Ecobee"
2. Enter API key from ecobee.com portal
3. Appears as `climate.thermostat`

### Smart Locks

**August / Yale:**
1. Settings → Devices & Services → Add Integration → "August"
2. Sign in with your August account
3. Appears as `lock.front_door`, `lock.back_door`

**Schlage:**
1. Most Schlage Wi-Fi locks use the Schlage Home app
2. Add via "Schlage" integration
3. Appears as `lock.front_door`

### Cameras

**Wyze:**
1. Install HACS (Home Assistant Community Store) first — see Step 5
2. Install Wyze integration via HACS
3. Cameras appear as `camera.front_yard`, etc.

**Ring:**
1. Settings → Devices & Services → Add Integration → "Ring"
2. Sign in with Ring credentials
3. Cameras + doorbell appear automatically

**Reolink:**
1. Settings → Devices & Services → Add Integration → "Reolink"
2. Enter camera IP address and credentials

## Step 5: Install HACS (Optional but Recommended)

HACS gives you access to community integrations not in the official list.

```bash
# Run inside the HA container:
docker exec -it homeassistant bash -c "wget -O - https://get.hacs.xyz | bash -"
```

Then restart HA and add HACS from Settings → Devices & Services.

## Step 6: Update Entity IDs

After adding devices, update the config files to use YOUR entity IDs:

1. Go to Developer Tools → States in HA
2. Find your actual entity IDs (e.g., `light.philips_hue_living_room`)
3. Edit these files and replace placeholder IDs:
   - `config/scenes.yaml`
   - `config/automations.yaml`
4. Restart HA: Settings → System → Restart

## Step 7: Generate a Long-Lived Access Token

This connects the Command Center dashboard to HA:

1. In HA, click your profile icon (bottom-left)
2. Scroll to "Long-Lived Access Tokens"
3. Click "Create Token"
4. Name it: `command-center`
5. Copy the token (you can only see it once!)

## Step 8: Connect the Command Center

1. Find your MacBook's local IP:
   ```bash
   # On the MacBook:
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   Example: `192.168.1.42`

2. In the command center project, create `.env.local`:
   ```env
   NEXT_PUBLIC_HA_URL=http://192.168.1.42:8123
   NEXT_PUBLIC_HA_TOKEN=your_long_lived_access_token_here
   ```

3. Restart the dev server:
   ```bash
   npm run dev
   ```

The dashboard will now show real device data instead of demo data!

## Step 9: Keep the MacBook Running

For a dedicated home server:

1. **Prevent sleep:** System Preferences → Energy Saver → Prevent sleep when display is off
2. **Auto-start Docker:** Docker Desktop → Settings → General → Start Docker Desktop when you sign in
3. **Close the lid:** System Preferences → Energy Saver → Enable "Power Nap" so it stays awake with lid closed (or use an app like Amphetamine)
4. **Static IP:** Router settings → DHCP Reservation → Assign a fixed IP to the MacBook

## Useful Commands

```bash
# View HA logs
docker logs homeassistant -f

# Restart HA
docker restart homeassistant

# Update HA to latest version
docker compose pull
docker compose up -d

# Back up your config
cp -r config config-backup-$(date +%Y%m%d)
```

## Recommended Wi-Fi Smart Devices (Budget-Friendly)

| Category    | Budget Pick              | Mid-Range              | Premium             |
|-------------|--------------------------|------------------------|---------------------|
| Lights      | Wyze Bulb ($8)           | TP-Link Kasa ($12)     | LIFX ($40)          |
| Switches    | Treatlife ($15)          | TP-Link Kasa ($18)     | Lutron Caseta ($55) |
| Thermostat  | —                        | Honeywell T9 ($150)    | Ecobee ($180)       |
| Lock        | —                        | Wyze Lock ($80)        | August Wi-Fi ($200) |
| Camera      | Wyze Cam v3 ($25)        | Reolink ($45)          | Ring Indoor ($60)   |
| Doorbell    | Wyze Video Doorbell ($30)| Reolink ($80)          | Ring Doorbell ($100)|
