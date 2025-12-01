# Using Virtual Controls
Virtual controls can be used to perform actions or evaluate conditions based on manually defined triggers. One example would be to use a momentary button as a switch to toggle a lever between behaviors.

## How do I define a virtual control
Virtual controls don't need to be explicitly defined, they can be interacted with or conditioned on at all times. An action called `virtual` is available to set its value (example below)  

**Note: if a condition with a virtual control is evaluated and the value has not been explicitly set yet it will default to `0.0`**   

```json
{
  "name": "MyButton",
  "assignments": [
    {
      "type": "toggle",
      "threshold": 0.9,
      "action_activate": {
        "type": "virtual",
        "value": 1.0,
        "control": "virtual:Button1"
      },
      "action_deactivate": {
        "type": "virtual",
        "value": 0.0,
        "control": "virtual:Button1"
      }
    }
  ]
}
```

This example sets the virtual `Button1` control to `1.0` the first time `MyButton` is triggered. The second time it is triggered (since it's a toggle asignment) it will set the value back to `0.0`. This value can then be used in other assignments OR you can even define assignments for the virtual control itself.

## Using a virtual control to trigger assignments
You can attach assignments to a virtual control in the same way as any other control. Building on our previous example we could introduce something like:  

```json
{
  "name": "virtual:Button1",
  "assignments": [
    {
      "type": "momentary",
      "threshold": 0.9,
      "action_activate": {
        "keys": "space",
        "press_time": 0.2
      }
    }
  ]
}
```

In this case, whenever we "toggle" the virtual button to 1.0 it will quickly press the `horn` shortcut. This specific example may not be super useful but demonstrates the ability to compose actions into a virtual control. One thing to keep in mind is that the value of the virtual control is held until explicitly (re)set.

## Using a virtual control to evaluate conditions
A more interesting use case would be to use it as a state machine to change the behavior of other controls like levers. Let's say we have 1 lever on our controller which we want to use for both automatic and independent brakes depending on the state. By default we want it to be automatic brake and when switched we want it to be independent brake. We can easily do this building on our previous example:

```json
{
  "name": "Lever1",
  "assignments": [
    {
      "type": "direct_control",
      "controls": "AutomaticBrake",
      "input_value": {
        "min": 0.0,
        "max": 1.0
      },
      "conditions": [
        { "control": "virtual:Button1", "operator": "gte", "value": 0.5 }
      ]
    },
    {
      "type": "direct_control",
      "controls": "IndependentBrake",
      "input_value": {
        "min": 0.0,
        "max": 1.0
      },
      "conditions": [
        { "control": "virtual:Button1", "operator": "lt", "value": 0.5 }
      ]
    }
  ]
}
```

In this example, way when the virtual button has a value greater than or equal to `0.5`, it will act as the `AutomaticBrake`. When the value is below `0.5` (which is the default), it will act as the `IndependentBrake`.  