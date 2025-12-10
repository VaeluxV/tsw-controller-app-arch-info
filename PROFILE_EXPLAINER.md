# 🎮 Train Sim World Controller Configuration Format

This document describes the structure and semantics of the configuration system used to map game controllers (e.g., joysticks, gamepads) to controls in Train Sim World using UE4SS. It is designed to be flexible, extensible, and friendly to both analog and digital input devices.

---

## 📦 Overview

Each control on a game controller can be assigned an **action**. Assignments describe _when_ and _how_ the actions are triggered based on the input. Actions describe _what_ happens when triggered.

All assignments conform to a top-level enum `ControllerProfileControlAssignment`, which contains the following variants:

- `Momentary`
- `Toggle`
- `Linear`
- `DirectControl`
- `SyncControl`
- `ApiControl`

Each assignment type has a specific use case and behavior, described below.

---

## 🧩 Assignment Types

### 🔘 Momentary

Used for buttons that act while held.

```json
{
  "type": "momentary",
  "threshold": 0.5,
  "action_activate": { ... },
  "action_deactivate": { ... }
}
```

- **Triggers** when input value crosses `threshold`.
- **Deactivates** when input falls below `threshold`. (optional - by default if the `action_activate` defines a keystroke to be held; it will be released automatically when releasing the gamepad control)
- Ideal for **press-and-hold** style controls.

### 🔁 Toggle

Used for toggle switches that alternate between two states.

```json
{
  "type": "toggle",
  "threshold": 0.5,
  "action_activate": { ... },
  "action_deactivate": { ... }
}
```

- **First activation** runs `action_activate`.
- **Next activation** runs `action_deactivate`.
- Useful for switches like headlights, engine start, etc.

### 📈 Linear

Used for analog levers or sliders with multiple threshold points.

```json
{
  "type": "linear",
  "thresholds": [
    { "threshold": 0.2, "action_activate": { ... }, "action_deactivate": { ... } },
    { "threshold": 0.7, "action_activate": { ... }, "action_deactivate": { ... } }
  ]
}
```

- Triggers **different actions** based on **axis position thresholds**.
- Ideal for **brake levers**, **throttles**, etc.

### 🎚️ DirectControl

Maps an analog controller input to a continuous value in-game.

```json
{
  "type": "direct_control",
  "controls": "Throttle1",
  "input_value": {
    "min": 0.0,
    "max": 1.0,
    "invert": true
  },
  "notify": true
}
```

- **Directly updates** a UE4SS control based on axis input.
- Used for **continuous analog mappings**.
- Supports `step` or `steps` to quantize values.
- Can be used with the `{SIDE}` placeholder to automatically select the correct side of the cab. This is specifically for controls named `Throttle_F` or `Throttle_B` where the `F` and `B` mark the side of the cab.

#### Options

| Name     | Description                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `hold`   | Whether to continuously hold this value. Useful for levers which automatically reset. (such as the Tube Deadman or some brake levers)        |
| `notify` | Whether to enable the in-game notifier when changing values to display the current value (defaults to `true` but can be explicitly disabled) |

### 🧭 SyncControl

A safer alternative to `DirectControl` for unstable locos.

```json
{
  "type": "sync_control",
  "identifier": "Reverser1",
  "input_value": {
    "min": -1.0,
    "max": 1.0,
    "steps": [-1.0, 0.0, 1.0]
  },
  "action_increase": { "keys": "PageUp" },
  "action_decrease": { "keys": "PageDown" }
}
```

- **Reads current in-game state** and uses **keypresses** to reach desired state.
- Ideal for **syncing with controls that don’t respond well to direct manipulation**.

### 🎚️ ApiControl

Maps an analog controller input to a continuous value in-game using the HTTP API.

```json
{
  "type": "api_control",
  "controls": "Throttle1",
  "input_value": {
    "min": 0.0,
    "max": 1.0,
    "invert": true
  }
}
```

- **Directly updates** a game control based on axis input using the HTTP API. May result in slight overheada compared to the full direct control mode, but does not require additional a the mod to be installed.
- Used for **continuous analog mappings**.
- Supports `step` or `steps` to quantize values.

---

## ⚙️ Action Types

Each assignment triggers an action when activated (and optionally when deactivated). Actions can be:

### 🖱️ Key Presses

```json
{
  "keys": "W",
  "press_time": 0.1,
  "wait_time": 0.05
}
```

- Simulates a key press.
- Optional timing controls for holding and releasing.

### 🎛️ Direct Control Action

```json
{
  "controls": "Throttle1",
  "value": 0.5,
  "hold": false,
  "relative": false
}
```

- Sends a value directly to a UE4SS control.
- Can be held or pulsed.
- Can be defined as a relative value (instead of sending the absolute value)

### 🎛️ Api Control Action

```json
{
  "controls": "Throttle1",
  "api_value": 0.5
}
```

- Sends a value directly to a control using the HTTP API.

---

## 🔧 Input Value Mapping

Used by `DirectControl`, `SyncControl` and `ApiControl` to map axis input to control values.

```json
{
  "min": -1.0,
  "max": 1.0,
  "step": 0.1,
  "steps": [0.0, 0.2, null, 0.5, null, 1.0],
  "invert": true
}
```

- `min` / `max`: Range of values.
- `step`: Optional increment size.
- `steps`: Optional list of discrete valid values. Can be used with `null` values to create zones of free motion between detents.
- `invert`: Whether to reverse the axis.

---

## 🔁 Conditional assignments

It is also possible to only execute assignments depending on one or more conditions. This can be used to create multi-key assignments. (eg: the action of a button changes depending on the position of a lever).
This can be added to any assignment using the `conditions` key:

```
{
  "type": "momentary",
  "conditions": [
    {
      "control": "mylever",
      "operator": "gte",
      "value": 0.5
    }
  ]
}
```

In the above example, the assignment will only execute if `mylever` exceeds 0.5. At this time the supported operators are `gte`, `lte`, `gt` and `lt`.

---

## ✅ Best Practices

- Use `DirectControl` for stable, high-resolution mappings, especially lever controls.
- Use `ApiControl` if you are unable to or do not want to use `DirectControl` (`ApiControl` is less flexible and is less performant, but still provides a near direct control option)
- Use `SyncControl` if you want a direct control like experience but want to use keybindings. (this may be helpful since using keybinds trigger the in-game value notifications)
- Use `Linear` for fine-grained, manually configured lever behavior.
- Use `Momentary` for temporary actions like horn or bell.
- Use `Toggle` for switches with two states.

---

## 📝 Example Full Assignment

```json
{
  "type": "momentary",
  "threshold": 0.5,
  "action_activate": {
    "keys": "H"
  },
  "action_deactivate": {
    "keys": "Shift+H"
  }
}
```

---

Happy simming! 🚂
