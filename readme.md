# Qyvr - "Hook any Event. React everywhere."

Qyvr is a lightweight yet powerful event and hook system for JavaScript/Node.js. It offers fully hookable, reactive, and observable event structures ideal for modular architectures, plugin-based systems, or proxy-driven APIs.

## Core Features

* **Hookable Events**: Attach hooks to any event using structured patterns
* **Reactive**: Dynamically respond to property or method changes
* **Observable**: Wildcard support allows monitoring broad event scopes
* **Context-Aware**: Hooks receive contextual data and execution control
* **Sync & Async**: Hooks can be executed serially and awaitable

## Usage

Import manually:

```js
import { Qyvr } from './Qyvr.js'
```

## Event Structure

Each event instance is registered by an `id` (prefix). Event names follow:

```
[id].[nameParts].[action]
```

Examples:

* `sys.login.call`
* `nodes.node1.status.set`
* `nodes.*.status.set`

## Example

### Setup

```js
const qx = new Qyvr()
qx.add('sys', ['pre', 'main*', 'post'])
qx.add('nodes', ['main*'])
```

### Registering Methods

```js
qx.method('sys.login', function(username, password) {
  console.log('Login attempt for', username)
  return username === 'admin'
})

await qx.fire('sys.login.call', 'admin', '1234')
```

### Registering Properties

```js
let status = 'online'

qx.property('nodes.node1.status',
  function() { return status },
  function(val) { status = val }
)

await qx.fire('nodes.node1.status.set', 'offline')
await qx.fire('nodes.node1.status.get') // returns 'offline'
```

### Wildcard Hook

```js
qx.hook('nodes.*.status.set', function(newValue) {
  console.log('Status changed to', this.args[0])
})
```

### Hook Context (`this`)

Every hook receives a special context as `this`:

```js
qx.hook('sys.logout.call', function() {
  this.return = 'Logged out'   // Explicit return value
  this.stop()                 // Abort remaining hooks
})
```

**Available context properties:**

* `this.args`: Arguments passed to `fire()`
* `this.return`: Return value for the event
* `this.stop()`: Stops further hook execution

Alternatively, you can `return` a value directly from the hook (as long as it is not `undefined`).

## API

### `Qyvr.add(id, phases = ['main*'], ctx = {})`

Adds a new event instance with a unique ID and optional hook phases.

### `Qyvr.method(pattern, callback)`

Registers a callable method hook under `[pattern].call`.

### `Qyvr.property(pattern, getter, setter)`

Registers getter and setter hooks for a reactive property.

### `Qyvr.hook(pattern, callback, phase?)`

Adds a hook to any event pattern, optionally specifying the execution phase.

### `Qyvr.fire(pattern, ...args)`

Triggers hooks matching the event pattern in phase order (awaits async hooks).

### `Qyvr.has(pattern)`

Checks if any hook matches a given pattern.

---

## License

MIT

---

Questions, ideas, or improvements? PRs and issues are welcome ✨
