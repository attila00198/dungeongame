/**
 * DOMino - A tiny, functional-style DOM building library
 * 
 * Build composable DOM structures with chainable, zero-dependency helpers.
 * Features functional element factories (div, span, form, etc.) and fluent API
 * for attributes, styles, events, and form control.
 * 
 * @version 1.0.0
 * @author Attila Kiss
 * @license MIT
 * 
 * Usage:
 *   const card = div(
 *     h1('Title').addClass('header'),
 *     p('Description'),
 *     btn('Click me').onClick(() => alert('clicked'))
 *   ).setStyle({ padding: '20px', backgroundColor: '#f0f0f0' })
 *   
 *   document.body.appendChild(card)
 * 
 * All functions are automatically available on the global scope.
 * TreeShakeable: use an ES6-compatible bundler to strip unused helpers.
 */

/**
 * Creates a DOM element with the specified tag name and appends child nodes or text.
 * Adds chainable helper methods to the element for setting attributes, event listeners, id, class, etc.
 *
 * @function tag
 * @param {string} name - The tag name of the element to create (e.g., 'div', 'span').
 * @param {...(string|Node)} children - Child elements or text to append to the created element.
 * @returns {HTMLElement} The created DOM element with chainable helper methods:
 *   - setAttr(attrs: Object): HTMLElement
 *   - setId(idOfElement: string): HTMLElement
 *   - addClass(className: string): HTMLElement
 *   - removeClass(className: string): HTMLElement
 *   - toggleClass(className: string): HTMLElement
 *   - setClasses(...calssNames: string ): HTMLElement
 *   - setStyle(style: string|Object): HTMLElement
 *   - setDisabled(disabled = true): HTMLElement
 *   - on(eventType: string, callbackFunction: function): HTMLElement
 *   - onClick(callbackFunction: function): HTMLElement
 */
function tag(name, ...children) {
    const node = document.createElement(name)
    children.forEach(child => {
        node.appendChild(
            typeof child === "string" ? document.createTextNode(child) : child
        )
    })

    node.setAttr = function (attributeList) {
        for (const item in attributeList) {
            this.setAttribute(item, attributeList[item])
        }
        return this
    }

    node.setId = function (id) {
        this.setAttr({ id })
        return this
    }

    node.addClass = function (className) {
        this.classList.add(className)
        return this
    }

    node.removeClass = function (className) {
        this.classList.remove(className)
        return this
    }

    node.toggleClass = function (className) {
        this.classList.toggle(className)
        return this
    }

    node.setClasses = function (...classNames) {
        this.className = classNames.join(' ')
        return this
    }

    node.setStyle = function (style) {
        // Accept either a css text string or an object map of CSS properties
        if (typeof style === 'string') {
            this.style.cssText = style
        } else if (typeof style === 'object' && style !== null) {
            Object.assign(this.style, style)
        }
        return this
    }

    node.setDisabled = function (disabled = true) {
        this.disabled = disabled
        return this
    }

    node.on = function (eventType, callbackFunction) {
        this.addEventListener(eventType, callbackFunction)
        return this
    }

    node.onClick = function (callbackFunction) {
        this.on("click", callbackFunction)
        return this
    }

    return node
}

// ========== Helpers ==========

const clearHTML = (element) => {
    element.innerHTML = ""
}

const replaceHTML = (element, ...children) => {
    clearHTML(element)
    children.forEach(child => element.appendChild(child))
}

const replaceText = (element, newText) => {
    element.textContent = newText
}

// ========== Primitives ==========

// simple tag factories are generated to keep the code DRY
const _simpleTagNames = [
    "hr", "br", "div", "header", "main", "footer",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "em", "mark", "small", "span", "p", "nav"
];
for (const _t of _simpleTagNames) {
    globalThis[_t] = (...children) => tag(_t, ...children);
}

const a = (label, url, target = "") => {
    const node = tag("a").setAttr({ href: url, target })
    node.innerText = label
    return node
}

const img = (source) => tag("img").setAttr({ src: source })

const btn = (label, type = "button") => {
    const node = tag("button")
    node.setAttr({ type })
    node.innerText = label
    return node
}

// ========== List ============

const ul = (...children) => tag("ul", ...children)
const ol = (...children) => tag("ol", ...children)
const li = (...children) => tag("li", ...children)

// ========== FORM ============
function form(...children) {
    const node = tag("form", ...children)

    node.setMethod = function (method) { this.setAttr({ method }); return this }
    node.setAction = function (action) { this.setAttr({ action }); return this }
    node.setAutocomplete = function (value) { this.setAttr({ autocomplete: value }); return this }
    node.setEnctype = function (value) { this.setAttr({ enctype: value }); return this }
    node.setTarget = function (value) { this.setAttr({ target: value }); return this }
    node.onSubmit = function (callback) { this.addEventListener("submit", callback); return this }

    return node
}

function input(type = "text") {
    const node = tag("input")
        .setAttr({ type })

    node.setValue = function (value) { this.value = value; return this }
    node.setType = function (type) { this.setAttr({ type }); return this }
    node.setName = function (name) { this.setAttr({ name }); return this }
    node.setPlaceholder = function (placeholder) { this.setAttr({ placeholder }); return this }
    node.setPattern = function (pattern) { this.setAttr({ pattern }); return this }
    node.setMin = function (min) { this.setAttr({ min }); return this }
    node.setMax = function (max) { this.setAttr({ max }); return this }
    node.setDisabled = function (disabled = true) { this.disabled = disabled; return this }
    node.setRequired = function (required = true) { this.required = required; return this }
    node.onInput = function (callback) { this.addEventListener("input", callback); return this }
    node.onChange = function (callback) { this.addEventListener("change", callback); return this }

    return node
}

function textarea() {
    const node = tag("textarea")

    node.setPlaceholder = function (placeholder) { this.setAttr({ placeholder }); return this }
    node.setValue = function (value) { this.value = value; return this }
    node.setName = function (name) { this.setAttr({ name }); return this }
    node.setDisabled = function (disabled = true) { this.disabled = disabled; return this }
    node.setRequired = function (required = true) { this.required = required; return this }

    return node
}

function select(...children) {
    const node = tag("select", ...children)

    node.setName = function (name) { this.setAttr({ name }); return this; }
    node.setValue = function (value) { this.value = value; return this; }
    node.onChange = function (callback) { this.addEventListener("change", callback); return this }
    node.setDisabled = function (disabled = true) { this.disabled = disabled; return this }
    node.setRequired = function (required = true) { this.required = required; return this }

    return node
}

function option(label, value, isSelected = false) {
    const node = tag("option", label).setAttr({ value })
    if (isSelected) node.selected = true
    return node
}

function label(...children) {
    const node = tag("label", ...children)
    node.setTarget = function (targetId) { this.setAttr({ for: targetId }); return this }
    return node
}

// ========== Table ============

const table = (...children) => tag("table", ...children)
const thead = (...children) => tag("thead", ...children)
const tbody = (...children) => tag("tbody", ...children)
const caption = (...children) => tag("caption", ...children)
const tr = (...children) => tag("tr", ...children)
const td = (...children) => tag("td", ...children)
const th = (...children) => tag("th", ...children)

// ========== Graphics ============

function canvas(width = 300, height = 150) {
    const node = tag("canvas").setAttr({ width, height })

    node.setWidth = function (w) { this.width = w; return this }
    node.setHeight = function (h) { this.height = h; return this }
    node.setSize = function (w, h) { this.width = w; this.height = h; return this }

    node.get2d = function () { return this.getContext('2d') }
    node.getWebGL = function () { return this.getContext('webgl') }

    // Kényelmes rajzolás callback-kel
    node.draw = function (callback) {
        const ctx = this.getContext('2d')
        callback(ctx, this)
        return this
    }

    return node
}

// ========== Utilities ============

// Simpler query selectors
const getById = (id) => document.getElementById(id)
const getByClass = (className) => document.getElementsByClassName(className)
const getByTag = (tagName) => document.getElementsByTagName(tagName)

// ========== Basic Router ============
/**
 * A simple universal router for rendering pages based on URL hash changes.
 * 
 * @param {Object} routes - Key-value pairs where key is the route path and value is a function that returns content
 * @param {HTMLElement|string} container - DOM element or selector string for the container where content will be rendered
 * @param {string} defaultRoute - Default route when no hash is present (default: "home")
 */
function basicRouter(routes, container, defaultRoute = "home") {
    // Resolve container to DOM element
    let rootElement
    if (typeof container === 'string') {
        rootElement = document.querySelector(container)
        if (!rootElement) {
            throw new Error(`Container element not found: ${container}`)
        }
    } else if (container && container.nodeType === 1) { // Check if it's a DOM element
        rootElement = container
    } else {
        throw new Error('Container must be a DOM element or a valid CSS selector string')
    }

    const renderRoute = () => {
        const path = window.location.hash.slice(1) || defaultRoute
        const pageFunction = routes[path]

        // Clear container
        rootElement.innerHTML = ''

        if (pageFunction && typeof pageFunction === 'function') {
            rootElement.appendChild(pageFunction())
        } else {
            // Simple 404 fallback
            const notFound = document.createElement('div')
            notFound.textContent = '404 Not Found'
            rootElement.appendChild(notFound)
        }
    }

    window.addEventListener("hashchange", renderRoute)
    renderRoute() // Initial render
}