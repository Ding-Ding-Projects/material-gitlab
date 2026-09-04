# Command palette

The command palette is one searchable list of everywhere this site can take
you. Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>, or use the
**Command palette** button in the header, and start typing.

## Behaviour

Commands are collected from the live page every time the palette opens, rather
than from a list somebody has to remember to update. Anything carrying
`data-command-target`, `data-feature`, `data-setting`, `data-destination`,
`role="tab"`, `data-tab-target` or an in-page `href` becomes a command, labelled
by its own accessible name. A control added to the page tomorrow appears in the
palette tomorrow, with no second registration step.

Selecting a result scrolls its target into view and moves focus to it, so the
palette leaves you at the element rather than near it.

## Keyboard

| Key | Effect |
|---|---|
| <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> | Open the palette from anywhere on the page |
| Typing | Filters the list as you type |
| <kbd>↓</kbd> / <kbd>↑</kbd> | Move through the filtered results, wrapping at each end |
| <kbd>Enter</kbd> | Go to the focused result and close the palette |
| <kbd>Esc</kbd> | Close the palette |

Results use roving `tabIndex`, so exactly one result is in the tab order at a
time and arrow keys do the moving. The results region is `aria-live="polite"`,
so a screen reader hears the count change instead of silence. An empty result
is an explicit "No matching commands." message with `role="status"`, never a
blank panel that reads as a failure to load.

## Configuration

None. The palette has no settings, stores nothing, and makes no network
request. It reads the page it is already on.

## Failure modes

- **The dialog markup is absent.** `initCommandPalette` returns a no-op
  teardown function rather than throwing, so a page without the dialog still
  loads normally.
- **`showModal` is unavailable.** The palette falls back to toggling `hidden`,
  so it still opens where the native `<dialog>` modal is not supported.
- **Nothing matches the query.** The empty state says so.

## Security and privacy

Every label passing through the palette is HTML-escaped before it is rendered,
so a label containing markup is displayed as text rather than injected. Nothing
is transmitted, stored, or logged.

## Verification

Verified against the built artifact, not the source tree: the built site was
served from `site/dist`, opened in an isolated browser profile on a hidden
Windows desktop, and the palette opener was clicked. The dialog opened and
collected 15 real destinations from the live DOM. The capture and its record
are in `site/evidence/command-palette-open.png` and
`site/evidence/command-palette.json`, both bound to the exact source commit.

The <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> binding is registered in the
same module as the click path. It was **not** exercised through that capture
route, because the background keyboard channel used for it does not deliver
that chord; that limit is stated here rather than left implied by a capture
that only shows the button working.

## History

The dialog markup and this module both shipped for several weeks while nothing
imported the module, so the button and the shortcut did nothing at all. The
build was green throughout, because a module nobody imports is not an error.
That is why the site's completeness check now refuses any row claiming to be
implemented while the files it names do not exist.
