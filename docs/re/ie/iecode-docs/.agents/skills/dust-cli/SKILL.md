---
name: aphrody-dust-cli
description: Drive a running Nintendo DS ROM via Dust's headless CLI debug bridge (breakpoints, real watchpoints, real single-instruction stepping, register/memory inspection, input injection, screenshots, deterministic record/replay) from the CLI. Use whenever static analysis (Ghidra, disassembly) needs a dynamic answer -- what's the actual PC during some phase of execution, what byte changes when some observable event happens, does a candidate address actually get hit, what does the player actually see at a given state.
---

# Dust CLI debug bridge

`aphrody-dust-cli` is a CLI that talks newline-delimited JSON over TCP to `dust-desktop --headless`, a
window-less build of Dust (`kelpsyberry/dust`, a Rust Nintendo DS emulator) running a ROM in the
background. Unlike a GDB-based bridge, there's no RSP wire encoding and no generic GDB client in
the loop: the protocol is bespoke JSON built directly on Dust's own core APIs
(`vendor/dust-imgui-frontend-archive/src/emu/cli_server.rs` in IECODE's retained native archive), so responses carry structured data (registers as an
object, memory as a byte array) instead of hex strings.

Reach for this whenever you're reverse-engineering a ROM (e.g. via Ghidra) and hit a question
static analysis can't answer on its own: "what's actually executing right now", "which byte in
main RAM holds this value", "does my candidate address for X actually get hit during gameplay",
"what does the player see at this state".

## Prerequisites

- Python 3. Nothing else to run the bridge.
- The repository skill exposes a thin `bin/aphrody-dust-cli` launcher for the canonical Python
  client in `crates/emu/cli/dust-cli`. The installer copies that client into a portable skill bundle.
  Neither ships a `dust-desktop` executable. Supply a compatible `dust-desktop` built with `cli-server` through
  `--dust-desktop-bin PATH` or `$DUST_DESKTOP_BIN`; the active IECODE workspace no longer builds
  the ImGui desktop frontend.
- **No BIOS/firmware files are bundled or required.** Dust direct-boots straight into the ROM by
  default (skipping the copyrighted Nintendo BIOS/firmware entirely) unless you explicitly pass
  `--arm7-bios`/`--arm9-bios` to `launch`, in which case it boots through firmware instead -- only
  do this if you have your own dumps and specifically need firmware-boot behavior.

## Command reference

Run all commands from your project's working directory -- session state persists in
`.dust-cli-state.json` there (with `.dust-cli.log`; both are ignored by Git).

- `aphrody-dust-cli launch <rom.nds> [--model ds|lite|ique|iquelite|dsi] [--addr 127.0.0.1:0] [--arm7-bios PATH] [--arm9-bios PATH] [--firmware PATH] [--dust-desktop-bin PATH]`
  Starts `dust-desktop --headless` in the background (no window) and loads the ROM. Polls its
  stdout until it reports the listening port. Boots straight into the game (direct boot) unless
  both `--arm7-bios`/`--arm9-bios` are given.

- `aphrody-dust-cli break <addr> [--core arm7|arm9]`
  Sets a live breakpoint -- e.g. `aphrody-dust-cli break 0x02004000`. Addresses accept `0x...`, `$...`, or
  bare hex. **No relaunch required, ever** -- this calls the core's `add_breakpoint` directly
  against the live `Emu`, so a brand-new address takes effect immediately. Defaults to ARM9 (the
  CPU running most game logic); pass `--core arm7` for ARM7-side code (audio/wifi/some I/O).
- `aphrody-dust-cli unbreak <addr> [--core arm7|arm9]` -- removes a breakpoint.
- `aphrody-dust-cli breaks [--core arm7|arm9]` -- lists current breakpoints for that core.

- `aphrody-dust-cli continue` -- resumes both cores and blocks until the next stop (breakpoint,
  watchpoint, or ROM shutdown), printing the stop reason.
- `aphrody-dust-cli run <frames>` -- emulates exactly that many frames and stops (or stops earlier at a
  breakpoint/watchpoint, reporting how many frames it managed). Prefer this over timing a
  `continue` against the wall clock: headless Dust runs at ~14x realtime, so wall-clock slices are
  coarse and machine-dependent, while frames are exact and reproducible.
- `aphrody-dust-cli step [--core arm7|arm9]` -- executes exactly **one instruction** on the given core
  (real instruction-level stepping, not a cycle-count approximation) and blocks until it's done.
- `aphrody-dust-cli pause` -- interrupts an in-flight `continue` from another terminal/process.

- `aphrody-dust-cli regs [--json] [--core arm7|arm9]` -- prints `pc`/`r0`-`r15`/`cpsr`, or `--json` for
  `{"pc":...,"gprs":[...],"cpsr":...}`.
- `aphrody-dust-cli set-reg <reg> <value> [--core arm7|arm9]` -- `reg` is `r0`-`r15`, `pc`, `lr`, `sp`, or
  `cpsr`.

- `aphrody-dust-cli read <addr> <length> [--raw] [--core arm7|arm9]` -- reads a byte range from that
  core's address space via side-effect-free debug reads (works uniformly across main RAM,
  ITCM/DTCM, VRAM, I/O). Default output is one `addr: byte` line per byte, meant to be redirected
  to a file for `diff`ing; `--raw` writes the raw bytes to stdout.
- `aphrody-dust-cli write <addr> --bytes-hex "AA BB CC" [--core arm7|arm9]` (or pipe raw bytes on stdin if
  `--bytes-hex` is omitted) -- writes through the core's debug memory-write path. Use this to
  force a state variable and watch what happens next.

- `aphrody-dust-cli press <button...>` / `aphrody-dust-cli release [button...]` -- injects joypad input directly.
  Buttons: `a b x y select start right left up down r l`, e.g. `aphrody-dust-cli press start` or
  `aphrody-dust-cli press up right` (diagonal). `release` with no args releases everything.
- `aphrody-dust-cli tap <x> <y>` / `aphrody-dust-cli drag <x,y> <x,y>...` / `aphrody-dust-cli touch <x> <y>` /
  `aphrody-dust-cli release-touch` / `aphrody-dust-cli touch-script <file>` / `aphrody-dust-cli touch-state` -- the
  touchscreen. See "Touchscreen input" below; most DS games need this, and getting it wrong is
  silent, so read that section before your first stylus interaction.

- `aphrody-dust-cli screenshot [path]` -- dumps both screens (top then bottom, stacked) as a 256x384 PNG
  -- the fastest way to confirm "which screen is this state value" instead of inferring from
  memory/PC alone.

- `aphrody-dust-cli checkpoint` / `save-replay <path>` / `replay <path>` -- deterministic record/replay,
  see below.

- `aphrody-dust-cli kill` -- tears down the session (kills `dust-desktop`, removes session state).

## Touchscreen input

Most DS games are stylus-driven, and two properties of the hardware make naive injection fail
_silently_ -- the ROM simply behaves as if you never touched it. Both are handled by the commands
below, so you can think purely in "where on the screen" and "for how long".

**Coordinates are bottom-screen pixels**: `0..=255` across, `0..=191` down, origin top-left --
the same coordinates you'd read off a screenshot's bottom half. Off-screen coordinates are
rejected with an error rather than clamped.

> The panel itself reports raw 12-bit ADC readings, which the game converts to pixels using the
> calibration in the firmware's user settings -- normally `pixel = adc / 16`. These commands invert
> that conversion (using the calibration from the firmware image actually in use), so you never
> deal with it. If you ever see a stroke land in a ~16x12 patch in the screen's top-left corner,
> that's pixel coordinates reaching the panel unconverted. `--raw` deliberately opts out and passes
> 12-bit readings straight through.

**A touch is a sequence, not a state**: a game samples the panel once per frame, so a tap must stay
down for several frames to register, and a drag only exists if the position moves _between_ frames
while the emulator is running. Every command below is measured in frames and runs the emulator for
exactly that long -- there is no need to interleave `run`/`continue` yourself, and no reason to
build gestures out of wall-clock-timed slices.

```
aphrody-dust-cli tap 128 96                        # press and release at the centre of the bottom screen
aphrody-dust-cli tap 200 40 --hold-frames 30       # a long press (~0.5s)

aphrody-dust-cli drag 40,150 200,60                # a stroke; duration scales with the path length
aphrody-dust-cli drag 40,150 120,20 200,60 \       # a multi-point path, sampled once per frame
    --duration-frames 60
aphrody-dust-cli drag 20,20 200,170 --no-release   # leave the pen down at the last point

aphrody-dust-cli touch 128 96                      # put the pen down and leave it there (runs no frames)
aphrody-dust-cli run 30                            # ...hold it there for 30 frames
aphrody-dust-cli release-touch                     # lift it (also cancels a gesture in flight)

aphrody-dust-cli touch-state                       # where the pen is, and how much gesture is pending
```

`tap`/`drag` report the frames they emulated (`frames_elapsed frames=22`). Timing knobs, all in
frames: `--hold-frames`/`--release-frames` on `tap` (default 6 and 2); on `drag`,
`--duration-frames` (the moving part of the stroke; defaults to ~3 px/frame, a natural stylus
speed), `--hold-start-frames`/`--hold-end-frames` (default 4 each -- these are what make a game
register the touch-down and touch-up at the exact endpoints instead of mid-motion),
`--release-frames`, and `--no-release`.

For anything those don't cover, `touch-script` takes the general form the others desugar to: an
explicit per-frame timeline, where a sample without `x`/`y` lifts the pen.

```
echo '[{"x":40,"y":150,"frames":4},{"x":90,"y":110},{"x":140,"y":70},{"frames":2}]' \
  | aphrody-dust-cli touch-script -
```

### Gestures and breakpoints

A gesture stops early if a breakpoint or watchpoint fires partway through, and the remainder stays
queued -- so you can catch a stroke arriving in the game's own touch handler and then let it finish:

```
aphrody-dust-cli break 0x0203a1c4                  # the game's touch handler
aphrody-dust-cli drag 40,150 200,60                # -> breakpoint core=arm9 pc=... touch_remaining=61
aphrody-dust-cli regs                              # inspect it mid-stroke
aphrody-dust-cli continue                          # the rest of the stroke plays out
```

`touch_remaining` on a stop line is how many frames of gesture are still pending (`touch-state`
reports the same as `queued_frames`). A new touch command replaces whatever was pending. Gestures
are recorded into `checkpoint`/`save-replay` like any other input, so a scripted stroke replays
exactly -- and dumping a replay's input log is a precise way to confirm what the panel actually
saw, frame by frame.

## Dust's real watchpoints

Dust has **real, hardware-accurate watchpoints** backed by the core's own bus-fallback mechanism
(a radix-tree bitmap checked from every fallback-path memory access) -- not a polling/diff trick.

```
aphrody-dust-cli watch 0x02100000 --rw w              # write-only by default
aphrody-dust-cli watch 0x02100000 --size 4 --rw both  # a 4-byte range, both reads and writes
# no need to `continue` separately after setting it if the emulator is already running --
# it stops itself the instant a matching access occurs.
aphrody-dust-cli continue                              # blocks until that address is hit
aphrody-dust-cli regs                                  # see exactly which instruction did it
aphrody-dust-cli unwatch 0x02100000 --rw w             # remove it
```

`--rw` accepts `r`, `w`, or `both`; `--size` is the watched region's byte length (default 1).
Defaults to ARM9; pass `--core arm7` for ARM7-side watchpoints.

### The "poor man's watchpoint" recipe (for bulk range inspection)

Useful when you want to inspect a _range_ of addresses in bulk rather than trigger on one:

```
aphrody-dust-cli break 0x02004000                      # e.g. some known frame-tick function
aphrody-dust-cli continue                              # run to it
aphrody-dust-cli read 0x02100000 64 > /tmp/before.txt   # snapshot a candidate main-RAM range
aphrody-dust-cli continue                              # let one more frame/tick pass
aphrody-dust-cli read 0x02100000 64 > /tmp/after.txt
diff /tmp/before.txt /tmp/after.txt             # -> exactly which addresses changed, old->new
```

## Record/replay workflow

Deterministic gameplay capture and playback, built on Dust's savestate serialization plus a
recorded input-event log timestamped against the emulator's own schedule clock (not wall time).

```
aphrody-dust-cli launch game.nds
aphrody-dust-cli checkpoint                  # mark "now" as a replay origin
aphrody-dust-cli press start
aphrody-dust-cli continue
...                                   # play normally: press/release/touch/continue/write, etc.
aphrody-dust-cli save-replay run1.replay      # bundles the checkpoint snapshot + input log

# Later, in a fresh session:
aphrody-dust-cli launch game.nds
aphrody-dust-cli replay run1.replay           # loads the checkpoint, arms input playback
aphrody-dust-cli continue                     # replays deterministically
aphrody-dust-cli screenshot frame.png         # inspect any point along the replay
```

`replay` verifies the replay file was recorded against the same ROM (CRC32 check) and refuses to
load a mismatched one. Determinism holds because Dust's core has no RNG and headless mode's RTC
backend is fixed rather than reading the host's wall clock -- the only non-determinism a normal
session would have.

## Recipe: confirm which screen a state value corresponds to

Static analysis can map every value a state variable takes and every code path that sets it, but
can't tell you _what the player actually sees_ at each value -- that needs the ROM running.

```
aphrody-dust-cli launch game.nds
aphrody-dust-cli continue                    # let it boot to the title/menu (use `aphrody-dust-cli pause` from
                                      # another shell if it never stops on its own)
aphrody-dust-cli read 0x02100000 1           # note the current state value
aphrody-dust-cli screenshot state1.png       # see it directly instead of inferring from memory
aphrody-dust-cli press start
aphrody-dust-cli continue
aphrody-dust-cli read 0x02100000 1           # did it change?
aphrody-dust-cli screenshot state2.png       # confirm the resulting screen
```

Repeat with different buttons to map out the full state -> screen correspondence.

## Known limitations

- One `dust-desktop --headless` process per `.dust-cli-state.json`/working directory.
- `continue` blocks its own connection until a stop occurs; use `aphrody-dust-cli pause` (a second, short
  connection) to interrupt it if the ROM never hits a breakpoint/watchpoint on its own.
- Headless mode always uses the software 2D/3D renderers (needed for synchronous screenshot
  readback) and the interpreter engine, not the JIT.
- Save-file (SPI/flash) persistence isn't wired up in headless mode -- sessions always start from
  an empty save.
- No `#[test]`s exist in this codebase; correctness of the bridge itself was verified with a
  manual smoke test (`launch`, `regs`, `break`+`continue`, `watch`+`continue`, `step`, `press`+
  `screenshot`, `checkpoint`/`save-replay`), not an automated suite.
- `step` **or `continue`** issued while PC currently sits on an active breakpoint immediately
  re-reports that same breakpoint instead of advancing (the check happens at fetch-time, before the
  step executes). `unbreak` the current address first if you need to move forward from it. To
  sample one breakpoint repeatedly, loop `unbreak ADDR` -> `step` -> `break ADDR` -> `continue`;
  a plain `continue` loop returns byte-identical registers every iteration, which reads as "this
  value is constant" rather than as a stall.

## Source ownership and runtime boundary

The canonical Python TCP client is `crates/emu/cli/dust-cli`. Emulator logic lives in
`crates/emu/core`, and renderer code lives in `crates/emu/render/*`. The retained
headless TCP server is `vendor/dust-imgui-frontend-archive/src/emu/cli_server.rs`;
that archived ImGui frontend is outside the active root Cargo workspace.

The root Rust package `aphrody-dust-cli` builds the `dust` executable for ROM tools,
static analysis and thin forwarding to the Python debug client. It does not build
or launch an embedded TCP server. Debug commands require a separately supplied
compatible `dust-desktop` with `cli-server`, selected through `--dust-desktop-bin`
or `DUST_DESKTOP_BIN`. A standalone build of the archived frontend has not been
validated by the current root gates; do not treat old build recipes as supported.

The duplicated source snapshot formerly shipped in this skill was consolidated
into those owners. Its provenance and retained differences are recorded in
`docs/upstream/dust/DUST-CLI-SNAPSHOT.md` in the IECODE checkout.

## Install into another project

Run from this skill directory in the IECODE checkout:

```sh
./install.sh /path/to/other/project
```

This creates `.claude/skills/dust-cli-bridge/SKILL.md` and a self-contained
Python client at `.claude/skills/dust-cli-bridge/bin/aphrody-dust-cli`. It does not
copy emulator source, build directories or private inputs. Supply `dust-desktop`
separately through `--dust-desktop-bin` or `DUST_DESKTOP_BIN`.

## Unified IECODE CLI

In the IECODE checkout, the Rust `dust` executable forwards `dust debug <command...>`
and `dust <command...>` to the canonical Python client. For example,
`dust debug launch game.nds --model ds` requires the same external `dust-desktop`
as `aphrody-dust-cli launch`. The Python client's protocol and per-working-directory
session state are shared; static ROM tools remain separate Rust commands.
