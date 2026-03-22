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
      (ruleStyle as any)[name] = value;
    }
  }
}

type CSSStyleRulesObject = { [index: string]: { [index: string]: string } };

function styles(host: WebComponentInitOptions, rulesObject: CSSStyleRulesObject): void {
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

  public constructor(name: string, togglingValue: TogglingValue, value?: boolean) {
    super(name, value || false);
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

// state()
function state(hostOptions: WebComponentInitOptions, name: string | WebComponentState, value?: boolean | TogglingValue, stateValue?: boolean): State {
  if (typeof value === "boolean" || typeof value === "undefined")
    return createSimpleState(hostOptions, name as string, value);

  if (typeof value === "object")
    return createTogglingValueState(hostOptions, name, value, stateValue);

  throw new Error("Invalid arguments.");
}

function createSimpleState(hostOptions: WebComponentInitOptions, name: string, value?: boolean) {
  if (typeof name !== "string")
      throw new Error("Invalid argument, 'name' must be a string.");

  let state = hostOptions.stateMap.get(name as string);
  if (!state) {
    state = new WebComponentState(name as string, value || false);
    hostOptions.stateMap.set(name as string, state);
  }
  return state;
}

function createTogglingValueState(hostOptions: WebComponentInitOptions, name: string | WebComponentState, value: TogglingValue, stateValue?: boolean) {
  let stateName: string;
  if (typeof name === "string")
    stateName = name;
  else if (name instanceof WebComponentState)
    stateName = name.getName();
  else
    throw new Error("Invalid argument, nameOrState argument must be a string or an instance of WebComponentState returned by state().");

  if (!hostOptions.stateMap.get(stateName))
    hostOptions.stateMap.set(stateName, new WebComponentState(stateName, stateValue || false));

  let stateSet = hostOptions.stateWatcherMap.get(stateName);
  if (!stateSet) {
    stateSet = new Set<State>();
    hostOptions.stateWatcherMap.set(stateName, stateSet);
  }
  
  let state = new WebComponentStateTogglingValue(stateName, value as TogglingValue, stateValue);
  stateSet.add(state);
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

function property(hostOptions: WebComponentInitOptions, name: string, value?: any): WebComponentProperty {
  let property = hostOptions.propertyMap.get(name);
  if (!property) {
    property = new WebComponentProperty(name, value);
    hostOptions.propertyMap.set(name, property);
    return property;
  }

  throw new Error("Property, '" + name + "' already exists.");
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

function webComponentCallback(hostOptions: WebComponentInitOptions, name: string, value: Function) {
  const callback = new WebComponentCallback(name, value);
  hostOptions.callbackMap.set(name, callback);
  return callback;
}

class WebComponentReference {
  private name!: string;
  private value: HTMLElement | undefined;

  public constructor(name: string, value?: HTMLElement) {
    this.name = name;
    this.value = value;
  }

  public getName() {
    return this.name;
  }

  public getValue() {
    return this.value;
  }

  public setValue(value: HTMLElement) {
    this.value = value;
  }
}

function reference(hostOptions: WebComponentInitOptions, name: string) {
  const ref = new WebComponentReference(name);
  hostOptions.referenceMap.set(name, ref);
  return ref;
}

type WebComponentBindings = WebComponentState | WebComponentProperty | WebComponentCallback | WebComponentStateTogglingValue | WebComponentReference;
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

  public setAttributeBinding(attributeName: string, binding: WebComponentBindings) {
    this.bindings.set(attributeName, binding);
  }

  public flatten(component: WebComponentElementConstructor): HTMLElement {
    const node = this.node.cloneNode(true);

    bindNodeClassListBindings(component, node, this);
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

function bindNodeClassListBindings(component: WebComponentElementConstructor, node: Node, virtualNode: VirtualNode) {
  if (!(virtualNode instanceof VirtualElement))
    return;

  for (const dataBinding of (virtualNode as VirtualElement).classListBindings) {
    if (dataBinding instanceof WebComponentStateTogglingValue) {
      component.watchState(dataBinding.getName(), nodeClassListStateBinding.bind(null, node as HTMLElement, dataBinding.getTogglingValue()));
      continue;
    }

    if (dataBinding instanceof WebComponentProperty) {
      component.watchProperty(dataBinding.getName(), nodeClassListPropertyBinding.bind(null, node as HTMLElement, dataBinding, { oldValue: null }));
      continue;
    }
  }
}

function nodeClassListStateBinding(node: HTMLElement, togglingValue: TogglingValue, newValue: boolean) {
  const onValue = togglingValue.on;
  const offValue = togglingValue.off;
  
  if (newValue === true) {
    if (offValue)
      node.classList.remove(offValue);
    if (onValue)
      node.classList.add(onValue);
    return;
  }

  if (onValue)
    node.classList.remove(onValue);
  if (offValue)
    node.classList.add(offValue);
}

function nodeClassListPropertyBinding(node: HTMLElement, property: WebComponentProperty, storage: { oldValue: null }, newValue: any) {
  if (!storage.oldValue) {
    node.classList.add(newValue);
    storage.oldValue = newValue;
    return;
  }

  node.classList.remove(storage.oldValue);
  node.classList.add(newValue);
}

function bindComponentWithNodeBindings(component: WebComponentElementConstructor, node: Node, bindings: NodeAttributeBindings) {
  for (const [name, value] of bindings) {
    if (value instanceof WebComponentProperty) {
      const property = value as WebComponentProperty;
      component.watchProperty(property.getName(), componentPropertyBinding.bind(null, node, name));
      const propertyValue = property.getValue();
      if (propertyValue !== undefined && propertyValue !== null)
        (node as any )[name] = propertyValue;
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
      continue;
    }

    if (value instanceof WebComponentCallback) {
      const callback = value as WebComponentCallback;
      (node as any)[name] = callback.getValue().bind(component);
      continue;
    }

    if (value instanceof WebComponentReference) {
      const ref = value as WebComponentReference;
      ref.setValue(node as HTMLElement);
      continue;
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
  if (propertyName === "classList") {
    const onValue = togglingValue.on;
    const offValue = togglingValue.off;

    if (newValue === true) {
      if (offValue)
        node.classList.remove(offValue);
      if (onValue)
      node.classList.add(onValue);
      return;
    }

    if (newValue === false) {
      if (offValue)
        node.classList.add(offValue);
      if (onValue)
      node.classList.remove(onValue);
      return;
    }
  }
  node[propertyName] = newValue === true ? togglingValue.on : togglingValue.off;
}

type ClassListBindingValue = WebComponentProperty | WebComponentStateTogglingValue;

class VirtualElement extends VirtualNode {
  private classListBindingsMap: Set<ClassListBindingValue>;

  public constructor(node: Node) {
    super(node);
    this.children = [];
    this.eventListenerCallbackList = new Map();
    this.classListBindingsMap = new Set();
  }

  public addClassListBinding(dataBinding: ClassListBindingValue) {
    this.classListBindingsMap.add(dataBinding);
  }

  public get classListBindings() {
    return this.classListBindingsMap;
  }

  public addEventListener(eventName: string, callback: WebComponentCallback) {
    // this.eventListenerCallbackList?.set(eventName, callback);
    this.setAttributeBinding(eventName, callback);
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

type WebComponentDataManagement = WebComponentProperty | WebComponentStateTogglingValue | WebComponentState | WebComponentCallback | WebComponentReference;
type HTMLElementAttributeValue = string | number | boolean | WebComponentDataManagement;

type HTMLElementAttributeName = "id" | "className" | "title";

type HTMLElementAttribute = {
  [index: string]: HTMLElementAttributeValue;
};

// createVirtual
function createVirtualElement(tagName: string, attributes: HTMLElementAttribute, ...children: VirtualNodeChildren[]) {
  const node = ce(tagName);
  const virtualElement = new VirtualElement(node);

  for (const attributeName in attributes)
    setElementAttributes(node, attributeName, attributes[attributeName], virtualElement);

  for (const child of children)
    addElementChild(child, virtualElement);

  return virtualElement;
}

function setElementAttributes(element: HTMLElement, attributeName: string, attributeValue: HTMLElementAttributeValue | undefined, virtualElement: VirtualElement) {
  if (attributeName.indexOf("on") === 0) {
    virtualElement.addEventListener(attributeName.toLowerCase(), attributeValue as WebComponentCallback);
    return;
  }
  
  if ("string boolean number".indexOf(typeof attributeValue) > -1) {
    setElementAttributeAsString(element, attributeName, attributeValue as string, virtualElement);
    return;
  }

  if (attributeValue instanceof WebComponentProperty || attributeValue instanceof WebComponentState || attributeValue instanceof WebComponentStateTogglingValue || attributeValue instanceof WebComponentReference) {
    setElementAttributeAsWebComponent(element, attributeName, attributeValue, virtualElement);
    return;
  }

  if (attributeName === "className" && Array.isArray(attributeValue)) {
    setElementClassNameAsArray(element, attributeValue, virtualElement);
    return;
  }

  throw new Error("Invalid value for the attribute '" + attributeName + "'");
}

function setElementAttributeAsString(element: HTMLElement, attributeName: string, attributeValue: string | number | boolean, virtualElement: VirtualElement) {
  if (attributeName === "className") {
    element.className = attributeValue as string;
    return;
  }
  
  if (attributeName === "id")
    virtualElement.setAttributeBinding("id", new WebComponentReference(attributeValue as string, element));
  // element.setAttribute(attributeName, attributeValue);
  (element as any)[attributeName] = attributeValue;
}

function setElementAttributeAsWebComponent(element: HTMLElement, attributeName: string, attributeValue: WebComponentDataManagement, virtualElement: VirtualElement) {
  if (attributeName === "display" && attributeValue instanceof WebComponentState) {
    const state = attributeValue as WebComponentState;
    if (state.isOff())
      element.style.display = "none";
  }
  virtualElement.setAttributeBinding(attributeName, attributeValue);
}

function setElementClassNameAsArray(element: HTMLElement, attributeValue: HTMLElementAttributeValue[], virtualElement: VirtualElement) {
  for (const className of attributeValue) {
    if (typeof className === "string") {
      element.classList.add(className);
      continue;
    }

    if (className instanceof WebComponentStateTogglingValue) {
      // virtualElement.setAttributeBinding("classList", className as WebComponentStateTogglingValue);
      virtualElement.addClassListBinding(className as WebComponentStateTogglingValue);
      let returnedValue = (className as WebComponentStateTogglingValue).getReturnValue();
      if (returnedValue)
        element.classList.add(returnedValue);
      continue;
    }

    if (className instanceof WebComponentProperty)
      virtualElement.setAttributeBinding("classList", className as WebComponentProperty);
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
    virtualTextNode.setAttributeBinding("textContent", child);
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

type WebComponentInitOptions = {
  template: WebComponentTemplate | null;
  styles: StyleSheet | null;

  stateMap: Map<string, State>;
  propertyMap: Map<string, WebComponentProperty>;
  callbackMap: Map<string, WebComponentCallback>;
  referenceMap: Map<string, WebComponentReference>;

  stateWatcherMap: Map<string, Set<State>>;
  propertyWatcherMap: Map<string, Set<WebComponentProperty>>;
  callbackWatcherMap: Map<string, Set<Function>>;
};

function template(host: WebComponentInitOptions, rootNode: VirtualElement): void {
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

type WebComponentPropertyValue = string | number | boolean;
type WebComponentPropertiesObject = { [index: string]: WebComponentPropertyValue };
type WebComponentStatesObject = { [index: string]: boolean };

export class WebComponent {
  private name!: string;
  private options!: WebComponentInitOptions;

  public constructor(name: string, callback: WebComponentConstructorCallback) {
    if (typeof name !== "string")
      throw new Error("Invalid argument, name must be a string.");

    if (typeof callback !== "function")
      throw new Error("Invalid argument, callback must be a function.");

    const options = { 
      template: null, 
      styles: null, 

      stateMap: new Map(), 
      propertyMap: new Map(), 
      callbackMap: new Map(), 
      referenceMap: new Map(),

      stateWatcherMap: new Map(),
      propertyWatcherMap: new Map(),
      callbackWatcherMap: new Map(),
    };

    this.options = options;
    this.name = name;

    const templateCallback = template.bind(null, options);
    const stylesCallback = styles.bind(null, options);

    const lib = { 
      dom: domBuilders,
      component: {
        state: state.bind(null, options),
        property: property.bind(null, options),
        callback: webComponentCallback.bind(null, options),
        reference: reference.bind(null, options)
      }
    };

    callback(templateCallback, stylesCallback, lib);

    if (options.template === null)
      throw new Error("Template cannot be undefined or null.");

    if (options.styles === null)
      throw new Error("Styles cannot be undefined or null.");
  }

  public register() {
    customElements.define(this.name, createCustomElementClass(this.options) as CustomElementConstructor);
  }

  private _getProperty(name: string) {
    const property = this.options.propertyMap.get(name);
    if (!property)
      throw new Error("Property '" + name + "' is undefined.");
    return property;
  }

  public setPropertyValue(name: string, value: any) {
    const property = this._getProperty(name);
    property.setValue(value);
  }

  public setProperties(propertyObject: WebComponentPropertiesObject) {
    for (const property in propertyObject)
      this.setPropertyValue(property, propertyObject[property]);
  }

  public watchProperty(name: string, callback: Function) {
    let list = this.options.callbackWatcherMap.get(name);
    if (!list) {
      list = new Set<Function>();
      this.options.callbackWatcherMap.set(name, list);
    }
    list.add(callback);
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

  public setStates(stateObject: WebComponentStatesObject) {
    for (const state in stateObject)
      this._setStateValue(state, stateObject[state]!);
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

// CustomElement
function createCustomElementClass(hostOptions: WebComponentInitOptions | null): Function {
  let template = hostOptions!.template;
  let styles = hostOptions!.styles;
  let propertyNameList: string[] | null = [...hostOptions!.propertyMap.keys()].map(name => name.toLowerCase());
  
  const elementConstructor = class extends HTMLElement implements WebComponentElementConstructor {
    private propertyMap: Map<string, Signal<any>> = new Map();
    private stateMap: Map<string, Signal<boolean>> = new Map();
    private callbackMap: Map<string, Signal<Function>> = new Map();
    private referenceMap: Map<string, Signal<HTMLElement>> = new Map();

    public static observedAttributes = propertyNameList;

    constructor() {
      super();

      for (const [propertyName, componentProperty] of hostOptions!.propertyMap)
        this.propertyMap.set(propertyName.toLowerCase(), new Signal<any>(componentProperty.getValue()));

      for (const [propertyName, state] of hostOptions!.stateMap)
        this.stateMap.set(propertyName, new Signal<boolean>(state.getValue()));

      for (const [propertyName, callback] of hostOptions!.callbackMap)
        this.callbackMap.set(propertyName, new Signal<Function>(callback.getValue()));

      for (const [propertyName, propertyList] of hostOptions!.callbackWatcherMap) {
        for (const callback of propertyList)
          this.propertyMap.get(propertyName)?.effect(callback.bind(this) as SignalFunctionCallback<any>);
      }

      template!.initialize(this as WebComponentElementConstructor);

      for (const [propertyName, reference] of hostOptions!.referenceMap) {
        this.referenceMap.set(propertyName, new Signal<HTMLElement>(reference.getValue()!));
      }
      
      hostOptions = null;

      styles!.attach();
    }

    connectedCallback() {
      const node = template!.getNativeNode();
      template = null;
      styles = null;
      propertyNameList = null;
      this.appendChild(node as Node);
    }

    private _getPropertySignal(name: string): Signal<any> {
      const property = this.propertyMap.get(name.toLowerCase());
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

    public getPropertyValue(name: string) {
      const property = this._getPropertySignal(name);
      return property.get();
    }

    public updatePropertyValue(name: string, callback: SignalFunctionCallback<any>) {
      const property = this._getPropertySignal(name);
      property.update(callback);
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

    public isStateOn(name: string) {
      const state = this._getStateSignal(name);
      return state.get() === true;
    }

    public isStateOff(name: string) {
      const state = this._getStateSignal(name);
      return state.get() === false;
    }

    public getReference(name: string) {
      const ref = this.referenceMap.get(name);
      if (!ref)
        throw new Error("Reference '" + name + "' is undefined.");
      return ref.get();
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