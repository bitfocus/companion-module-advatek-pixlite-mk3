# Icon reference

Symbols are paired with concise labels. Transport symbols are conventional; an icon alone cannot identify an auxiliary port, colour channel, palette slot or percentage. Keep those labels when customising keys.

| Role                                 | Symbol                           | Operator meaning                                                      |
| ------------------------------------ | -------------------------------- | --------------------------------------------------------------------- |
| `live`                               | Input arrow                      | Return to live data                                                   |
| `blank`                              | Slashed circle                   | Blank outputs                                                         |
| `freeze`                             | Snowflake                        | Hold the output frame, distinct from Pause                            |
| `pause`, `resume`, `pause_toggle`    | Pause, play, combined play/pause | File playback transport                                               |
| `previous`, `next`                   | Previous/next item markers       | Adjacent playlist operation, including built-in entries               |
| `previous_recorded`, `next_recorded` | Item marker plus play-circle     | Previous/next recorded item within a playlist, not SD directory order |
| `restart`                            | Replay arrow                     | Restart current item                                                  |
| `intensity_up`, `intensity_down`     | Sun plus/minus                   | Adjust programmed intensity by the labelled step                      |
| `level`                              | Sun with level bar               | Set the labelled programmed intensity                                 |
| `override`                           | Sun and lock                     | Give programmed intensity priority                                    |
| `release`                            | Sun and return arrow             | Release programmed priority, allowing a configured live source        |
| `colour`                             | Colour circle or palette         | Static RGB recall, or the labelled dashboard palette slot             |
| `white_channel`                      | Lamp                             | Static W or X channel recall; label identifies channel                |
| `scene`                              | Play-circle                      | Play the named scene                                                  |
| `playlist`                           | List                             | Play the named playlist                                               |
| `media_refresh`                      | List plus refresh                | Refresh the scene/playlist list                                       |
| `status_refresh`                     | Refresh                          | Read current monitoring state                                         |
| `inspect`                            | Information circle               | Inspect selected scene metadata                                       |
| `health`                             | Chart                            | Monitoring layout template                                            |
| `connection`                         | Network tree                     | Connection/network layout template                                    |
| `temperature`                        | Thermometer                      | Temperature layout template                                           |
| `power`                              | Lightning bolt                   | Power/electrical layout template; use units in labels                 |
| `fuse`                               | Fuse outline                     | Power/fuse state template; inactive alone does not mean overcurrent   |
| `storage`                            | SD card                          | Storage layout template                                               |
| `discovery`                          | Network and magnifier            | Discovery layout template; scan remains in connection settings        |
| `mix_channel`                        | Sliders or colour strip          | Prepared channel value; W/X labels identify white channels            |
| `mix_recall`                         | Arrow into palette               | Apply the prepared static colour                                      |
| `mix_live`                           | Palette and power                | Enable or disable immediate Static Colour mixing                      |
| `mix_load`                           | Palette and down arrow           | Copy reported output into the prepared mix                            |
| `mix_up`, `mix_down`                 | Palette and vertical arrow       | Adjust the labelled prepared channel                                  |

Both themes retain identical geometry and semantic content. Orange means matching reported state, a clock/dashed border means stale, and red/triangle means reported mode error. The state badge is drawn over swatches so it remains visible. Colour circles retain their hue in every state. A palette slot remains neutral until its meaning is known; no colour is invented from its number.

The toggle key selects Pause or Resume artwork from fresh reported file state. When that state is unavailable it uses the combined symbol with a clock. A red warning can also identify a failed or uncertain command from that key. The Direct operator workspace places the intensity arrows above and below the reported level; the catalogue still offers individual controls for custom layouts.

Mixer dials use a compact colour strip above their dynamic percentage. RGB recall keys retain circular swatches. Both use the same channel colours. Live Mix uses an orange border when enabled and a fault badge if the mix command fails.

Review the complete export contact sheets at native 72 px as well as enlarged. Real Stream Deck brightness and legibility still require physical checks. Native dynamic captions use Companion's font because its simple preset API has no custom font selection.
