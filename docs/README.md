# PixLite Mk3 Companion documentation

Start with the guide that matches what you want to do. The operator pages describe the current build, including the limits of its feedback and monitoring.

## Set up and operate

| Guide                                         | Use it for                                                                                                            |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [Module help](../companion/HELP.md)           | Connect a controller, discover it with ADAR, place presets and understand each control. This is also the in-app help. |
| [Example workspace](../companion/EXAMPLE.md)  | Start with both key themes, white-channel controls and offline preparation, then connect commissioned controllers.    |
| [Compatibility and testing](LOCAL-TESTING.md) | Check the tested versions, completed checks and work still needed for hardware qualification.                         |

## Look up a detail

| Reference                                                          | Use it for                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| [Actions and HTTP API mapping](HTTP-API-MAP.md)                    | Match each Companion action to its operator request and understand parameter limits. |
| [Feedback and variables](FEEDBACK-AND-VARIABLES.md)                | Find condition IDs, measurement units, availability flags and variable families.     |
| [ADAR discovery](ADAR-DISCOVERY.md)                                | Understand interface selection, device identity and network behaviour.               |
| [HTTPS certificates](HTTPS.md)                                     | Choose HTTPS and understand certificate verification.                                |
| [Artwork and editable sources](../assets/README.md)                | Edit the key artwork and understand its font and asset requirements.                 |
| [Icon choices](ICONS.md) and [artwork exports](ARTWORK-EXPORTS.md) | Review symbol meanings, themes and available exports.                                |

## Maintain the module

See [Contributing](../CONTRIBUTING.md), the [developer guide](DEVELOPMENT.md) and [architecture](ARCHITECTURE.md) for source layout, invariants and local checks. The [test matrix](LOCAL-TESTING.md) records the current validation scope and qualification limits. [Changelog](../CHANGELOG.md) records build changes.
