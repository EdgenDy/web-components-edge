const signalValueSymbol = Symbol("value");
const signalTaskQueue = Symbol("taskQueue");

type SignalFunctionCallback<T> = (value: T) => void;
type SignalUpdateCallback<T> = (value: T) => T;

class Signal<T> {
  private [signalValueSymbol]!: T;
  private [signalTaskQueue]!:  Set<SignalFunctionCallback<T>>;

  public constructor(value: T) {
    this[signalValueSymbol] = value;
    this[signalTaskQueue] = new Set();
  }

  public set(newValue: T) {
    this[signalValueSymbol] = newValue;
    for (const callback of this[signalTaskQueue])
      setTimeout(callback, 0, newValue);
  }

  public get(): T {
    return this[signalValueSymbol];
  }

  public effect(callback: SignalFunctionCallback<T>) {
    this[signalTaskQueue].add(callback);
  }

  public update(callback: SignalUpdateCallback<T>) {
    setTimeout(() => {
      const newValue = callback(this[signalValueSymbol]);
      this.set(newValue);
    }, 1);
  }
}

const ce = document.createElement.bind(document);
const ct = document.createTextNode.bind(document);
const cc = document.createComment.bind(document);

function createStyleSheet(): CSSStyleSheet | null {
  const style = ce("style");
  document.head.appendChild(style);
  return style.sheet;
}

type CSSRuleObject = { [index: string]: string };
type CSSRulesObject = { [index: string]: CSSRuleObject };

class StyleSheet {
  private styleSheet: CSSStyleSheet | undefined;
  private ruleList!: { cssSelector: string, cssProperties: CSSRuleObject }[];

  public constructor(rulesObject: CSSRulesObject) {
    this.ruleList = [];
    for (const selector in rulesObject) {
      this.addRule(selector, rulesObject[selector]!);
    }
  }

  public attach(): void {
    if (this.styleSheet !== undefined)
      return;

    this.styleSheet = createStyleSheet()!;
    for (const rule of this.ruleList)
      this.addRule(rule.cssSelector, rule.cssProperties);
  }

  public addRule(cssSelector: string, cssProperties: CSSRuleObject) {
    if (this.styleSheet === undefined) {
      this.ruleList.push({ cssSelector, cssProperties });
      return;
    }

    const sheet = this.styleSheet;
    const index = sheet.insertRule(cssSelector + " {}");
    const ruleStyle = (sheet.cssRules[index] as CSSStyleRule).style;

    for (const name in cssProperties) {
      const value = cssProperties[name]!;
      if (name.indexOf("--") > -1) {
        ruleStyle.setProperty(name, value);
        continue;
      }
      ruleStyle.setProperty(name, value);
    }
  }
}

type CSSStyleRulesObject = { [index: string]: { [index: string]: string } };

function styles(host: WebComponentInitializationOptions, rulesObject: CSSStyleRulesObject): void {
  if (typeof rulesObject !== "object" || Array.isArray(rulesObject))
    throw new Error("Invalid argument, rulesObject must be an object containing css rules.");
  host.styles = new StyleSheet(rulesObject);
}

class State {
  private name!: string;
  protected value!: boolean;

  public constructor(name: string, value: boolean) {
    this.name = name;
    this.value = value;
  }

  public getName() {
    return this.name;
  }

  public setValue(value: boolean) {
    this.value = value;
  }

  public getValue() {
    return this.value;
  }

  public isOn() {
    return this.value === true;
  }

  public isOff() {
    return this.value === false;
  }

  public setOn() {
    this.value = true;
  }

  public setOff() {
    this.value = false;
  }
}

class WebComponentState extends State {
  public constructor(name: string, value?: boolean) {
    super(name, value ?? false);
  }
}

type TogglingValue = { on: any, off: any };

class WebComponentStateTogglingValue extends State {
  private togglingValue!: TogglingValue;

  public constructor(name: string, value: any, togglingValue: TogglingValue) {
    super(name, value);
    this.togglingValue = togglingValue;
  }

  public getTogglingValue() {
    return this.togglingValue;
  }

  public getReturnValue() {
    if (this.value)
      return this.togglingValue.on;
    else
      return this.togglingValue.off;
  }
}

function state(hostOptions: WebComponentInitializationOptions, name: string, value?: boolean, togglingValue?: any): State {
  let state = togglingValue !== undefined ? 
    new WebComponentStateTogglingValue(name, value, togglingValue) : 
    new WebComponentState(name, value);

  hostOptions.stateMap.set(name, state);
  return state;
}

class WebComponentProperty {
  private name!: string;
  private value: any;

  public constructor(name: string, value?: any) {
    this.name = name;
    this.value = value;
  }

  public getName() {
    return this.name.toLowerCase();
  }

  public setValue(value: any) {
    this.value = value;
  }

  public getValue(): any {
    return this.value;
  }
}

function property(hostOptions: WebComponentInitializationOptions, name: string, value?: any): WebComponentProperty {
  let property = new WebComponentProperty(name, value);
  hostOptions.propertyMap.set(name, property);
  return property;
}

class WebComponentCallback {
  name!: string;
  value!: Function;

  public constructor(name: string, value: Function) {
    this.name = name;
    this.value = value;
  }

  public getName() {
    return this.name;
  }

  public getValue(): Function {
    return this.value;
  }

  public setValue(newValue: Function) {
    this.value = newValue;
  }
}

function weComponentCallback(hostOptions: WebComponentInitializationOptions, name: string, value: Function) {
  const callback = new WebComponentCallback(name, value);
  hostOptions.callbackMap.set(name, callback);
  return callback;
}

type WebComponentBindings = WebComponentState | WebComponentProperty | WebComponentCallback | WebComponentStateTogglingValue;
type NodeAttributeBindings = Map<string, WebComponentBindings>;
type VirtualNodeChildren = VirtualNode | string | WebComponentProperty | WebComponentStateTogglingValue;

type EventListenerCallback = (event: Event) => void;

class VirtualNode {
  private node!: Node;
  private bindings!: NodeAttributeBindings;
  public children?: VirtualNode[];
  protected eventListenerCallbackList?: Map<string, EventListenerCallback>;

  public constructor(node: Node) {
    this.node = node;
    this.bindings = new Map();
  }

  public addBinding(attributeName: string, binding: WebComponentBindings) {
    this.bindings.set(attributeName, binding);
  }

  public setAttributeBinding(attributeName: string, binding: WebComponentBindings) {
    this.bindings.set(attributeName, binding);
  }

  public flatten(component: WebComponentElementConstructor): HTMLElement {
    const node = this.node.cloneNode(true);

    bindComponentWithNodeBindings(component, node, this.bindings);
    
    if (this instanceof VirtualTextNode)
      return node as HTMLElement;
    
    for (const child of this.children ?? []) {
      const childNode = child.flatten(component);
      node.appendChild(childNode);
    }

    return node as HTMLElement;
  }
}

function bindComponentWithNodeBindings(component: WebComponentElementConstructor, node: Node, bindings: NodeAttributeBindings) {
  for (const [name, value] of bindings) {
    if (value instanceof WebComponentProperty) {
      const property = value as WebComponentProperty;
      component.watchProperty(property.getName(), componentPropertyBinding.bind(null, node, name));
      continue;
    }
    
    if (value instanceof WebComponentState) {
      const state = value as WebComponentState;
      component.watchState(state.getName(), componentStateBinding.bind(null, node, name));
      continue;
    }

    if (value instanceof WebComponentStateTogglingValue) {
      const state = value as WebComponentStateTogglingValue;
      component.watchState(state.getName(), componentStateTogglingValueBinding.bind(null, node, name, state.getTogglingValue()));
    }

    if (value instanceof WebComponentCallback) {
      const callback = value as WebComponentCallback;
      (node as any)[name] = callback.getValue().bind(component);
    }
  }
}

function componentPropertyBinding(node: any, propertyName: string, newValue: any) {
  node[propertyName] = newValue;
}

function componentStateBinding(node: any, propertyName: string, newValue: boolean) {
  if (propertyName === "display") {
    node.style.display = (newValue === true) ? "" : "none";
    return;
  }
  node[propertyName] = newValue;
}

function componentStateTogglingValueBinding(node: any, propertyName: string, togglingValue: TogglingValue, newValue: boolean) {
  console.log(propertyName);
  if (propertyName === "classList") {
    const onValue = togglingValue.on;
    const offValue = togglingValue.off;
    node.classList.remove(newValue === true ? offValue : onValue);
    node.classList.add(newValue === true ? onValue : offValue);
    return;
  }
  node[propertyName] = newValue === true ? togglingValue.on : togglingValue.off;
}

class VirtualElement extends VirtualNode {
  public constructor(node: Node) {
    super(node);
    this.children = [];
    this.eventListenerCallbackList = new Map();
  }

  public addEventListener(eventName: string, callback: WebComponentCallback) {
    // this.eventListenerCallbackList?.set(eventName, callback);
    this.addBinding(eventName, callback);
  }
}

class VirtualTextNode extends VirtualNode {
  public constructor(node: Node) {
    super(node);
  }
}

class WebComponentTemplate {
  private rootNode!: VirtualElement;
  private nativeNode?: HTMLElement;

  public constructor(rootNode: VirtualElement) {
    this.rootNode = rootNode;
  }

  public initialize(node: WebComponentElementConstructor) {
    this.nativeNode = this.rootNode.flatten(node);
  }

  public getRootNode(): VirtualElement {
    return this.rootNode;
  }

  public getNativeNode(): HTMLElement | undefined {
    return this.nativeNode;
  }
}

type WebComponentDataManagement = WebComponentProperty | WebComponentStateTogglingValue | WebComponentState | WebComponentCallback;
type HTMLElementAttributeValue = string | WebComponentDataManagement;

type HTMLElementAttributeName = "id" | "className" | "title";

type HTMLElementAttribute = {
  [index: string]: HTMLElementAttributeValue;
};

function createVirtualElement(tagName: string, attributes: HTMLElementAttribute, ...children: VirtualNodeChildren[]) {
  const node = ce(tagName);
  const virtualElement = new VirtualElement(node);

  for (const attributeName in attributes)
    setElementAttributes(node, attributeName, attributes[attributeName], virtualElement);

  for (const child of children)
    addElementChild(child, virtualElement);

  return virtualElement;
}

function setElementAttributes(element: HTMLElement, attributeName: string, attributeValue: HTMLElementAttributeValue | EventListenerCallback | undefined, virtualElement: VirtualElement) {
  if (attributeName.indexOf("on") === 0) {
    virtualElement.addEventListener(attributeName.toLowerCase(), attributeValue as WebComponentCallback);
    return;
  }

  if (typeof attributeValue === "string") {
    setElementAttributeAsString(element, attributeName, attributeValue, virtualElement);
    return;
  }

  if (attributeValue instanceof WebComponentProperty || attributeValue instanceof WebComponentState || attributeValue instanceof WebComponentStateTogglingValue) {
    setElementAttributeAsWebComponent(element, attributeName, attributeValue, virtualElement);
    return;
  }

  if (attributeName === "className" && Array.isArray(attributeValue)) {
    setElementClassNameAsArray(element, attributeValue, virtualElement);
    return;
  }

  throw new Error("Invalid value for the attribute '" + attributeName + "'");
}

function setElementAttributeAsString(element: HTMLElement, attributeName: string, attributeValue: string, virtualElement: VirtualElement) {
  if (attributeName === "className") {
    element.className = attributeValue;
    return;
  }
  element.setAttribute(attributeName, attributeValue);
}

function setElementAttributeAsWebComponent(element: HTMLElement, attributeName: string, attributeValue: WebComponentDataManagement, virtualElement: VirtualElement) {
  if (attributeName === "display" && attributeValue instanceof WebComponentState) {
    const state = attributeValue as WebComponentState;
    if (state.isOff())
      element.style.display = "none";
  }
  virtualElement.addBinding(attributeName, attributeValue);
}

function setElementClassNameAsArray(element: HTMLElement, attributeValue: HTMLElementAttributeValue[], virtualElement: VirtualElement) {
  for (const className of attributeValue) {
    if (typeof className === "string") {
      element.classList.add(className);
      continue;
    }

    if (className instanceof WebComponentStateTogglingValue) {
      virtualElement.addBinding("classList", className as WebComponentStateTogglingValue);
      element.classList.add((className as WebComponentStateTogglingValue).getReturnValue());
      continue;
    }

    if (className instanceof WebComponentProperty)
      virtualElement.addBinding("classList", className as WebComponentProperty);
  }
}

function addElementChild(child: VirtualNodeChildren, virtualElement: VirtualElement) {
  if (child instanceof VirtualNode) {
    virtualElement?.children?.push(child);
    return;
  }

  if (typeof child === "string") {
    const virtualTextNode = new VirtualTextNode(ct(child || ""));
    virtualElement?.children?.push(virtualTextNode);
    return;
  }

  if (child instanceof WebComponentProperty || child instanceof WebComponentStateTogglingValue) {
    const virtualTextNode = new VirtualTextNode(ct(""));
    virtualElement?.children?.push(virtualTextNode);
    virtualTextNode.addBinding("textContent", child);
    return;
  }
}

type DOMBuilder = (attributes: HTMLElementAttribute, ...children: VirtualNodeChildren[]) => VirtualNode;
type DOMBuilderMap = { [index: string]: DOMBuilder };

const domBuilders: DOMBuilderMap = {};

"div p h1 h2 h3 h4 h5 h6 span form input label button textarea select option"
  .split(" ")
  .forEach((item) => {
    domBuilders[item] = createVirtualElement.bind(null, item);
  });

type WebComponentInitializationOptions = {
  template: WebComponentTemplate | null,
  styles: StyleSheet | null,
  stateMap: Map<string, State>,
  propertyMap: Map<string, WebComponentProperty>,
  callbackMap: Map<string, WebComponentCallback>
};

function template(host: WebComponentInitializationOptions, rootNode: VirtualElement): void {
  if (!(rootNode instanceof VirtualElement))
    throw new Error("Invalid argument, rootNode must be an instance of VirtualElement.");
  host.template = new WebComponentTemplate(rootNode);
}

type WebComponentConstructorCallback = (
  templateCallback: (rootNode: VirtualElement) => void, 
  stylesCallback: (rulesObject: CSSStyleRulesObject) => void,
  lib: {
    dom: DOMBuilderMap,
    component: {
      state: (name: string, value?: boolean, togglingValue?: any) => State,
      property: (name: string, value?: any) => WebComponentProperty
    }
  }
) => void;

export class WebComponent {
  private name!: string;
  private options!: WebComponentInitializationOptions;

  public constructor(name: string, callback: WebComponentConstructorCallback) {
    if (typeof name !== "string")
      throw new Error("Invalid argument, name must be a string.");

    if (typeof callback !== "function")
      throw new Error("Invalid argument, callback must be a function.");

    const options = { template: null, styles: null, stateMap: new Map(), propertyMap: new Map(), callbackMap: new Map() };
    this.options = options;
    this.name = name;

    const templateCallback = template.bind(null, options);
    const stylesCallback = styles.bind(null, options);

    const lib = { 
      dom: domBuilders,
      component: {
        state: state.bind(null, options),
        property: property.bind(null, options),
        callback: weComponentCallback.bind(null, options)
      }
    };

    callback(templateCallback, stylesCallback, lib);

    if (template === null)
      throw new Error("Template cannot be undefined or null.");

    if (styles === null)
      throw new Error("Styles cannot be undefiend or null.");
  }

  public register() {
    customElements.define(this.name, createCustomElementClass(this.options) as CustomElementConstructor);
  }

  public setPropertyValue(name: string, value: any) {
    const property = this.options.propertyMap.get(name);
    if (!property)
      throw new Error("Property '" + name + "' is undefined.");
    property.setValue(value);
  }

  private _setStateValue(name: string, value: boolean) {
    const state = this.options.stateMap.get(name);
    if (!state)
      throw new Error("State '" + name + "' is undefined.");
    state.setValue(value);
  }

  public setStateOn(name: string) {
    this._setStateValue(name, true);
  }

  public setStateOff(name: string) {
    this._setStateValue(name, false);
  }

  public setCallbackValue(name: string, value: Function) {
    const callback = this.options.callbackMap.get(name);
    if (!callback)
      throw new Error("Callback '" + name + "' is undefined.");
    callback.setValue(value);
  }

  static create(name: string, callback: WebComponentConstructorCallback): WebComponent {
    return new WebComponent(name, callback);
  }
}

interface WebComponentElementConstructor {
  watchProperty(name: string, callback: SignalFunctionCallback<any>): void;
  watchState(name: string, callback: SignalFunctionCallback<boolean>): void;
}

function createCustomElementClass(hostOptions: WebComponentInitializationOptions): Function {
  const template = hostOptions.template;
  const styles = hostOptions.styles;

  const propertyNameList = [...hostOptions.propertyMap.keys()].map(name => name.toLowerCase());
  
  const elementConstructor = class extends HTMLElement implements WebComponentElementConstructor {
    private propertyMap: Map<string, Signal<any>> = new Map();
    private stateMap: Map<string, Signal<boolean>> = new Map();
    private callbackMap: Map<string, Signal<Function>> = new Map();

    public static observedAttributes = propertyNameList;

    constructor() {
      super();

      for (const [propertyName, componentProperty] of hostOptions.propertyMap)
        this.propertyMap.set(propertyName.toLowerCase(), new Signal<any>(componentProperty.getValue()));

      for (const [propertyName, state] of hostOptions.stateMap)
        this.stateMap.set(propertyName, new Signal<boolean>(state.getValue()));

      for (const [propertyName, callback] of hostOptions.callbackMap)
        this.callbackMap.set(propertyName, new Signal<Function>(callback.getValue()));

      template!.initialize(this as WebComponentElementConstructor);
      styles!.attach();
    }

    connectedCallback() {
      const node = template!.getNativeNode();
      setTimeout(() => {
        console.log(node);
      }, 500);
      this.appendChild(node as Node);
    }

    private _getPropertySignal(name: string): Signal<any> {
      const property = this.propertyMap.get(name);
      if (!property)
        throw new Error("Property '" + name + "' is not defined.");
      return property;
    }

    public watchProperty(name: string, callback: SignalFunctionCallback<any>) {
      const property = this._getPropertySignal(name);
      property.effect(callback);
    }

    public setPropertyValue(name: string, value: string) {
      const property = this._getPropertySignal(name);
      property.set(value);
    }

    public _getStateSignal(name: string): Signal<boolean> {
      const state = this.stateMap.get(name);
      if (!state)
        throw new Error("State '" + name + "' is not defined.");
      return state;
    }

    public watchState(name: string, callback: SignalFunctionCallback<boolean>) {
      const state = this._getStateSignal(name);
      state.effect(callback);
    }

    public setStateOn(name: string) {
      const state = this._getStateSignal(name);
      state.set(true);
    }

    public setStateOff(name: string) {
      const state = this._getStateSignal(name);
      state.set(false);
    }

    public attributeChangedCallback(name: string, oldValue: string, newValue: string) {
      const property = this.propertyMap.get(name);
      if (property) {
        property.set(newValue);
        return;
      }
      console.warn("Attribute '" + name + "' is not registered.");
    }
  }

  return elementConstructor;
}