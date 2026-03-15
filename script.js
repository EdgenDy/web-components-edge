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

  function Style(rulesObject) {
    this[styleSheetSymbol] = createStyleSheet();

    if (typeof rulesObject !== "object")
      return;

    for (const selector in rulesObject)
      this.addRule(selector, rulesObject[selector]);
  }

  Style.prototype.addRule = function(cssSelector, cssProperties) {
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

  function VirtualElement(element) {
    this.node = element;
    this.eventListeners = {};
    this.bindings = {};
    this.children = [];
  }

  VirtualElement.prototype = Object.create(VirtualNode.prototype);
  VirtualElement.prototype.constructor = VirtualElement;

  function VirtualTextNode(textNode) {
    this.node = textNode;
  }

  VirtualTextNode.prototype = Object.create(VirtualNode.prototype);
  VirtualTextNode.prototype.constructor = VirtualTextNode;

  function element(tagName, properties, children) {
    const element = ce(tagName);
    const virtualElement = new VirtualElement(element);

    if (typeof properties === "object") {
      if (properties.className !== undefined) {
        element.className = properties.className;
        delete properties.className;
      }
      
      if (properties.id !== undefined) {
        element.id = properties.id;
        delete properties.id;
      }
      
      for (const name in properties) {
        if (name.indexOf("on") == 0) {
          virtualElement.eventListeners[name.toLowerCase()] = properties[name];
          continue;
        }
        element.setAttribute(name, properties[name]);
      }
    }
    
    if (typeof children === "string" || children instanceof DataBinding)
      children = [children];

    if (!Array.isArray(children))
      return virtualElement;

    for (const child of children) {
      if (child instanceof DataBinding) {
        virtualElement.bindings.textContent = child.name;
        if (child.defaultValue)
          virtualElement.children.push(new VirtualTextNode(ct(child.defaultValue)));
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

  const nativeElementSymbol = Symbol("nativeElement");
  const virtualElementSymbol = Symbol("virtualElement");
  const templateBindingsSymbol = Symbol("bindingSymbol");
  function Template(tagName, properties, children) {
    this[templateBindingsSymbol] = [];

    if (tagName instanceof VirtualElement) {
      this[virtualElementSymbol] = tagName;
      console.log(tagName);
      return;
    }

    if (tagName instanceof HTMLElement) {
      this[nativeElementSymbol] = tagName;
      return;
    }

    if (typeof tagName === "object" && !Array.isArray(properties)) {
      properties = tagName;
      tagName = "div";
    }

    const componentElement = element(tagName, properties, children);
    this[nativeElementSymbol] = componentElement;    
  }

  function propertyBinding(element, propertyName, newValue) {
    element[propertyName] = newValue;
  }

  function flatten(virtualNode, nodeClassInstance, templateInstance) {
    const element = virtualNode.node.cloneNode(true);
    if (virtualNode instanceof VirtualTextNode)
      return element;

    if (element.id !== "")
      nodeClassInstance.bindings[element.id] = element;

    for (const bindedName in virtualNode.bindings) {
      const bindPropertyName = virtualNode.bindings[bindedName];
      if (bindedName === "textContent") {
        const signal = new Signal();
        nodeClassInstance.bindings[bindPropertyName] = signal;
        signal.effect(propertyBinding.bind(null, element, "textContent"));
      }
      templateInstance[templateBindingsSymbol].push(bindPropertyName);
    }
    
    for (const child of virtualNode.children) {
      const nativeChildElement = flatten(child, nodeClassInstance, templateInstance);
      element.appendChild(nativeChildElement);

      for (const eventName in child.eventListeners) {
        const func = child.eventListeners[eventName];
        if (typeof func !== "function")
          throw new Error("Event listener callback must be a function");

        nativeChildElement[eventName] = func.bind(nodeClassInstance);
      }
    }
    return element;
  }

  Template.prototype.getNativeElement = function(nodeClassInstance) {
    let nativeElement = null;
    if ((nativeElement = this[nativeElementSymbol]))
      return nativeElement;

    nativeElement = this[nativeElementSymbol] = flatten(this[virtualElementSymbol], nodeClassInstance, this);
    return nativeElement;
  }

  Template.prototype.appendTo = function(node) {
    if (!(node instanceof Node))
      return;
    node.appendChild(this[nativeElementSymbol]);
  }

  const template = (tagName, properties, children) => {
    return new Template(tagName, properties, children);
  }

  const style = (rulesObject) => {
    return new Style(rulesObject);
  }

  const elementFactoryFunction = {};
  "div form input button textarea select option label p h1 h2 h3 h4 h5 h6 section nav footer header main"
    .split(" ")
    .forEach(item => {
      elementFactoryFunction[item] = element.bind(null, item);
    });

  function DataBinding(name, defaultValue) {
    this.name = name;
    this.defaultValue = defaultValue;
  }

  function bind(name, defaultValue) {
    return new DataBinding(name, defaultValue);
  }

  const webComponentCallbackArguments = {
    Template, template, Style, style, 
    dataBinding: { bind },
    elements: elementFactoryFunction
  };

  function createCustomElementClass(template, style) {
    const bindPropertyNames = template[templateBindingsSymbol];
    return class extends HTMLElement {
      // TODO: retrieved all the binded property from the template and put it here
      // Current Problem: getNativeElement must be invoked first before accessing bindPropertyNames
      // BUT this method must be invoked only inside the constructor to save memory footprint
      static observedAttributes = bindPropertyNames;
      constructor() {
        super();
        this.bindings = {};
        this.appendChild(template.getNativeElement(this));
        HTMLElement.observedAttributes = template[templateBindingsSymbol];
      }

      attributeChangedCallback(name, oldValue, newValue) {
        if (this.bindings[name] instanceof Signal) {
          this.bindings[name].set(newValue);
        }
      }
    }
  }

  function WebComponent(name, callback) {
    if (typeof name !== "string")
      throw new Error("Argument 1 must be a type of string and a valid html tag name.");
    if (name.indexOf("-") === -1)
      throw new Error("Tag name must have at least one hypen '-'.");

    const result = callback(webComponentCallbackArguments);
    if (!result || !result.html || !result.css) 
      throw new Error("WebComponent callback must return an object containing an 'html' property with an instance of Template as its value, and a 'css' property with an instance of Style as its value.");

    customElements.define(name, createCustomElementClass(result.html, result.css));
  }

  Object.defineProperty(window, "WebComponent", {
    get: () => WebComponent
  });
})();



const mtButton = new WebComponent("mt-textfield", (lib) => {
  const { template, style } = lib;
  const { div, label, input } = lib.elements;
  const { bind } = lib.dataBinding;
  
  const html = template(
    div({ className: "mt-textfield--container"}, [
      div({ className: "mt-textfield--outline", id: "mtTextfield_Outline"}, [
        div({ className: "mt-textfield--outline-border"}),
        label({ className: "mt-textfield--label-text"}, bind("label")),
        input({ className: "mt-textfield--input", 
          onBlur(event) {
            const target = event.target;
            if (target.value === "")
              target.parentElement.classList.remove("with-content");
            else
              target.parentElement.classList.add("with-content");
          }
        })
      ])
    ])
  );

  const css = style({
    ":root": {
      "--mat-1dp": "1px",
      "--mt-textfield-height": "56px"
    },
    ".mt-textfield--container": {
      display: "inline-flex",
      flexDirection: "column"
    },
    ".mt-textfield--outline": {
      position: "relative",
      height: "var(--mt-textfield-height)",
      display: "flex",
      alignItems: "center",
      padding: "0px 16px",
      gap: "16px"
    },
    ".mt-textfield--outline.leading-icon": {
      paddingLeft: "12px"
    },
    ".mt-textfield--outline.trailing-icon": {
      paddingRight: "12px"
    },
    ".mt-textfield--outline:focus-within": {
      borderWidth: "3px"
    },
    ".mt-textfield--input": {
      border: "none",
      outline: "none",
      zIndex: "2",
      background: "none"
    },
    ".mt-textfield--outline-border": {
      position: "absolute",
      inset: "0",
      border: "1px solid #79747E",
      borderRadius: "2px",
      zIndex: "-1",
      transition: "border-color ease-in-out .1s, border-width ease-in-out .1s"
    },
    ".mt-textfield--outline:focus-within > .mt-textfield--outline-border": {
      borderWidth: "3px",
      borderRadius: "4px",
      borderColor: "#6750A4"
    },
    ".mt-textfield--leading-icon, .mt-textfield--trailing-icon": {
      userSelect: "none"
    },
    ".mt-textfield--trailing-icon": {
      cursor: "pointer"
    },
    ".mt-textfield--input, .mt-textfield--label-text": {
      fontSize: "16px",
      minWidth: "25px"
    },
    ".mt-textfield--leading-icon, .mt-textfield--trailing-icon, .mt-textfield--input, .mt-textfield--label-text": {
      color: "#49454F"
    },
    ".mt-textfield--label-text": {
      display: "inline-block",
      backgroundColor: "white",
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: "1",
      transition: "font-size ease-in-out .15s, transform ease-in-out .15s, top ease-in-out .15s, left ease-in-out .15s, color ease-in-out .15s"
    },
    ".mt-textfield--outline.leading-icon > .mt-textfield--label-text": {
      left: "52px"
    },
    ".mt-textfield--outline:focus-within:not(.width-content) > .mt-textfield--label-text": {
      color: "#6750A4"
    },
    ".mt-textfield--outline.with-content > .mt-textfield--label-text, .mt-textfield--outline:focus-within > .mt-textfield--label-text": {
      top: "0px",
      paddingLeft: "4px",
      paddingRight: "4px",
      left: "12px",
      fontSize: "12px"
    }
  });

  // console.log(html.getNativeElement());
  return {html, css};
});