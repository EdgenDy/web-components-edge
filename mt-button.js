const mtButton = new WebComponent("mt-textfield", (template, style, lib) => {
  const { div, label, input } = lib.domBuilder;
  const { effectFor, signalFor } = lib.dataBinder;

  const textFieldLabel = signalFor("label");
  const textFieldValue = signalFor("value");
  const withContentChecker = effectFor(textFieldValue, (value) => !value ? "" : "with-content");

  function onTextFieldBlur(event) {
    const target = event.target;
    if (target.value === "")
      target.parentElement.classList.remove("with-content");
    else
      target.parentElement.classList.add("with-content");
  }

  template(
    div({ className: "mt-textfield--container"},
      div({ className: ["mt-textfield--outline", withContentChecker], id: "mtTextfield_Outline"},
        div({ className: "mt-textfield--outline-border"}),
        label({ className: "mt-textfield--label-text"}, textFieldLabel),
        input({ className: "mt-textfield--input", value: textFieldValue, onBlur: onTextFieldBlur })
      )
    )
  );

  style({
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
});