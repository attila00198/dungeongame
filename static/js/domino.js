/**
 * Creates a DOM element with the specified tag name and appends child nodes or text.
 * Adds chainable helper methods to the element for setting attributes, event listeners, id, and class.
 *
 * @function
 * @param {string} name - The tag name of the element to create (e.g., 'div', 'span').
 * @param {...(string|Node)} children - Child elements or text to append to the created element.
 * @returns {HTMLElement} The created DOM element with chainable helper methods:
 *   - attr(name: string, value: string): HTMLElement
 *   - on(eventType: string, callbackFunction: function): HTMLElement
 *   - setId(idOfElement: string): HTMLElement
 *   - setClass(className: string): HTMLElement
 */
function tag(name, ...children) {
    let node = document.createElement(name)
    for (const child of children) {
        if (typeof child === "string") {
            node.appendChild(document.createTextNode(child))
        } else {
            node.appendChild(child)
        }
    }

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

    node.setClass = function (className) {
        this.className = className
        return this
    }

    node.toggleClass = function (className) {
        this.classList.toggle(className)
        return this
    }

    node.setCss = function (style) {
        // Accept either a css text string or an object map of CSS properties
        if (typeof style === 'string') {
            this.style.cssText = style
        } else if (typeof style === 'object' && style !== null) {
            Object.assign(this.style, style)
        }
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

    node.isDisabled = function () {
        this.disabled = true
        return this
    }

    return node
}

// ========== Helpers ==========

function clearHTML(element) {
    element.innerHTML = ""
}

function replaceHTML(element, ...children) {
    clearHTML(element)
    for (const child of children) {
        element.appendChild(child)
    }
}

function replaceText(element, newText) {
    element.textContent = newText
}

// ========== Primitives ==========

function hr() {
    return tag("hr")
}

function br() {
    return tag("br")
}

function div(...children) {
    return tag("div", ...children)
}

function header(...children) {
    return tag("header", ...children)
}

function main(...children) {
    return tag("main", ...children)
}

function footer(...children) {
    return tag("footer", ...children)
}

function h1(...children) {
    return tag("h1", ...children)
}

function h2(...children) {
    return tag("h2", ...children)
}

function h3(...children) {
    return tag("h3", ...children)
}

function h4(...children) {
    return tag("h4", ...children)
}

function h5(...children) {
    return tag("h5", ...children)
}

function h6(...children) {
    return tag("h6", ...children)
}

function em(...children) {
    return tag("em", ...children)
}

function mark(...children) {
    return tag("mark", ...children)
}

function small(...children) {
    return tag("small", ...children)
}

function span(...children) {
    return tag("span", ...children)
}

function p(...children) {
    return tag("p", ...children)
}

function a(label, url, target = "") {
    let node = tag("a").setAttr({ href: url, target: target })
    node.innerText = label
    return node
}

function nav(...children) {
    return tag("nav", ...children)
}

function img(source) {
    return tag("img").setAttr({ src: source })
}

function btn(label, type = "button") {
    let node = tag("button")
    node.setAttr({ type })
    node.innerText = label
    return node
}

// ========== List ============

function ul(...children) {
    return tag("ul", ...children)
}

function ol(...children) {
    return tag("ol", ...children)
}

function li(...children) {
    return tag("li", ...children)
}

// ========== FORM ============
function form(...children) {
    let node = tag("form", ...children)

    node.setMethod = function (method) { this.setAttr({ method }); return this }
    node.setAction = function (action) { this.setAttr({ action }); return this }
    node.setAutocomplete = function (value) { this.setAttr({ autocomplete: value }); return this }
    node.setEnctype = function (value) { this.setAttr({ enctype: value }); return this }
    node.setTarget = function (value) { this.setAttr({ target: value }); return this }
    node.onSubmit = function (callback) { this.addEventListener("submit", callback); return this }

    return node
}

function input(type = "text") {
    let node = tag("input")
        .setAttr({
            type: type
        })

    node.setValue = function (value) { this.value = value; return this }
    node.setType = function (type) { this.setAttr({ type }); return this }
    node.setName = function (name) { this.setAttr({ name }); return this }
    node.setPlaceholder = function (placeholder) { this.setAttr({ placeholder }); return this }
    node.setPattern = function (pattern) { this.setAttr({ pattern }); return this }
    node.setMin = function (min) { this.setAttr({ min }); return this }
    node.setMax = function (max) { this.setAttr({ max }); return this }
    node.isDisabled = function (disabled = true) { this.disabled = disabled; return this }
    node.isRequired = function (required = true) { this.setAttr({ required }); return this }
    node.onInput = function (callback) { this.addEventListener("input", callback); return this }
    node.onChange = function (callback) { this.addEventListener("change", callback); return this }

    return node
}

function textarea() {
    let node = tag("textarea")

    node.setPlaceholder = function (placeholder) { this.setAttr({ placeholder }); return this }
    node.setValue = function (value) { this.value = value; return this }
    node.setName = function (name) { this.setAttr({ name }); return this }
    node.isDisabled = function (disabled = true) { this.disabled = disabled; return this }
    node.isRequired = function (required = true) { if (required) this.setAttr({ required: true }); return this }

    return node
}

function select(...children) {
    let node = tag("select", ...children)

    node.setName = function (name) { this.setAttr({ name }); return this; }
    node.setValue = function (value) { this.value = value; return this; }
    node.onChange = function (callback) { this.addEventListener("change", callback); return this }
    node.isDisabled = function (disabled = true) { this.disabled = disabled; return this }
    node.isRequired = function (required = true) { if (required) this.setAttr({ required: true }); return this }

    return node
}

function option(label, value, isSelected = false) {
    let node = tag("option", label).setAttr({ value })
    if (isSelected) node.selected = true
    return node;
}

function label(...children) {
    let node = tag("label", ...children);

    node.setTarget = function (targetId) { this.setAttr({ for: targetId }); return this }

    return node;
}

// ========== Table ============

function table(...children) {
    return tag("table", ...children)
}

function thead(...children) {
    return tag("thead", ...children)
}

function tbody(...children) {
    return tag("tbody", ...children)
}

function caption(...children) {
    return tag("caption", ...children)
}

function tr(...children) {
    return tag("tr", ...children)
}

function td(...children) {
    return tag("td", ...children)
}

function th(...children) {
    return tag("th", ...children)
}

// ========== Graphics ============

function canvas(width = 300, height = 150) {
    let node = tag("canvas").setAttr({ width, height })

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
function getById(id) {
    return document.getElementById(id)
}

function getByClass(className) {
    return document.getElementsByClassName(className)
}

function getByTag(tagName) {
    return document.getElementsByTagName(tagName)
}

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

    function renderRoute() {
        const path = window.location.hash.slice(1) || defaultRoute
        const pageFunction = routes[path]

        // Clear container
        rootElement.innerHTML = ''

        if (pageFunction && typeof pageFunction === 'function') {
            const content = pageFunction()
            rootElement.appendChild(content)
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