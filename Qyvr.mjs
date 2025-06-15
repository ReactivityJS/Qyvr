const
/**
 * Represents a single event namespace with hook handling.
 * @class
 */
Qyvent = class {
    /**
     * Collection of registered hooks.
     * @type {Array<{id: string, name: string[], action: string, cb: Function, phase: string}>}
     */
    hooks = []

    /**
     * Create a Qyvent instance.
     * @param {string} id - The event ID prefix.
     * @param {string[]} [phases=['main*']] - List of hook phases, one may end with '*' to indicate default.
     * @param {object} [ctx={}] - Optional shared context for all hooks.
     */
    constructor(id, phases = ['main*'], ctx = {}) {
        this.id = id
        this.ctx = ctx
        this.phases = phases.map(phase => {
            if(phase.endsWith('*')) {
                return this.main = phase.slice(0, -1)
            } else {
                return phase
            }
        })
    }

    /**
     * Register a hook callback.
     * @param {string} pattern - The pattern to match (e.g., 'prefix.name.action').
     * @param {Function} cb - The callback function to register.
     * @param {string} [phase=this.main] - The execution phase to use.
     * @returns {Function} - A function to unregister the hook.
     */
    hook(pattern, cb, phase = this.main) {
        let 
        name = pattern.split('.'),
        id = name.shift(),
        action = name.pop(),
        hookObj = { id, name, action, cb, phase }
        this.hooks.push(hookObj)
        this.hooks.sort((a, b) => this.phases.indexOf(a.phase) - this.phases.indexOf(b.phase))
        return () => this.hooks.splice(this.hooks.indexOf(hookObj))
    }

    /**
     * Check if a hook exists for the given pattern.
     * @param {string} pattern - The pattern to look for.
     * @returns {boolean} - True if a matching hook exists, otherwise false.
     */
    has(pattern) {
        pattern = [...new Set([ this. id, ...pattern.split('.') ])]
        let 
        id = pattern.shift(),
        action = pattern.pop()
        return this.hooks.findIndex(hook => id === hook.id && action == hook.action && pattern.join('.') === hook.name.join('.')) > -1
    }
},

/**
 * Adds a new Qyvent instance to the map.
 * @param {Map<string, Qyvent>} Qyvents - The map of event namespaces.
 * @param {string} id - The event ID.
 * @param {string[]} [phases=['main*']] - Phases for hook execution.
 * @param {object} [ctx={}] - Shared context object.
 */
addEvent = (Qyvents, id, phases = ['main*'], ctx = {}) => {
    Qyvents.set(id, new Qyvent(id, phases, ctx))
},

/**
 * Deletes an existing Qyvent instance from the map.
 * @param {Map<string, Qyvent>} Qyvents - The map of event namespaces.
 * @param {string} id - The event ID to delete.
 */
delEvent = (Qyvents, id) => {
    Qyvents.delete(id)
},

/**
 * Adds a generic hook to an event.
 * @param {Map<string, Qyvent>} Qyvents - The map of event namespaces.
 * @param {string} pattern - Pattern to match the hook.
 * @param {Function} cb - Callback to execute.
 * @param {string} [phase] - Optional execution phase.
 * @returns {Function} - Function to unregister the hook.
 */
addHook = (Qyvents, pattern, cb, phase) => {
    let 
    id = pattern.split('.', 1)[0],
    event = Qyvents.get(id)
    return event.hook(pattern, cb, phase)

},

/**
 * Fires hooks for a given pattern with provided arguments.
 * Executes all matching hooks in the defined phase order.
 * 
 * @async
 * @param {Map<string, Qyvent>} Qyvents - The map of event namespaces.
 * @param {string} pattern - Pattern to match the hooks (e.g., 'id.name.action').
 * @param {...any} args - Arguments to pass to each hook.
 * @returns {Promise<any>} - The return value from the last matching hook, or undefined.
 *
 * @todo handle async & sync
 * @todo need to work with single event filtered?
 */
fire = async (Qyvents, pattern, ...args) => {
    pattern = pattern.split('.')
    let 
    id = pattern.shift(),
    action = pattern.pop(),
    event = Qyvents.get(id),
    ctx = {
        ...event.ctx,
        args,
        return: undefined,
        stop() { ctx.stopped = true }
    },
    // filter event hooks by pattern
    hooks = event.hooks.filter(hook => {
        if(id !== hook.id || action !== hook.action || hook.name.length !== pattern.length) {
            return false 
        } else {
            return hook.name.every((part, index) => {
                return part === pattern[index] || part === '*'
            })
        }
    })
    //if(event.ctxRO) ...
    for(const hook of hooks) {
        const result = await Promise.resolve(hook.cb.call(ctx, ...args))
        console.log("DEBUG FIRE", hook.id, hook.name, hook.action, result, hook)
        if(result !== undefined) {
            ctx.return = result
        }
        if(ctx.stopped) {
            break
        }
    }
    return ctx.return
},

/**
 * Proxy handler for Qyvr namespaces.
 * Enables dynamic property and method access for event-driven interaction with Qyvr namespaces.
 *
 * default traps:
 * - `get`: Intercepts property access and maps it to `.call` or `.get` events.
 * - `apply`: Allows callable proxies that return new namespace-specific proxies.
 */
qyvrProxyHandler = {
    get: ({ ns, Qyvents, handler }, property) => {
        const 
        qyvr = Qyvents.get(ns),
        callPattern = `${ns}.${property}.call`,
        getPattern = `${ns}.${property}.get`
        if(qyvr.has(callPattern)) {
            return (...args) => fire(Qyvents, callPattern, ...args)
        } else {
            return fire(Qyvents, getPattern)
        }
    },
    apply: ({ ns, Qyvents, handler }, thisArg, args) => {
        return QyvrProxy(Qyvents, args[0], handler)
    }
},

/**
 * Creates a proxy for a given namespace that routes get/apply operations through handler.
 * 
 * @param {Map<string, Qyvent>} Qyvents - The map of event namespaces.
 * @param {string} ns - Namespace for the proxy.
 * @param {ProxyHandler<any>} [handler={}] - Optional proxy handler.
 * @returns {Proxy} - A proxy for the given namespace.
 */
QyvrProxy = (Qyvents, ns, handler = {}) => {
    const Qyvr = function(){}
    handler = { ...qyvrProxyHandler, ...handler }
    return new Proxy(Object.assign(Qyvr, { ns, Qyvents, handler }), handler)
},

/**
 * Initializes a Qyvr instance with the given options.
 * Registers core hooks and sets up proxy behavior.
 * 
 * @param {object} [opts={}] - Options for Qyvr initialization.
 * @param {object} [opts.ctx={}] - Shared context object for events.
 * @param {Array} [opts.hooks=[]] - Initial hooks to register.
 * @param {string} [opts.ns='qyvr'] - Default namespace for the Qyvr instance.
 * @param {string[]} [opts.phases=['qyvr*']] - Hook execution phases.
 * @param {ProxyHandler<any>} [opts.prx] - Optional proxy handler.
 * @returns {Proxy} - A Qyvr proxy instance.
 */
Qyvr = function(opts = {}) {
    const {
        ctx = {},
        hooks = [],
        ns = 'qyvr',
        phases = [ns + '*']
    } = opts,
    Qyvents = new Map(),
    coreHooks = [
        // [ name, cb, optionalPhase ]
        ...hooks,
        [ 'plugin.call', qyvrPlugin ],
        [ 'add.call', addEvent ],
        [ 'del.call', delEvent ],
        [ 'hook.call', addHook ],
        [ 'fire.call', fire ]
    ]
    // install core plugin
    return qyvrPlugin(Qyvents, ns, coreHooks, phases, ctx)
},

/**
 * Install Qyvr plugin 
 * Creating a new event namespace and registering hooks.
 *
 * @param {Map<string, any>} Qyvents - The central map containing all Qyvent instances.
 * @param {string} ns - The namespace (event ID prefix) under which the hooks will be registered.
 * @param {Array<[string, Function, string?]>} hooks - Array of hook definitions: [name, callback, optionalPhase].
 * @param {string[]} [phases=['main*']] - Optional list of execution phases; one may end with '*' to denote default.
 * @param {object} [ctx={}] - Optional context object shared across all hooks in this namespace.
 */
qyvrPlugin = (Qyvents, ns, hooks, phases, ctx) => {
    addEvent(Qyvents, ns, phases, ctx)
    hooks.forEach(([name, cb, phase ]) => {
        addHook(Qyvents, `${ns}.${name}`, cb.bind(null, Qyvents), phase)
    })
    return QyvrProxy(Qyvents, ns)
},

/**
 * Qyvr core property helper 
 * Creates getter and setter hooks for a given property pattern.
 * @param {Map<string, Qyvent>} Qyvents - The map of event namespaces.
 * @param {string} pattern - The pattern for the property (e.g., 'id.name').
 * @param {Function} [getter=()=>{}] - The getter function.
 * @param {Function} [setter=()=>{}] - The setter function.
 * @returns {Function} - Function to remove both getter and setter hooks.
 */
propertyHook = (Qyvents, pattern, getter = ()=>{}, setter = ()=>{}) => {
    let 
    id = pattern.split('.', 1)[0],
    event = Qyvents.get(id),
    removeGetter = event.hook(pattern + '.get', getter),
    removeSetter = event.hook(pattern + '.set', setter)
    return () => {
        removeGetter()
        removeSetter()
    }
},

/**
 * Qyvr core method helper
 * Creates a callable method hook in main phase and with "call" action.
 * @param {Map<string, Qyvent>} Qyvents - The map of event namespaces.
 * @param {string} pattern - The pattern for the method (e.g., 'id.name').
 * @param {Function} cb - The callback to invoke when the method is called.
 * @returns {Function} - Function to unregister the hook.
 */
methodHook = (Qyvents, pattern, cb) => {
    let 
    id = pattern.split('.', 1)[0],
    event = Qyvents.get(id)
    console.log("debug", id, event)
    return event.hook(pattern + '.call', cb)
}

export { Qyvr, propertyHook, methodHook }
