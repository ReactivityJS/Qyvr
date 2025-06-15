# Qyvr - "Hook any Event. React everywhere."

Qyvr is a lightweight yet powerful event and hook system for JavaScript/Node.js. It offers fully hookable, reactive, and observable event structures ideal for modular architectures, plugin-based systems, or proxy-driven APIs.

---

## 🔧 Core Features

* **Hookable Events** – Attach hooks to any event using structured patterns like `namespace.name.action`
* **Reactive** – Hook property (actions `.get`, `.set`) or method (`.call`) events using matching event pattern
* **Observable** – Wildcard support (e.g. `nodes.*.status.set`) for broad monitoring
* **Context-Aware** – Hooks receive a context object with arguments, return overrides, and control flow
* **Sync & Async** – Supports both synchronous (todo!) and asynchronous hooks, preserving phase order

---

## 📦 Installation

Import manually:

```js
import { Qyvr } from './Qyvr.mjs'
```

---

## 🧠 Event Structure

Each event instance is registered by an `id` (namespace). Event names follow:

```
[id].[nameParts].[action]
```

Examples:

- `sys.login.call`
- `nodes.node1.status.set`
- `nodes.*.status.set`

---

## 🚀 Example

### Setup

```js
const qx = new Qyvr()
qx.add('sys', ['pre', 'main*', 'post'])
qx.add('nodes', ['main*'])
```

---

### Registering a Method (optional plugin)

```js
qx.method('sys.login', function(username, password) {
  console.log('Login attempt for', username)
  return username === 'admin'
})

await qx.fire('sys.login.call', 'admin', '1234') // true
```

---

### Registering a Property (optional plugin)

```js
let status = 'online'

qx.property('nodes.node1.status',
  () => status,
  (val) => { status = val }
)

await qx.fire('nodes.node1.status.set', 'offline')
await qx.fire('nodes.node1.status.get') // 'offline'
```

---

### Wildcard Hook

```js
qx.hook('nodes.*.status.set', function(newValue) {
  console.log('Status changed to', this.args[0])
})
```

---

## 🔍 Hook Context

Each hook receives a context object (`this` inside hook functions):

```js
qx.hook('sys.logout.call', function() {
  this.return = 'Logged out'   // Override return value
  this.stop()                  // Abort any remaining hooks
})
```

### Context Properties

- `this.args`: Original arguments passed to `fire()`
- `this.return`: Mutable return value
- `this.stop()`: Stops further hook execution

---

## 🧪 API Reference

### `Qyvr.add(id, phases = ['main*'], ctx = {})`

Registers a new event namespace with optional execution phases and shared context.

### `Qyvr.hook(pattern, callback, phase?)`

Attaches a hook to a pattern like `sys.login.call`, optionally within a specific phase.

### `Qyvr.method(pattern, callback)` (optional plugin)

Adds a callable method hook internally as `[pattern].call`.

### `Qyvr.property(pattern, getter, setter)` (optional plugin)

Adds `.get` and `.set` hooks for a reactive property.

### `Qyvr.fire(pattern, ...args)`

Executes all hooks matching the pattern across phases. Supports async hooks.

### `Qyvr.has(pattern)`

Checks whether any hook exists for the given event pattern.

---

## 🧙‍♂️ Proxy Usage

Qyvr supports dynamic proxies for intuitive usage:

```js
const $ = new Qyvr()
$.add("user")
$.hook("user.login.call", name => console.log("Logged in", name))

// create a namespaced proxy object 
const user = $("user")
await user.login("Andre") // Triggers user.login.call
```

This transforms:

- `user.login()` → `user.login.call`
- `user.name` → `user.name.get`
- `user.name = "Max"` → `user.name.set`

---

## 🚫 Optional Qyvr core plugins "methodHook" and "propertyHook"

Core hooks like `method.call` or `property.call` are used internally and are not intended to be called manually.

You can extend Qyvr’s behavior by passing additional core hooks when initializing:

```js
const coreHooks = [
  ["property.call", propertyHook],
  ["method.call", methodHook]
]

const $ = new Qyvr({ hooks: coreHooks })
```

---

## 📄 License

MIT

---

Questions, ideas, or improvements? PRs and issues are welcome ✨
