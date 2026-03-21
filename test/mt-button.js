const mtButton = new WebComponent("mt-textfield", (template, style, lib) => {
  const { div, label, input } = lib.domBuilder;
  const { effectFor, property, state } = lib.dataBinder;

  const textFieldLabel = property("label");
  const textFieldValue = property("textFieldValue");
  // const withContentChecker = textFieldValue.watch((value) => !value ? "" : "with-content");

  const leadingIcon = property("leadingicon");
  const trailingIcon = property("trailingicon");

  const withTrailingIcon = state("withTrailingIcon");

  function onTextFieldBlur(event) {
    const target = event.target;
    if (target.value === "")
      target.parentElement.classList.remove("with-content");
    else
      target.parentElement.classList.add("with-content");
  }

  

  style({
    ":root": {
      "--mat-1dp": "1px",
      "--mt-textfield-height": "56px"
    },
    "mt-textfield": {
      display: "inline-block",
      padding: "8px"
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
      width: "24px",
      height: "24px",
      userSelect: "none",
      overflow: "hidden"
    },
    ".mt-textfield--trailing-icon": {
      cursor: "pointer"
    },
    ".mt-textfield--input, .mt-textfield--label-text": {
      fontSize: "16px",
      minWidth: "25px",
      fontFamily: "Roboto"
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
      transition: "font-size ease-in-out .15s, top ease-in-out .15s, left ease-in-out .15s, color ease-in-out .15s"
    },
    ".mt-textfield--outline.leading-icon > .mt-textfield--label-text": {
      left: "52px"
    },
    ".mt-textfield--outline:focus-within > .mt-textfield--label-text": {
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

  const withLeadingIcon = state("withLeadingIcon");
  const leadingIconStateChecker = withLeadingIcon.watch({ on: "leading-icon", off: "" });
  // const leadingIconStateChecker = state("withLeadingIcon", false, { on: "leading-icon" });

  template(
    div({ className: "mt-textfield--container"},
      div({ className: ["mt-textfield--outline", leadingIconStateChecker], id: "mtTextfield_Outline"},
        div({ className: "mt-textfield--outline-border"}),
        
        div({ display: withLeadingIcon, className: "mt-textfield--leading-icon material-symbols-rounded"}, "search"),

        label({ className: "mt-textfield--label-text"}, textFieldLabel),
        input({ className: "mt-textfield--input", id: "mt-textfield--input", value: textFieldValue, onBlur: property("blurEventCallback")}),

        div({ display: withTrailingIcon, className: "mt-textfield--trailing-icon material-symbols-rounded", onClick: property("cancelButtonClickCallback") }, "cancel")
      )
    )
  );
});

mtButton.setPropertyValue("blurEventCallback", function(event) {
  console.log("blurEventCallback", this);
  console.log(this.enableState("withTrailingIcon"));
});

mtButton.setPropertyValue("cancelButtonClickCallback", function(event) {
  console.log(this.getProperty("label").set("New Label"));
  console.log(this.getProperty("textFieldValue").set("Hello World!"));
});