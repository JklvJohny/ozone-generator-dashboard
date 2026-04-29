
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>   // TLS client for HiveMQ Cloud (secure connection)
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <math.h>
#include <U8g2lib.h>

/*
  ESP32 Ozone Generator Controller
  - Buttons: GPIO12 (Electrode1), GPIO14 (Electrode2), GPIO27 (Electrode3), GPIO26 (Mode Toggle)
  - Relays:  GPIO16, GPIO17, GPIO18
  - I2C:     SDA=GPIO21, SCL=GPIO22
  - LEDs:    GPIO35 (Power, always ON), GPIO25 (Mode: Local=ON, Remote=BLINK)
  - Local mode : board buttons control relays; MQTT commands ignored
  - Remote mode: MQTT dashboard controls relays; board buttons ignored
*/

// =========================
// PIN DEFINITIONS
// =========================
#define BTN_ELECTRODE1   14   // Button 1 – Electrode 1 
#define BTN_ELECTRODE2   32   // Button 2 – Electrode 2
#define BTN_ELECTRODE3   27   // Button 3 – Electrode 3
#define BTN_MODE         26   // Button 4 – Local / Remote toggle

#define RELAY_1_PIN      16   // Relay 1 (controlled by Button 1)
#define RELAY_2_PIN      17   // Relay 2 (controlled by Button 2)
#define RELAY_3_PIN      18   // Relay 3 (controlled by Button 3)

#define I2C_SDA          21
#define I2C_SCL          22

#define LED_MODE         33   // Mode LED – ON=Local, Remote=BLINK

// =========================
// MQ-131 SENSOR
// =========================
#define MQ131_PIN        34
#define VOLTAGE_PIN      36   // Recommended ADC pin: 36 (SENSOR_VP) or 39 (SENSOR_VN)
#define CURRENT_PIN      35

#define ADC_RESOLUTION   4095.0
#define VOLT_RESOLUTION  3.3
// NOTE: Verify MQ-131 VCC wiring — use 5.0V (VIN) for accurate Rs calculation.
#define SENSOR_VCC       5.0
#define DIVIDER_RATIO    1.5 
#define RL_VALUE_KOHM    0.445
#define RL_OHMS          445.0  // Measured load resistor value on PCB (multimeter verified)

// --- Voltage Sensor Module ---
const float VOLT_DIVIDER_RATIO = 5.0f; 

// --- ACS Current Sensor (CURRENT_PIN = 35) ---
const double CURRENT_SENSITIVE = 136.5;  // mV/A
double currentOffset           = 2500.0; 
const double CURRENT_DEAD_BAND = 0.02;   // Small deadband to avoid false zero readings

// --- MQ-131 Sensor Model ---
// R0 is set by calibrateOzoneSensor() at boot; this value is the fallback default
float R0 = 25954.0f; // Default fallback: Rs ในอากาศสะอาด (generator ปิด)
const float OZONE_A = 0.51f;
const float OZONE_B = 0.22f;  // Adjusted exponent to compress the output curve
// PPM_BASELINE: value returned by the formula at ratio=1 (A*1^B = A), subtracted to normalize clean-air to 0 PPM
const float PPM_BASELINE = OZONE_A; // = 0.51 PPM

// ===== Filter settings =====
#define MEDIAN_WINDOW 7           // Sliding window size for median filter (must be odd)
static float ppmWindow[MEDIAN_WINDOW];
static int ppmIndex = 0;
static bool windowFilled = false;

// =========================
// WIFI & MQTT CONFIG
// =========================
const char* WIFI_SSID       = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD   = "YOUR_WIFI_PASSWORD";

// --- HiveMQ Cloud (TLS) ---
const char* mqtt_server     = "YOUR_HIVEMQ_HOST.s1.eu.hivemq.cloud";
const int   mqtt_port       = 8883;           // TLS port
const char* mqtt_username   = "YOUR_MQTT_USERNAME";       // HiveMQ username
const char* mqtt_password   = "YOUR_MQTT_PASSWORD"; // HiveMQ password

const char* MQTT_PUB_TOPIC  = "ozone/live";
const char* MQTT_SUB_TOPIC  = "ozone/control";

// Forward declaration
void handleControlMessage(char* topic, byte* payload, unsigned int length);

// =========================
// OLED DISPLAY (SH1106 1.3" 128x64)
// =========================
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);
unsigned long lastDisplayUpdate = 0;
const unsigned long DISPLAY_INTERVAL = 500;  // OLED refresh interval: 500ms

// =========================
// GLOBAL STATE
// =========================
WiFiClientSecure espClient;          // Secure TLS client for HiveMQ Cloud
PubSubClient     mqttClient(espClient);

// Electrode / Relay states
bool relay1State = false;
bool relay2State = false;
bool relay3State = false;

// Auto-shutoff timers (0 means manual/no timer)
unsigned long relay1OffTime = 0;
unsigned long relay2OffTime = 0;
unsigned long relay3OffTime = 0;

// Mode: true = Local (board), false = Remote (MQTT)
bool isLocalMode = true;

// EMA filter: lower alpha = smoother output (0.20 averages ~5 recent samples)
const int   SAMPLE_COUNT = 50;       // Samples per reading: 50 x 4ms = 200ms total acquisition window
const float EMA_ALPHA    = 0.20f;    // Increased smoothing; slightly slower response time
float filteredPpm        = 0.0f;
bool  filterInitialized  = false;

static float clampf(float x, float lo, float hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

static void sortArray(float *arr, int n) {
  for (int i = 0; i < n - 1; i++) {
    for (int j = i + 1; j < n; j++) {
      if (arr[j] < arr[i]) {
        float t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
      }
    }
  }
}

static float getMedian(float *src, int n) {
  float temp[MEDIAN_WINDOW];
  for (int i = 0; i < n; i++) temp[i] = src[i];
  sortArray(temp, n);
  return temp[n / 2];
}

unsigned long lastPublish = 0;
const unsigned long PUBLISH_INTERVAL = 1000;
bool immediatePublish = false;  // Flag: triggers an immediate MQTT publish on physical button press

// ---- Button debounce state ----
struct Button {
  uint8_t  pin;
  bool     lastReading;
  bool     state;
  unsigned long lastDebounceTime;
};

const unsigned long DEBOUNCE_MS = 50;

Button btnE1   = { BTN_ELECTRODE1, HIGH, HIGH, 0 };
Button btnE2   = { BTN_ELECTRODE2, HIGH, HIGH, 0 };
Button btnE3   = { BTN_ELECTRODE3, HIGH, HIGH, 0 };
Button btnMode = { BTN_MODE,       HIGH, HIGH, 0 };

// Mode LED blink
unsigned long lastBlinkTime    = 0;
bool          blinkLedState    = false;
const unsigned long BLINK_MS   = 500;

// =========================
// HELPER – ADC
// =========================
int readAdcAveraged(int pin, int count) {
  uint32_t sum = 0;
  for (int i = 0; i < count; i++) {
    sum += analogRead(pin);
    delay(4);
  }
  return (int)(sum / count);
}

float adcToVoltage(int adcRaw) {
  return ((float)adcRaw / ADC_RESOLUTION) * VOLT_RESOLUTION;
}

float calculateRs(float vao) {
  if (vao <= 0.001f) return 1e9f;
  if (vao >= SENSOR_VCC - 0.001f) return 0.0f;
  return RL_OHMS * (SENSOR_VCC - vao) / vao;
}

float ratioToPpm(float ratio) {
  if (ratio <= 1.0f) return 0.0f;
  // Subtract baseline so that clean-air conditions (ratio ~ 1.0) returns approximately 0 PPM
  float ppm = (OZONE_A * powf(ratio, OZONE_B)) - PPM_BASELINE;
  return (ppm > 0.0f) ? ppm : 0.0f;
}

float applyEma(float input) {
  if (!filterInitialized) {
    filteredPpm = input;
    filterInitialized = true;
  } else {
    filteredPpm = (EMA_ALPHA * input) + ((1.0f - EMA_ALPHA) * filteredPpm);
  }
  return filteredPpm;
}

// =========================
// SENSOR READS
// =========================
// Diagnostic globals: latest snapshot from readOzonePpm(), forwarded to publishLiveData() for dashboard display
static int   g_ozoneAdcRaw = 0;
static float g_ozoneRatio  = 0.0f;
float readOzonePpm() {
  int   adcRaw = readAdcAveraged(MQ131_PIN, SAMPLE_COUNT);
  float vadc   = adcToVoltage(adcRaw);
  float vao    = vadc * DIVIDER_RATIO;
  float rs     = calculateRs(vao);
  float ratio  = (R0 > 0.0f) ? (rs / R0) : 0.0f;

  // Capture diagnostic values for MQTT transmission
  g_ozoneAdcRaw = adcRaw;
  g_ozoneRatio  = ratio;

  // Debug output: full pipeline trace visible in Serial Monitor
  Serial.printf("[MQ131] ADC=%4d | Vadc=%.3fV | Vao=%.3fV | Rs=%.0f | R0=%.0f | ratio=%.4f\n",
                adcRaw, vadc, vao, rs, R0, ratio);

  // ★ Diagnose Logic สำหรับ MQ-131 (Oxidizing Gas):
  //   - อากาศสะอาด  : Rs ≈ R0 → ratio ≈ 1.0 → ppm ≈ 0
  //   - มี Ozone    : Rs เพิ่ม → ratio > 1.0 → ppm > 0
  float ppmRaw = ratioToPpm(ratio);

  if (!isfinite(ppmRaw) || ppmRaw < 0.0f) ppmRaw = 0.0f;
  // No upper clamp applied; full dynamic range is reported

  // Median filter
  ppmWindow[ppmIndex] = ppmRaw;
  ppmIndex++;
  if (ppmIndex >= MEDIAN_WINDOW) { ppmIndex = 0; windowFilled = true; }

  int validCount = windowFilled ? MEDIAN_WINDOW : ppmIndex;
  if (validCount <= 0) validCount = 1;

  float finalPpm = applyEma(getMedian(ppmWindow, validCount));
  
  // Return unrounded value to preserve full precision
  return finalPpm;
}

// Reads the supply voltage (V) from the voltage divider module on VOLTAGE_PIN
float readVoltageValue() {
  int      adcRaw      = analogRead(VOLTAGE_PIN);
  uint32_t volt_mV     = analogReadMilliVolts(VOLTAGE_PIN);
  
  // Discard ADC noise floor (~140-150mV floating) when no input voltage is present
  if (volt_mV < 200) {
    volt_mV = 0;
  }
  
  // Convert millivolts back to volts and apply module scaling factor (0-25V module steps down by 5x)
  float    voltage_pin = volt_mV / 1000.0f;          // V ที่ขา ADC
  float    battery_V   = voltage_pin * VOLT_DIVIDER_RATIO; // V จริงของวงจร
  
  // Debug output for voltage pipeline verification in Serial Monitor
  Serial.printf("[DEBUG VOLTAGE] Pin: %d | Raw ADC: %d | mV: %u | Output: %.2f V\n", VOLTAGE_PIN, adcRaw, volt_mV, battery_V);

  return battery_V; // Return calculated voltage from ADC reading
}

// Reads a single instantaneous current sample (Amps) from the ACS sensor on CURRENT_PIN
double getCurrentInstant() {
  int    v_mV = (int)analogReadMilliVolts(CURRENT_PIN);
  double c    = ((double)v_mV - currentOffset) / CURRENT_SENSITIVE;
  return c;
}

// Applies a piecewise linear calibration curve derived from physical measurements
float scaleCurrentCurve(float rawCurrent) {
  if (rawCurrent < 0.05f) return 0.0f; // Deadband

  if (rawCurrent <= 0.38f) {
    // Range 0 to 0.38 A maps to 0 to 0.34 A
    return (rawCurrent / 0.38f) * 0.34f;
  } 
  else if (rawCurrent <= 0.73f) {
    // Range 0.38 to 0.73 A maps to 0.34 to 0.54 A
    return 0.34f + ((rawCurrent - 0.38f) / (0.73f - 0.38f)) * (0.54f - 0.34f);
  } 
  else if (rawCurrent <= 1.04f) {
    // Range 0.73 to 1.04 A maps to 0.54 to 0.65 A
    return 0.54f + ((rawCurrent - 0.73f) / (1.04f - 0.73f)) * (0.65f - 0.54f);
  } 
  else {
    // Above 1.04 A: extrapolate using the slope of the last segment (0.11 / 0.31 = 0.3548)
    return 0.65f + (rawCurrent - 1.04f) * 0.3548f;
  }
}

// Computes RMS current to handle AC ripple and prevent cancellation of positive/negative half-cycles
float readCurrentValue() {
  const int COUNT = 200;
  double    sumSq = 0.0;
  
  for (int i = 0; i < COUNT; i++) {
    double instCurrent = getCurrentInstant();
    sumSq += (instCurrent * instCurrent); // Square each sample to eliminate sign cancellation
    delay(1);
  }
  
  // Take the square root to complete RMS calculation
  double rms = sqrt(sumSq / COUNT);
  
  // Debug output: raw RMS value before calibration curve is applied
  Serial.printf("[DEBUG CURRENT] RMS Calc A: %.3f A | Offset: %.2f mV\n", rms, currentOffset);

  // Values within the deadband near zero are treated as zero
  if (rms < CURRENT_DEAD_BAND) rms = 0.0;
  
  // Apply piecewise calibration curve
  return scaleCurrentCurve((float)rms);
}

// =========================
// OUTPUT – RELAYS
// =========================
void applyRelayStates() {
  digitalWrite(RELAY_1_PIN, relay1State ? HIGH : LOW);
  digitalWrite(RELAY_2_PIN, relay2State ? HIGH : LOW);
  digitalWrite(RELAY_3_PIN, relay3State ? HIGH : LOW);
}

void allRelaysOff() {
  relay1State = false;
  relay2State = false;
  relay3State = false;
  relay1OffTime = 0;
  relay2OffTime = 0;
  relay3OffTime = 0;
  applyRelayStates();
}

// =========================
// ELECTRODE LEVEL CONTROL
// =========================
// Level: 0 = all OFF, 1 = A only, 2 = A+B, 3 = A+B+C
void setElectrodeLevel(int level) {
  relay1State = (level >= 1);
  relay2State = (level >= 2);
  relay3State = (level >= 3);
  relay1OffTime = 0;
  relay2OffTime = 0;
  relay3OffTime = 0;
  applyRelayStates();
}

// Returns the current electrode level (0-3); returns -1 if the relay states do not match any defined pattern
int getElectrodeLevel() {
  if ( relay1State &&  relay2State &&  relay3State) return 3;
  if ( relay1State &&  relay2State && !relay3State) return 2;
  if ( relay1State && !relay2State && !relay3State) return 1;
  if (!relay1State && !relay2State && !relay3State) return 0;
  return -1; // Mixed relay state that does not match any predefined level pattern
}

// =========================
// MODE LED
// =========================
void updateModeLed() {
  if (isLocalMode) {
    // Solid ON
    digitalWrite(LED_MODE, HIGH);
  } else {
    // Blink at BLINK_MS interval
    if (millis() - lastBlinkTime >= BLINK_MS) {
      lastBlinkTime = millis();
      blinkLedState = !blinkLedState;
      digitalWrite(LED_MODE, blinkLedState ? HIGH : LOW);
    }
  }
}

// =========================
// BUTTON DEBOUNCE
// =========================
// Returns true only on the falling-edge (press) event
bool checkButtonPress(Button& btn) {
  bool reading = digitalRead(btn.pin);

  if (reading != btn.lastReading) {
    btn.lastDebounceTime = millis();
  }
  btn.lastReading = reading;

  if ((millis() - btn.lastDebounceTime) > DEBOUNCE_MS) {
    if (reading != btn.state) {
      btn.state = reading;
      if (btn.state == LOW) {  // Active LOW => press event
        return true;
      }
    }
  }
  return false;
}

// =========================
// HANDLE PHYSICAL BUTTONS
// =========================
void handleButtons() {
  // Mode toggle button – always active regardless of mode
  if (checkButtonPress(btnMode)) {
    isLocalMode = !isLocalMode;
    String modeStr = isLocalMode ? "LOCAL" : "REMOTE";
    Serial.printf("[MODE] Switched to %s\n", modeStr.c_str());

    immediatePublish = true;

    if (!isLocalMode) {
      digitalWrite(LED_MODE, LOW);
      lastBlinkTime = millis();
      blinkLedState = false;
    } else {
      digitalWrite(LED_MODE, HIGH);
    }
  }

  // Electrode buttons only work in Local mode
  if (!isLocalMode) return;

  // ── Level-based control ───────────────────────────────────
  // Button 1 = level 1, Button 2 = level 2, Button 3 = level 3. Pressing the same level again turns all electrodes OFF
  if (checkButtonPress(btnE1)) {
    int target = (getElectrodeLevel() == 1) ? 0 : 1;
    setElectrodeLevel(target);
    immediatePublish = true;
    Serial.printf("[LOCAL] Electrode Level -> %d\n", target);
  }
  if (checkButtonPress(btnE2)) {
    int target = (getElectrodeLevel() == 2) ? 0 : 2;
    setElectrodeLevel(target);
    immediatePublish = true;
    Serial.printf("[LOCAL] Electrode Level -> %d\n", target);
  }
  if (checkButtonPress(btnE3)) {
    int target = (getElectrodeLevel() == 3) ? 0 : 3;
    setElectrodeLevel(target);
    immediatePublish = true;
    Serial.printf("[LOCAL] Electrode Level -> %d\n", target);
  }
}

// =========================
// MQTT CONTROL HANDLER
// =========================
void handleControlMessage(char* topic, byte* payload, unsigned int length) {
  // Parse the incoming JSON payload to identify the command type
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.print("[MQTT] Invalid JSON: ");
    Serial.println(err.c_str());
    return;
  }

  const char* cmd = doc["cmd"] | "";

  // set_mode commands always pass through; all other commands are blocked while in Local mode
  if (isLocalMode && strcmp(cmd, "set_mode") != 0) {
    Serial.println("[MQTT] Command ignored – device is in LOCAL mode.");
    return;
  }

  if (strcmp(cmd, "set_level") == 0) {
    // { "cmd": "set_level", "level": 0|1|2|3 }
    // 0 = all OFF, 1 = A only, 2 = A+B, 3 = A+B+C
    int level = doc["level"] | -1;
    if (level < 0 || level > 3) {
      Serial.printf("[MQTT] Invalid level: %d (valid range: 0-3)\n", level);
      return;
    }
    setElectrodeLevel(level);
    immediatePublish = true;
    Serial.printf("[REMOTE] Electrode Level -> %d\n", level);
  }
  else if (strcmp(cmd, "set_relay") == 0) {
    // Legacy command retained for backward compatibility
    int  relayNum = doc["relay"] | 0;
    bool state    = doc["state"] | false;
    switch (relayNum) {
      case 1: relay1State = state; relay1OffTime = 0; break;
      case 2: relay2State = state; relay2OffTime = 0; break;
      case 3: relay3State = state; relay3OffTime = 0; break;
      default:
        Serial.printf("[MQTT] Unknown relay: %d\n", relayNum);
        return;
    }
    applyRelayStates();
    immediatePublish = true;
    Serial.printf("[REMOTE] Relay%d -> %s\n", relayNum, state ? "ON" : "OFF");
  }
  else if (strcmp(cmd, "set_electrode") == 0) {
    // Legacy command, still supported; prefer set_level for new implementations
    const char* elec = doc["electrode"] | "";
    bool state       = doc["state"] | false;
    int duration     = doc["duration"] | 0;

    if      (strcmp(elec, "A") == 0) {
      relay1State   = state;
      relay1OffTime = (state && duration > 0) ? (millis() + duration * 1000UL) : 0;
      Serial.printf("[REMOTE] Electrode A -> %s (dur: %ds)\n", state ? "ON" : "OFF", duration);
    }
    else if (strcmp(elec, "B") == 0) {
      relay2State   = state;
      relay2OffTime = (state && duration > 0) ? (millis() + duration * 1000UL) : 0;
      Serial.printf("[REMOTE] Electrode B -> %s (dur: %ds)\n", state ? "ON" : "OFF", duration);
    }
    else if (strcmp(elec, "C") == 0) {
      relay3State   = state;
      relay3OffTime = (state && duration > 0) ? (millis() + duration * 1000UL) : 0;
      Serial.printf("[REMOTE] Electrode C -> %s (dur: %ds)\n", state ? "ON" : "OFF", duration);
    }
    else {
      Serial.printf("[MQTT] Unknown electrode: %s\n", elec);
      return;
    }
    applyRelayStates();
    immediatePublish = true;
  }
  else if (strcmp(cmd, "emergency_stop") == 0) {
    allRelaysOff();
    immediatePublish = true;
    Serial.println("[REMOTE] Emergency stop – all relays OFF");
  }
  else if (strcmp(cmd, "set_mode") == 0) {
    // { "cmd": "set_mode", "mode": "local" | "remote" }
    // Dashboard-initiated mode switch via MQTT
    const char* newMode = doc["mode"] | "";
    if (strcmp(newMode, "local") == 0) {
      isLocalMode = true;
      allRelaysOff();          // Turn off all electrodes when switching to Local mode
      digitalWrite(LED_MODE, HIGH);
      immediatePublish = true;
      Serial.println("[REMOTE] Mode switched to LOCAL (electrodes OFF)");
    } else if (strcmp(newMode, "remote") == 0) {
      isLocalMode = false;
      lastBlinkTime = millis();
      blinkLedState = false;
      digitalWrite(LED_MODE, LOW);
      immediatePublish = true;
      Serial.println("[MQTT] Mode switched to REMOTE");
    } else {
      Serial.printf("[MQTT] set_mode: unknown value '%s'\n", newMode);
    }
  }
  else {
    Serial.printf("[MQTT] Unknown cmd: %s\n", cmd);
  }
}

// =========================
// WIFI / MQTT
// =========================
void applyCustomDNS() {
  IPAddress primaryDNS(8, 8, 8, 8);
  // Only reconfigure DNS if the primary DNS server is not already set to 8.8.8.8
  if (WiFi.dnsIP(0) != primaryDNS) {
    IPAddress localIP = WiFi.localIP();
    IPAddress gateway = WiFi.gatewayIP();
    IPAddress subnet  = WiFi.subnetMask();
    IPAddress secondaryDNS(8, 8, 4, 4);
    WiFi.config(localIP, gateway, subnet, primaryDNS, secondaryDNS);
    Serial.println("\n[WIFI] Custom DNS 8.8.8.8 applied");
  }
}

void setupWiFiAndMQTT() {
  Serial.printf("Connecting to Wi-Fi: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);


  // Non-blocking wait for up to 15 seconds
  unsigned long startAttemptTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    applyCustomDNS();
    Serial.println("\n[WIFI] Connected.");
    Serial.print("[WIFI] IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WIFI] Connection timeout. Proceeding in offline mode.");
  }

  // TLS: certificate verification skipped for simplicity. Use espClient.setCACert(root_ca) for production.
  espClient.setInsecure();

  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(handleControlMessage);
  mqttClient.setBufferSize(512);
  mqttClient.setKeepAlive(60);  // HiveMQ Cloud แนะนำ keepalive ≥ 60s
}

unsigned long lastMqttReconnect = 0;
unsigned long lastWiFiReconnect = 0;

void reconnectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (millis() - lastMqttReconnect < 5000) return;

  lastMqttReconnect = millis();

  // Re-apply custom DNS after reconnection to prevent DNS resolution failures
  applyCustomDNS();

  // Client ID must be unique; use the device MAC address to guarantee uniqueness
  String clientId = "esp32-ozone-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  Serial.printf("Connecting MQTT to %s:%d ... ", mqtt_server, mqtt_port);

  // Authenticate with username and password (required for HiveMQ Cloud)
  if (mqttClient.connect(clientId.c_str(), mqtt_username, mqtt_password)) {
    Serial.println("connected to HiveMQ Cloud!");
    mqttClient.subscribe(MQTT_SUB_TOPIC);
    lastMqttReconnect = 0;
  } else {
    Serial.printf("failed (rc=%d). Retry in 5s.\n", mqttClient.state());
    // rc=-2: server not found | rc=-4: TLS error | rc=5: invalid credentials
  }
}

// =========================
// PUBLISH LIVE DATA
// =========================
void publishLiveData() {
  float ozonePpm    = readOzonePpm();   // Also updates g_ozoneAdcRaw and g_ozoneRatio as a side effect
  float voltageVal  = readVoltageValue();
  float currentVal  = readCurrentValue();

  int activeCount = 0;
  if (relay1State) activeCount++;
  if (relay2State) activeCount++;
  if (relay3State) activeCount++;

  StaticJsonDocument<512> doc;
  doc["ozone_ppm"]       = ozonePpm;
  doc["ozone_adc"]       = g_ozoneAdcRaw;   // Raw ADC value (0-4095) for diagnostic purposes
  doc["ozone_ratio"]     = g_ozoneRatio;    // Rs/R0 ratio for diagnostic purposes
  doc["voltage"]         = voltageVal;
  doc["current"]         = currentVal;

  // Relay / Electrode states
  doc["relay1"]          = relay1State;
  doc["relay2"]          = relay2State;
  doc["relay3"]          = relay3State;
  doc["electrode_a"]     = relay1State;
  doc["electrode_b"]     = relay2State;
  doc["electrode_c"]     = relay3State;
  doc["active_modules"]  = activeCount;
  doc["electrode_level"] = getElectrodeLevel();
  doc["sensor_status"]   = "active";

  doc["mode"]            = isLocalMode ? "local" : "remote";
  doc["timestamp"]       = millis();

  char buffer[512];
  serializeJson(doc, buffer);

  bool ok = mqttClient.publish(MQTT_PUB_TOPIC, buffer);
  Serial.printf("Publish %s -> %s\n", MQTT_PUB_TOPIC, ok ? "OK" : "FAIL");
  Serial.println(buffer);
}

// =========================
// OLED DISPLAY FUNCTIONS
// =========================
void setupDisplay() {
  u8g2.begin();

  // ---- Splash screen ----
  u8g2.clearBuffer();

  // Header bar (inverted)
  u8g2.drawBox(0, 0, 128, 14);
  u8g2.setDrawColor(0);
  u8g2.setFont(u8g2_font_7x13B_tf);
  u8g2.drawStr(10, 12, "OZONE SYSTEM");
  u8g2.setDrawColor(1);

  // Body
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.drawStr(22, 32, "ESP32 Controller");
  u8g2.drawStr(28, 46, "v1.0  I2C OLED");
  u8g2.drawStr(14, 60, "Initializing...");

  u8g2.sendBuffer();
  Serial.println("[OLED] Splash screen shown");
}

void updateDisplay() {
  if (millis() - lastDisplayUpdate < DISPLAY_INTERVAL) return;
  lastDisplayUpdate = millis();

  bool wifiOk = (WiFi.status() == WL_CONNECTED);
  bool mqttOk = mqttClient.connected();

  u8g2.clearBuffer();

  // ── Header bar (inverted) ──────────────────────────────
  u8g2.drawBox(0, 0, 128, 14);
  u8g2.setDrawColor(0);
  u8g2.setFont(u8g2_font_7x13B_tf);
  u8g2.drawStr(10, 12, "OZONE SYSTEM");
  u8g2.setDrawColor(1);

  // ── WiFi ───────────────────────────────────────────────
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.drawStr(0, 27, "WiFi:");
  if (wifiOk) {
    // Display current IP address on OLED
    char ipStr[16];
    WiFi.localIP().toString().toCharArray(ipStr, sizeof(ipStr));
    u8g2.drawStr(32, 27, ipStr);
  } else {
    u8g2.drawStr(32, 27, "Connecting...");
  }

  // ── MQTT ───────────────────────────────────────────────
  u8g2.drawStr(0, 39, "MQTT:");
  if (!wifiOk) {
    u8g2.drawStr(32, 39, "No WiFi");
  } else if (mqttOk) {
    u8g2.drawStr(32, 39, "Connected");
  } else {
    u8g2.drawStr(32, 39, "Offline");
  }

  // ── Mode ────────────────────────────────────────────────
  u8g2.drawStr(0, 51, "Mode:");
  if (isLocalMode) {
    // LOCAL mode – highlight box
    u8g2.drawRBox(32, 42, 44, 12, 3);
    u8g2.setDrawColor(0);
    u8g2.drawStr(35, 51, "LOCAL");
    u8g2.setDrawColor(1);
  } else {
    u8g2.drawRBox(32, 42, 52, 12, 3);
    u8g2.setDrawColor(0);
    u8g2.drawStr(35, 51, "REMOTE");
    u8g2.setDrawColor(1);
  }

  // ── Electrode states ───────────────────────────────────
  // A
  if (relay1State) {
    u8g2.drawRBox(0, 54, 38, 10, 3);
    u8g2.setDrawColor(0);
    u8g2.drawStr(4, 62, "A: ON");
    u8g2.setDrawColor(1);
  } else {
    u8g2.drawRFrame(0, 54, 38, 10, 3);
    u8g2.drawStr(4, 62, "A: --");
  }
  // B
  if (relay2State) {
    u8g2.drawRBox(45, 54, 38, 10, 3);
    u8g2.setDrawColor(0);
    u8g2.drawStr(49, 62, "B: ON");
    u8g2.setDrawColor(1);
  } else {
    u8g2.drawRFrame(45, 54, 38, 10, 3);
    u8g2.drawStr(49, 62, "B: --");
  }
  // C
  if (relay3State) {
    u8g2.drawRBox(90, 54, 38, 10, 3);
    u8g2.setDrawColor(0);
    u8g2.drawStr(94, 62, "C: ON");
    u8g2.setDrawColor(1);
  } else {
    u8g2.drawRFrame(90, 54, 38, 10, 3);
    u8g2.drawStr(94, 62, "C: --");
  }

  u8g2.sendBuffer();
}

// =========================
// SETUP
// =========================
void setupPins() {
  // Configure buttons as input with internal pull-up (active LOW)
  pinMode(BTN_ELECTRODE1, INPUT_PULLUP);
  pinMode(BTN_ELECTRODE2, INPUT_PULLUP);
  pinMode(BTN_ELECTRODE3, INPUT_PULLUP);
  pinMode(BTN_MODE,       INPUT_PULLUP);

  // Relays
  pinMode(RELAY_1_PIN, OUTPUT);
  pinMode(RELAY_2_PIN, OUTPUT);
  pinMode(RELAY_3_PIN, OUTPUT);
  allRelaysOff();

  // LEDs
  pinMode(LED_MODE,  OUTPUT);

  // Initialize in Local mode: mode LED solid ON
  digitalWrite(LED_MODE, HIGH);

  // I2C
  Wire.begin(I2C_SDA, I2C_SCL);
  Serial.println("[I2C] Bus initialized (SDA=21, SCL=22)");
}

void setupAdc() {
  analogReadResolution(12);
  analogSetPinAttenuation(MQ131_PIN,   ADC_11db);
  analogSetPinAttenuation(VOLTAGE_PIN, ADC_11db);
  analogSetPinAttenuation(CURRENT_PIN, ADC_11db);
}

// Auto-calibration routine for the current sensor. WARNING: ensure zero load current at power-on.
void calibrateCurrentSensor() {
  Serial.println("[CURRENT] Calibrating sensor... ensure ZERO current load!");
  long sumOffset = 0;
  const int CAL_COUNT = 500;
  for (int i = 0; i < CAL_COUNT; i++) {
    sumOffset += analogReadMilliVolts(CURRENT_PIN);
    delay(2);
  }
  currentOffset = (double)sumOffset / CAL_COUNT;
  Serial.printf("[CURRENT] Calibration done. Offset = %.2f mV\n", currentOffset);
}

void calibrateOzoneSensor() {
  Serial.println("[OZONE] Calibrating R0 — keep generator OFF during boot!");
  int adcRaw = readAdcAveraged(MQ131_PIN, 100);
  float vadc = adcToVoltage(adcRaw);
  float vao  = vadc * DIVIDER_RATIO;
  float rs   = calculateRs(vao);

  Serial.printf("[OZONE] Calib ADC=%d (0-4095) | Vadc=%.4fV | Vao=%.4fV | Rs=%.0f Ohms\n",
                adcRaw, vadc, vao, rs);

  // Threshold reduced from 100 to 5: MQ-131 with RL=445 Ohm gives ADC ~ 60-120 counts (well below 100), so the old guard was incorrectly blocking calibration
  if (adcRaw < 5) {
    Serial.printf("[OZONE] ADC=%d ~ 0, pin floating? Using default R0=%.0f\n", adcRaw, R0);
    return;
  }
  // Accept any Rs value as long as it is finite and non-zero
  if (rs > 1.0f && isfinite(rs)) {
    R0 = rs;
    Serial.printf("[OZONE] Calibration OK! R0 = %.0f Ohms (%.2f kOhm)\n", R0, R0 / 1000.0f);
  } else {
    Serial.printf("[OZONE] Rs invalid (%.0f) — keeping default R0=%.0f\n", rs, R0);
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== ESP32 Ozone Generator Controller ===");

  setupPins();       // Wire.begin() อยู่ในนี้ → ต้องก่อน setupDisplay()
  setupDisplay();    // Render the boot splash screen
  setupAdc();
  calibrateCurrentSensor(); // Auto-calibrate zero-current offset
  
  // Calibrate R0 on every boot (generator must be OFF). Compensates for ADC drift between sessions.
  calibrateOzoneSensor();

  // Force Local mode and de-energize all electrodes before entering the main loop
  isLocalMode = true;
  allRelaysOff();
  updateModeLed();

  setupWiFiAndMQTT();

  Serial.println("[READY] Starting main loop...");
}

// =========================
// LOOP
// =========================
void loop() {
  // Always handle physical buttons
  handleButtons();

  // Update OLED display (non-blocking, every 500ms)
  updateDisplay();

  // Handle countdown timers
  unsigned long now = millis();
  bool relayTimerTriggered = false;
  
  if (relay1State && relay1OffTime > 0 && now >= relay1OffTime) {
      relay1State = false;
      relay1OffTime = 0;
      relayTimerTriggered = true;
      Serial.println("[TIMER] Electrode A auto-off");
  }
  if (relay2State && relay2OffTime > 0 && now >= relay2OffTime) {
      relay2State = false;
      relay2OffTime = 0;
      relayTimerTriggered = true;
      Serial.println("[TIMER] Electrode B auto-off");
  }
  if (relay3State && relay3OffTime > 0 && now >= relay3OffTime) {
      relay3State = false;
      relay3OffTime = 0;
      relayTimerTriggered = true;
      Serial.println("[TIMER] Electrode C auto-off");
  }
  if (relayTimerTriggered) {
      applyRelayStates();
      immediatePublish = true;
  }

  // Update mode LED (blink in remote, solid in local)
  updateModeLed();

  // Wi-Fi Reconnection Logic (Non-blocking)
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWiFiReconnect >= 10000) {
      Serial.println("[WIFI] Reconnecting...");
      WiFi.disconnect();
      WiFi.reconnect();
      lastWiFiReconnect = millis();
    }
  } else {
    // MQTT connectivity
    if (!mqttClient.connected()) {
      reconnectMQTT();
    } else {
      mqttClient.loop();

      // Publish immediately when a local button was pressed, OR on normal interval
      bool intervalReached = (millis() - lastPublish >= PUBLISH_INTERVAL);
      if (immediatePublish || intervalReached) {
        lastPublish = millis();
        immediatePublish = false;
        publishLiveData();
      }
    }
  }
}