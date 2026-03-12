# Svelte implementation guide (for React developers)

This guide explains how the FakeIt popup logic was ported from vanilla HTML/JS to Svelte, and maps Svelte concepts to what you already know from React.

---

## Svelte vs React: concepts you already know

### Reactive state

| React | Svelte 5 |
|-------|----------|
| `const [count, setCount] = useState(0)` | `let count = $state(0)` |

In React you call a setter to update state; in Svelte you assign to the variable. Assignment triggers reactivity. Svelte then updates only the DOM that depends on that state (fine-grained), whereas React re-renders the component.

```svelte
<script>
  let count = $state(0);
  function increment() {
    count += 1;  // no setter, just assign
  }
</script>
<button onclick={increment}>{count}</button>
```

**Svelte 4 equivalent:** `let count = 0` (no runes; assignment is still reactive).

---

### Derived values

| React | Svelte 5 |
|-------|----------|
| `const doubled = useMemo(() => count * 2, [count])` | `const doubled = $derived(count * 2)` |

`$derived` recomputes when its dependencies change. No dependency array—Svelte tracks reads automatically.

**Svelte 4 equivalent:** `$: doubled = count * 2` (reactive declaration).

---

### Side effects

| React | Svelte 5 |
|-------|----------|
| `useEffect(() => { ... }, [deps])` | `$effect(() => { ... })` |

Svelte runs the callback when reactive dependencies used inside it change. Cleanup is done by returning a function from the callback.

**Svelte 4 equivalent:** `$: if (dep) { ... }` or `$effect` in Svelte 4 (if available).

---

### Props

| React | Svelte 5 |
|-------|----------|
| `function Child({ name, onSave }) { ... }` | `let { name, onSave } = $props();` |

You declare each prop; no single `props` object. Optional props can have defaults: `let { name = 'guest' } = $props();`.

**Svelte 4 equivalent:** `export let name;` and `export let onSave;`.

---

### Events

| React | Svelte 5 | Svelte 4 |
|-------|----------|----------|
| `onClick={handleClick}` | `onclick={handleClick}` | `on:click={handleClick}` |

Use lowercase `onclick` in Svelte 5 (DOM-style). Passing a callback to the parent works the same as in React: parent passes a function as a prop, child calls it (e.g. `onClearAll()`).

---

### Conditionals

| React | Svelte |
|-------|--------|
| `{ condition && <X /> }` or ternary | `{#if condition}<X />{:else}<Y />{/if}` |

```svelte
{#if activeTab === 'config'}
  <ConfigTable ... />
{:else}
  <About />
{/if}
```

---

### Lists

| React | Svelte |
|-------|--------|
| `{ items.map(x => <Item key={x.id} {...x} />) }` | `{#each items as item (item.id)}<Item ... />{/each}` |

The `(item.id)` is the key—like React’s `key`. You can also use index: `{#each items as item, i (i)}`.

```svelte
{#each fields as field (field.type)}
  <div class="field-row">...</div>
{/each}
```

---

### Two-way binding

| React | Svelte |
|-------|--------|
| `value={x} onChange={e => setX(e.target.value)}` | `bind:value={x}` on inputs |

For custom components, the child can expose a bindable prop with `$bindable()` so the parent can use `bind:value={locale}`.

```svelte
<!-- Parent -->
<Locale bind:locale />

<!-- Child (Locale.svelte) -->
let { locale = $bindable('es') } = $props();
<select value={locale} onchange={(e) => locale = e.currentTarget?.value}>
```

---

## What each component does (and how it maps from the vanilla example)

| Component | Role | Vanilla equivalent |
|-----------|------|--------------------|
| **App.svelte** | Holds all popup state (`customValues`, `activeTab`, `locale`, `inputCount`). Passes data and callbacks down. | The global `state` object + tab/locale; replaces the need for a single `renderFields()` by passing state and callbacks. |
| **configTable.svelte** | Renders the list of field types and their custom values (chips). Handles add value (input + button or Enter) and remove chip. | Replaces `renderFields()` and the event listeners on `.value-chip-rm`, `.add-btn`, `.add-input`. |
| **tabs.svelte** | Renders the tab strip (Custom Values / About) and sets active tab via callback. | Replaces the vanilla tab click handlers and `style.display` toggling (panel visibility is handled in App with `{#if}`). |
| **fillButton.svelte** | Calls `onFill` and shows “✓ Filled!” with a short flash animation, then resets. | Replaces the vanilla fillBtn click handler. |
| **footer.svelte** | “Clear all” button that calls `onClearAll` from App. | Replaces the vanilla clearBtn handler. |
| **locale.svelte** | Select for faker locale; binds to App’s `locale` via `$bindable()`. | Replaces `#localeSelect`. |
| **stats.svelte** | Displays “X fields” from App (e.g. from content script later). | Replaces `#inputCount`. |
| **about.svelte** | Static About tab content. | The hidden `#tab-about` div content. |

---

## Step-by-step implementation order

1. **Add `src/lib/fields.ts`**  
   Export the `FIELDS` array (and `FieldDef` type) so App and ConfigTable share one source of truth.

2. **App.svelte**  
   Define state: `customValues` (Record&lt;fieldType, string[]&gt;), `activeTab`, `locale`, `inputCount`. Compose layout and pass props/callbacks to Header, Stats, Locale, FillButton, Tabs, ConfigTable, About, Footer. Implement `onClearAll` (set every `customValues[type] = []`).

3. **configTable.svelte**  
   Remove all vanilla DOM code. Accept `fields`, `customValues`, `onAddValue`, `onRemoveValue`. Use `{#each fields as field}` and `{#each values as value, i}` for rows and chips. Use local state (e.g. `addInputs`) for the “add custom value” inputs; on submit call `onAddValue(type, value)` and clear the input.

4. **tabs.svelte**  
   Accept `activeTab` and `onTabChange`. Render two tab buttons; use `class:active={activeTab === 'config'}` (and about). Do not duplicate About content here—App conditionally renders ConfigTable vs About.

5. **fillButton.svelte**  
   Accept `onFill`. On click: call `onFill()`, set local `filling = true`, show “✓ Filled!”, use `class:filling` for the flash animation; after ~1.2s set `filling = false`.

6. **footer.svelte**  
   Accept `onClearAll` and wire the “clear all” button to it.

7. **locale.svelte**  
   Use `$bindable()` for `locale` so App can `bind:locale`. Use `value={locale}` and `onchange` to update `locale` when the user changes the select.

8. **stats.svelte**  
   Accept `count` (or `inputCount`) as a prop and render it in the “X fields” span.

9. **Optional**  
   Copy over any CSS from the vanilla example into `app.css` or components so the popup matches the design.

---

## Svelte 5 note

This project uses **Svelte 5** (`svelte: ^5` in package.json). Prefer runes in new code:

- `$state()` for reactive state
- `$props()` for props (with `$bindable()` when the parent needs to bind)
- `$derived()` for derived values
- `$effect()` for side effects

Svelte 4 style still works in many cases (e.g. `let x = 0`, `export let y`, `on:click`), but runes are the recommended approach in Svelte 5.
