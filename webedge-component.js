(async function() {
  const ce = document.createElement.bind(document);
  const ct = document.createTextNode.bind(document);

  const htmlHead = document.head;
  const htmlBody = document.body;

  const signalValueSymbol = Symbol("signalValue");
  const taskQueueSymbol = Symbol("taskQueue");
  function Signal(value) {
    this[signalValueSymbol] = value;
    this[taskQueueSymbol] = new Set();
  }

  Signal.prototype.set = function(newValue) {
    this[signalValueSymbol] = newValue;
    for (const callback of this[taskQueueSymbol])
      setTimeout(callback, 0, newValue);
  }

  Signal.prototype.get = function() {
    return this[signalValueSymbol];
  }

  Signal.prototype.effect = function(callback) {
    this[taskQueueSymbol].add(callback);
  }

  Signal.prototype.update = function(callback) {
    setTimeout(() => {
      const newValue = callback(this[signalValueSymbol]);
      this.set(newValue);
    }, 1);
  }

  function checkStyleArgumentTypes(cssSelector, cssProperties) {
    if (typeof cssSelector !== "string")
      throw new Error("CSS selector must be a string.");
    if (typeof cssProperties !== "object" || Array.isArray(cssProperties))
      throw new Error("Css Properties must be an object.");
  }

  function createStyleSheet() {
    const style = ce("style");
    htmlHead.appendChild(style);
    return style.sheet;
  }

  const styleSheetSymbol = Symbol("sheet");
  const styleSheetRuleListSymbol = Symbol("ruleList");

  function StyleSheet(rulesObject) {
    this[styleSheetSymbol] = null;
    this[styleSheetRuleListSymbol] = [];

    if (typeof rulesObject !== "object" || Array.isArray(rulesObject))
      throw new Error("Argument must be a type of object.");

    for (const selector in rulesObject)
      this.addRule(selector, rulesObject[selector]);
  }

  StyleSheet.prototype.attach = function() {
    if (this[styleSheetSymbol] === null)
      this[styleSheetSymbol] = createStyleSheet();

    for (const rule of this[styleSheetRuleListSymbol])
      this.addRule(rule.cssSelector, rule.cssProperties);
  }

  StyleSheet.prototype.addRule = function(cssSelector, cssProperties) {
    if (this[styleSheetSymbol] === null) {
      this[styleSheetRuleListSymbol].push({ cssSelector, cssProperties });
      return;
    }

    checkStyleArgumentTypes(cssSelector, cssProperties);
    const sheet = this[styleSheetSymbol];
    const index = sheet.insertRule(cssSelector + " {}");
    const ruleStyle = sheet.cssRules[index].style;

    for (const name in cssProperties) {
      const value = cssProperties[name];
      if (name.indexOf("--") > -1) {
        ruleStyle.setProperty(name, value);
        continue;
      }
      ruleStyle[name] = value;
    }
  }

  function VirtualNode() {}

  VirtualNode.prototype.flatten = function(template, nodeInstance) {
    const node = this.node.cloneNode(true);

    for (const binding of this.bindings) {
      const signal = new Signal();
      nodeInstance.bindings[binding.name] = signal;
      signal.effect(propertyBinding.bind(null, node, binding.nodePropertyName));
    }

    if (this instanceof VirtualTextNode)
      return node;
    
    if (node.id !== "")
      nodeInstance.bindings[node.id] = node;

    for (const child of this.children) {
      const nativeChildElement = child.flatten(template, nodeInstance);
      node.appendChild(nativeChildElement);

      for (const eventName in child.eventListeners) {
        const func = child.eventListeners[eventName];
        if (typeof func !== "function")
          throw new Error("Event listener callback must be a function");

        nativeChildElement[eventName] = func.bind(nodeInstance);
      }
    }

    return node;
  }

  function VirtualElement(element) {
    this.node = element;
    this.eventListeners = {};
    this.bindings = [];
    this.children = [];
  }

  VirtualElement.prototype = Object.create(VirtualNode.prototype);
  VirtualElement.prototype.constructor = VirtualElement;

  function VirtualTextNode(textNode) {
    this.node = textNode;
    this.bindings = [];
  }

  VirtualTextNode.prototype = Object.create(VirtualNode.prototype);
  VirtualTextNode.prototype.constructor = VirtualTextNode;

  function elementPropertySetter(propertyName, element, value, virtualElement) {
    if (value instanceof DataBinding) {
      virtualElement.bindings.push(new NodePropertyBinding(propertyName, value.name, value.defaultValue || ""));
      return;
    }
    element[propertyName] = value;
  }

  const commonlyUsedPropertyChecker = {
    className: elementPropertySetter.bind(null, "className"),
    id: elementPropertySetter.bind(null, "id"),
    value: elementPropertySetter.bind(null, "value")
  };

  function createVirtualElement(tagName, properties, ...children) {
    const element = ce(tagName);
    const virtualElement = new VirtualElement(element);

    if (typeof properties === "object") {      
      for (const name in properties) {
        const value = properties[name];

        const propertyChecker = commonlyUsedPropertyChecker[name];
        if (propertyChecker) {
          propertyChecker(element, value, virtualElement);
          continue;
        }

        if (name.indexOf("on") == 0) {
          virtualElement.eventListeners[name.toLowerCase()] = properties[name];
          continue;
        }
        element.setAttribute(name, properties[name]);
      }
    }

    for (const child of children) {
      if (child instanceof DataBinding) {
        const virtualTextNode = new VirtualTextNode(ct(child.defaultValue || ""));
        virtualTextNode.bindings.push(new NodePropertyBinding("textContent", child.name, child.defaultValue));
        virtualElement.children.push(virtualTextNode);
        continue;
      }

      if (child instanceof VirtualElement) {
        virtualElement.children.push(child);
        continue;
      }

      if (typeof child === "string") {
        virtualElement.children.push(new VirtualTextNode(ct(child)));
        continue;
      }
    }

    return virtualElement;
  }

  const templateNativeElementSymbol = Symbol("nativeElement");
  const templateRootNodeSymbol = Symbol("virtualElement");
  const templateBindingsSymbol = Symbol("bindingSymbol");

  function Template(virtualNode) {
    if (!(virtualNode instanceof VirtualNode))
      throw new Error("Template argument must be an instance of VirtualNode.");
    
    this[templateBindingsSymbol] = [];
    this[templateRootNodeSymbol] = virtualNode;
  }

  Template.prototype.initialize = function(nodeClassInstance) {
    if (!(nodeClassInstance instanceof HTMLElement))
      throw new Error("Failed to initialize Template, argument must be an instance of HTMLElement.");

    this[templateNativeElementSymbol] = this.getRootNode().flatten(this, nodeClassInstance);
  }

  Template.prototype.getRootNode = function() {
    return this[templateRootNodeSymbol];
  }

  Template.prototype.addBinding = function(name) {
    this[templateBindingsSymbol].push(name);
  }

  function propertyBinding(element, propertyName, newValue) {
    element[propertyName] = newValue;
  }

  Template.prototype.getNativeElement = function(nodeClassInstance) {
    return this[templateNativeElementSymbol];
  }

  Template.prototype.appendTo = function(node) {
    if (!(node instanceof Node))
      return;
    node.appendChild(this[templateNativeElementSymbol]);
  }

  const domBuilderFunctions = {};
  "div form input button textarea select option label p h1 h2 h3 h4 h5 h6 section nav footer header main"
    .split(" ")
    .forEach(item => {
      domBuilderFunctions[item] = createVirtualElement.bind(null, item);
    });

  function DataBinding(name, defaultValue) {
    Object.defineProperties(this, {
      "name": {
        value: name,
        writable: false,
        enumerable: true,
        configurable: false
      },
      "defaultValue": {
        value: defaultValue,
        writable: false,
        enumerable: true,
        configurable: false
      }
    });
  }

  function NodePropertyBinding(nodePropertyName, name, defaultValue) {
    this.name = name;
    this.defaultValue = defaultValue;
    this.nodePropertyName = nodePropertyName;
  }

  NodePropertyBinding.prototype = Object.create(DataBinding.prototype);
  NodePropertyBinding.prototype.constructor = NodePropertyBinding;

  function createCustomElementClass(options) {
    const template = options.htmlTemplate;
    const stylesheet = options.stylesheet;
    const bindingsSymbol = Symbol("bindings");
    
    return class extends HTMLElement {
      static observedAttributes = options.bindingNameList;

      constructor() {
        super();
        this[bindingsSymbol] = {};
        template.initialize(this);
      }

      get bindings() {
        return this[bindingsSymbol];
      }

      connectedCallback() {
        stylesheet.attach();
        this.appendChild(template.getNativeElement());
      }

      attributeChangedCallback(name, _, newValue) {
        if (this.bindings[name] instanceof Signal) {
          this.bindings[name].set(newValue);
        }
      }
    }
  }

  function componentHtmlTemplate(host, template) {
    if (!(template instanceof VirtualNode))
      throw new Error("Component html template must be an instanceof VirtualNode.");
    host.htmlTemplate = new Template(template);
  }

  function componentStylesheet(host, styles) {
    if (typeof styles !== "object" || Array.isArray(styles))
      throw new Error("Component stylesheet must be an object.");
    host.stylesheet = new StyleSheet(styles);
  }

  function bindData(dataType, host, name, defaultValue) {
    if (typeof name !== dataType)
      throw new Error("Binding name must be a string.");
    host.bindingNameList.push(name);
    return new DataBinding(name, defaultValue);
  }

  function WebComponent(name, callback) {
    if (typeof name !== "string")
      throw new Error("Argument 1 must be a type of string and a valid html tag name.");
    if (name.indexOf("-") === -1)
      throw new Error("Tag name must have at least one hypen '-'.");

    const options = { htmlTemplate: null, stylesheet: null, bindingNameList: [] };
    const template = componentHtmlTemplate.bind(null, options);
    const style = componentStylesheet.bind(null, options);
    const bindString = bindData.bind(null, "string", options);
    const bindFunction = bindData.bind(null, "string", options);
    const library = { dataBinder: { bindString, bindFunction }, domBuilder: domBuilderFunctions };
    
    callback(template, style, library);
    
    if (!options.htmlTemplate || !options.stylesheet) 
      throw new Error("WebComponent callback must return an object containing an 'html' property with an instance of Template as its value, and a 'css' property with an instance of Style as its value.");

    customElements.define(name, createCustomElementClass(options));
  }

  function webComponentCreate(name, callback) {
    return new WebComponent(name, callback);
  }

  Object.defineProperty(WebComponent, "create", {
    value: webComponentCreate,
    writable: false,
    enumerable: true,
    configurable: false
  });

  Object.defineProperty(window, "WebComponent", {
    value: WebComponent,
    writable: false,
    enumerable: true,
    configurable: false
  });
})();