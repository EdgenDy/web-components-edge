# Web Component Edge

## What it is?

This project is not a new JavaScript Framework, it is just a small library for building web components without relying on frameworks such as React, Angular and Vue. This project aims to simplify the utilization of native web components without creation of html and css inside a string.

It has promise-like approach where you have to put a callback on `WebComponent` constructor and will give you three arguments `template` function, `styles` function and `lib` object. The supplied function will be the closure of the **template** (html) and **styles** (css), template and styles must be defined inside this function.

Template can be created using DOM builder functions that corresponds to each HTML element's name.

Styles can be created using an object notation where keys are all css selectors and an object as its value (CSS Rule).

All callbacks will be separated from the **template** it is needed to go through **Data Binding** and must be supplied later on the instance of the `WebComponent` constructor.

The following is the sample code for creating a counter component.

```js
import { WebComponent } from "../minified/webcomp.min.js";

const counter = new WebComponent("demo-counter", (template, styles, lib) => {
      const { div, p, button } = lib.dom;
      const { property, callback } = lib.component;

      template(
        div({ className: "counter-container" },
          p({ className: "counter-value" }, "Count: ", property("count", 0)),
          div({ className: "counter-buttons" },
            button({ className: "counter-button", onClick: callback("btnDecrease") }, "Decrease (-)"),
            button({ className: "counter-button", onClick: callback("btnIncrease") }, "Increase (+)")
          )
        )
      );

      styles({
        ".counter-container": {
          display: "flex",
          flexDirection: "column"
        },
        ".counter-buttons": {
          display: "flex",
          padding: "8px",
          gap: "8px"
        },
        ".counter-button": {
          flexGrow: "1",
          height: "40px"
        },
        ".counter-value": {
          fontFamily: "Consolas, monospace",
        }
      });
    });

    counter.setCallbackValue("btnDecrease", function() {
      this.updatePropertyValue("count", (value) => {
        return --value;
      });
    });

    counter.setCallbackValue("btnIncrease", function() {
      this.updatePropertyValue("count", (value) => {
        return ++value;
      });
    });

    counter.setPropertyValue("count", 0);

    counter.register();
```

You can test and check the actual source code in the `test` folder.

## What is it actually for?

Custom components can be shipped its structure (html), style (css) and functionality on a single JavaScript file without packaging with the main library file. Just import the main library and you can import more and more component online and will only render once the library is loaded, while in html you only have to use the custom html tag.

## Is it a little bit more complicated?

Is it a little bit more complicated from other frameworks? Yes, compare with other Frontend frameworks, but this one doesn't need to be compiled, built and parsed, this one will run immediately once you use the custom html tag of the component. All operations must be done with JavaScript, the component will not rely on shadow dom instead it will be affected by the global css.

## Is it Reactive?

Yes, this library uses the power of `Signals` to update every part of the DOM.

## Does it has Virtual DOM?

No and Yes, if you think the Virtual DOM of the React the answer is no, but it has own implementation of Virtual DOM. This library creates a VirtualElement in every `Node` created by **DOM builder functions** and will be wrapped in a `WebComponentTemplate`. This template will only be used whenever a new instance of the component will be created and will not be used for comparing the states and content every changes in the DOM.

## Does it supports States?

Yes, and it supports state watcher where you can indicate which value will be return by the state based on its value (true or false). In this library `state` is only used for boolean values where it has only two state which is `on` and `off`.

```js
const isShowing = state("isShowing");
const contentIfShowing = state(isShowing, {
  on: "Div is showing"
});

template(
  div({ display: isShowing }, contentIfShowing)
);
```

## Does custom html tag supports custom properties?

Yes, by using the `property` function. All properties created by this function will automatically be observed by the custom element and will reflect the value on the parts of the component where it will be used.

```js
template(
  div({ className: "container" }, property("content"))
);
```

```html
<demo-component content="Hello World!"></demo-component>
```

The value of the attribute `content` from the html will be the content of the `div` element of the component.

## Does it support Event Listener Callbacks?

Yes, by using the `callback` function. But this is so much different from Frontend Frameworks because Event Callbacks is not included inside the closure of template and style, you do not need to create your callback inside the function you supplied in `WebComponent` constructor.

Callbacks can only be registered on the instance of the `WebComponent`.

```js
const component = new WebComponent("demo-comp", (template, styles, lib) => {

  const { div, button, p } = lib.dom;
  const { callback, property } = lib.component;

  template(
    div({ className: "container" },
      p({ className: "message" }, property("content")),
      button({ onClick: callback("btn-click") }, "Click Me!")
    )
  );

  styles({
    ....
  });
});
```

and the registration of the callback is outside of that closure.

```js
component.setCallbackValue("btn-click", function(event) {
  this.setPropertyValue("content", "Hello World!");
});

component.register();
```

## Is it in ES6?

Yes, and you can only use this library using ES6 `import` statement.

```js
import { WebComponent } from "./dist/webcomp.js";
```