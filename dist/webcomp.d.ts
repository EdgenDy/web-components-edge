type SignalFunctionCallback<T> = (value: T) => void;
type CSSStyleRulesObject = {
    [index: string]: {
        [index: string]: string;
    };
};
declare class State {
    private name;
    protected value: boolean;
    constructor(name: string, value: boolean);
    getName(): string;
    setValue(value: boolean): void;
    getValue(): boolean;
    isOn(): boolean;
    isOff(): boolean;
    setOn(): void;
    setOff(): void;
}
declare class WebComponentState extends State {
    constructor(name: string, value?: boolean);
}
type TogglingValue = {
    on: any;
    off: any;
};
declare class WebComponentStateTogglingValue extends State {
    private togglingValue;
    constructor(name: string, togglingValue: TogglingValue, value?: boolean);
    getTogglingValue(): TogglingValue;
    getReturnValue(): any;
}
declare class WebComponentProperty {
    private name;
    private value;
    constructor(name: string, value?: any);
    getName(): string;
    setValue(value: any): void;
    getValue(): any;
}
declare class WebComponentCallback {
    name: string;
    value: Function;
    constructor(name: string, value: Function);
    getName(): string;
    getValue(): Function;
    setValue(newValue: Function): void;
}
declare class WebComponentReference {
    private name;
    private value;
    constructor(name: string, value?: HTMLElement);
    getName(): string;
    getValue(): HTMLElement | undefined;
    setValue(value: HTMLElement): void;
}
type WebComponentBindings = WebComponentState | WebComponentProperty | WebComponentCallback | WebComponentStateTogglingValue | WebComponentReference;
type VirtualNodeChildren = VirtualNode | string | WebComponentProperty | WebComponentStateTogglingValue;
type EventListenerCallback = (event: Event) => void;
declare class VirtualNode {
    private node;
    private bindings;
    children?: VirtualNode[];
    protected eventListenerCallbackList?: Map<string, EventListenerCallback>;
    constructor(node: Node);
    setAttributeBinding(attributeName: string, binding: WebComponentBindings): void;
    flatten(component: WebComponentElementConstructor): HTMLElement;
}
type ClassListBindingValue = WebComponentProperty | WebComponentStateTogglingValue;
declare class VirtualElement extends VirtualNode {
    private classListBindingsMap;
    constructor(node: Node);
    addClassListBinding(dataBinding: ClassListBindingValue): void;
    get classListBindings(): Set<ClassListBindingValue>;
    addEventListener(eventName: string, callback: WebComponentCallback): void;
}
type WebComponentDataManagement = WebComponentProperty | WebComponentStateTogglingValue | WebComponentState | WebComponentCallback | WebComponentReference;
type HTMLElementAttributeValue = string | number | boolean | WebComponentDataManagement;
type HTMLElementAttribute = {
    [index: string]: HTMLElementAttributeValue;
};
type DOMBuilder = (attributes: HTMLElementAttribute, ...children: VirtualNodeChildren[]) => VirtualNode;
type DOMBuilderMap = {
    [index: string]: DOMBuilder;
};
type WebComponentConstructorCallback = (templateCallback: (rootNode: VirtualElement) => void, stylesCallback: (rulesObject: CSSStyleRulesObject) => void, lib: {
    dom: DOMBuilderMap;
    component: {
        state: (name: string, value?: boolean, togglingValue?: any) => State;
        property: (name: string, value?: any) => WebComponentProperty;
    };
}) => void;
type WebComponentPropertyValue = string | number | boolean;
type WebComponentPropertiesObject = {
    [index: string]: WebComponentPropertyValue;
};
type WebComponentStatesObject = {
    [index: string]: boolean;
};
export declare class WebComponent {
    private name;
    private options;
    constructor(name: string, callback: WebComponentConstructorCallback);
    register(): void;
    private _getProperty;
    setPropertyValue(name: string, value: any): void;
    setProperties(propertyObject: WebComponentPropertiesObject): void;
    watchProperty(name: string, callback: Function): void;
    private _setStateValue;
    setStateOn(name: string): void;
    setStateOff(name: string): void;
    setStates(stateObject: WebComponentStatesObject): void;
    setCallbackValue(name: string, value: Function): void;
    static create(name: string, callback: WebComponentConstructorCallback): WebComponent;
}
interface WebComponentElementConstructor {
    watchProperty(name: string, callback: SignalFunctionCallback<any>): void;
    watchState(name: string, callback: SignalFunctionCallback<boolean>): void;
}
export {};
//# sourceMappingURL=webcomp.d.ts.map