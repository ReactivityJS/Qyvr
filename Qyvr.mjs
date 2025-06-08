const
/**
 * Class representing a single event namespace with hook handling.
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
     * @param {Function} cb - The callback function.
     * @param {string} [phase=this.main] - The execution phase.
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
     * Find matching hooks for a pattern.
     * @param {string} pattern - The event pattern to filter by.
     * @returns {Array} - Matching hook objects.
     */
    filter(pattern) {
        let 
        name = pattern.split('.'),
        id = name.shift(),
        action = name.pop()
        return this.hooks.filter(hook => {
            if(id !== hook.id || action !== hook.action || hook.name.length !== name.length) {
                return false 
            } else {
                return hook.name.every((part, index) => {
                    return part === '*' || part === name[index]
            })
            }
        })
    }
},

/**
 * Event manager for organizing multiple Qyvent instances.
 */
Qyvr = class {
    /**
     * Internal map of Qyvent instances.
     * @type {Map<string, Qyvent>}
     */
    #events = new Map()

    /**
     * Register a new event namespace.
     * @param {string} id - The ID prefix for the event.
     * @param {string[]} [phases] - Optional phase list.
     * @param {object} [ctx] - Optional shared context.
     */
    add(id, phases, ctx) {
        this.#events.set(id, new Qyvent(id, phases, ctx))
    }

    /**
     * Remove an event namespace.
     * @param {string} id - The ID prefix to remove.
     */
    del(id) {
        this.#events.delete(id)
    }

    /**
     * Check if a specific pattern has at least one hook.
     * @param {string} pattern - The event pattern.
     * @returns {boolean}
     */
    has(pattern) {
        pattern = pattern.split('.')
        let 
        id = pattern.shift(),
        action = pattern.pop(),
        event = this.#events.get(id)
        return event && event.hooks.findIndex(hook => id === hook.id && action == hook.action && pattern.join('.') === hook.name.join('.')) > -1
    }

    /**
     * Register a method-like hook (calls with `.call`).
     * @param {string} pattern - The method pattern.
     * @param {Function} cb - The callback to invoke.
     * @returns {Function} - A function to unregister the hook.
     */
    method(pattern, cb) {
        let 
        id = pattern.split('.', 1)[0],
        event = this.#events.get(id)
        console.log("debug", id, event)
        return event.hook(pattern + '.call', cb)
    }

    /**
     * Register getter and setter hooks.
     * @param {string} pattern - The property pattern.
     * @param {Function} [getter=()=>{}] - The getter function.
     * @param {Function} [setter=()=>{}] - The setter function.
     * @returns {Function} - A function to unregister both hooks.
     */
    property(pattern, getter = ()=>{}, setter = ()=>{}) {
        let 
        id = pattern.split('.', 1)[0],
        event = this.#events.get(id),
        removeGetter = event.hook(pattern + '.get', getter),
        removeSetter = event.hook(pattern + '.set', setter)
        return () => {
            removeGetter()
            removeSetter()
        }
    }

    /**
     * Register a general event hook.
     * @param {string} pattern - The event pattern.
     * @param {Function} cb - The hook function.
     * @param {string} [phase] - Optional execution phase.
     * @returns {Function} - A function to unregister the hook.
     */
    hook(pattern, cb, phase) {
        let 
        id = pattern.split('.', 1)[0],
        event = this.#events.get(id)
        return event.hook(pattern, cb, phase)
    }

    /**
     * Fire an event and run all matching hooks asynchronously.
     * @param {string} pattern - The event pattern.
     * @param {...any} args - Arguments passed to each hook.
     * @returns {Promise<any>} - The return value of the last non-undefined hook.
     * 
     * @todo (forced) sync execution?
     */
    async fire(pattern, ...args) {
        let 
        id = pattern.split('.', 1)[0],
        event = this.#events.get(id),
        ctx = {
            ...event.ctx,
            args,
            return: undefined,
            stop() { ctx.stopped = true }
        }
        //if(event.ctxRO) ...
        for(const hook of event.filter(pattern)) {
            const result = await Promise.resolve(hook.cb.call(ctx, ...args))
            console.log("DEBUG FIRE", result, hook)
            if(result !== undefined) {
                ctx.return = result
            }
            if(ctx.stopped) {
                break
            }
        }
        return ctx.return
    }
}

export { Qyvr }
