# Chapter 4 - Handling State in a React Project

## Destructuring arrays

This is technically a JavaScript concept.  

Normally, when accessing values inside an array, you use positions (indexes).

```jsx
import {createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const animals = ["giraffe", "zebra", "bear"];

console.log(animals[0]);

createRoot(document.getElementById("root")).render(<App />);
```
Output:
```html
giraffe
```
This becomes repetitive and ugly when dealing with many values.  
**JavaScript** introduced **destructuring** to simplify this.  

### Destructuring
`Destructuring` means taking values out of a structure, and placing them directly into variables. The structure can be an object or an array.  


#### Object Destructuring 
You already saw object destructuring earlier:
```jsx
function Header({ name, year }) {
```
This means:
```jsx
const name = props.name;
const year = props.year;
```
React passes ONE props object:
```jsx
{
  name: "BHT",
  year: 2026
}
```
and destructuring extracts the values by key name.

#### Array Destructuring
Arrays do NOT use keys. They use positions.  

```jsx
/*in MAIN.JSX file*/
import {createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const [firstAnimal] = ["giraffe", "zebra", "bear"];

console.log(firstAnimal);

createRoot(document.getElementById("root")).render(<App />);
```

`first` variable gets `first` item

If you wanted to capture the 3rd one, you can even use shorthanded syntax (skips positions):  
```jsx
import {createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const [, ,third] = ["giraffe", "zebra", "bear"];

console.log(third);

createRoot(document.getElementById("root")).render(<App />);
```

> Important: Variable names in array destructuring are arbitrary.  
> `const [x, y, z] = ["giraffe", "zebra", "bear"];` works OK.  
> Names do NOT matter. Only the position matters.  

---

## Understanding the useState hook

`Hooks` are special React functions that add features to components.  
```jsx
/*Add this HOOK at the top of App.jsx*/
import { useState } from "react";
```

`useState` gives a component:
1. a variable that stores data  
2. a function that updates that data.  

When the data changes: React automatically re-renders the component, and the screen updates automatically.  
State means: “This value can change over time, and React should update the UI when it changes.”

```jsx
function App() {
  const [status, setStatus] = useState("having Lunch");

  return (
    <div>
      <h1> The team is currently {status}.</h1>
      <Header name="BHT" year={new Date().getFullYear()} />
      <Main dishes={dishObjects} />
    </div>
  );
}
```

Conceptually what useState() returns is `["having Lunch", someFunction]`
Then destructuring happens:
```jsx
const [status, setStatus] =
  ["having Lunch", someFunction];
```
which becomes:
```html
status     -> "having Lunch"    -> this is the current value
setStatus  -> function          -> Updates the value & tells React to re-render
```

React uses a function because it needs to track the change, re-render and update DOM safely.

`useState("having Lunch")` -> defines the INITIAL state (when it loads for the 1st time).
We can add a button to change that initial state.
```jsx
      <button onClick={() => setStatus("Working")}> 
        Make them work</button>
```

The state will change if the button is clicked.

This is how the function looks now:  
```jsx
function App() {
  const [status, setStatus] = useState("having Lunch");

  return (
    <div>
      <h1> The team is currently {status}.</h1>
      <button onClick={() => setStatus("Working")}> 
        Make them work</button>
      <Header name="BHT" year={new Date().getFullYear()} />
      <Main dishes={dishObjects} />
    </div>
  );
}
```

--- 

Why This Matters So Much in React

This syntax becomes EXTREMELY important with `Hooks`.

Soon you will see:

const [count, setCount] = useState(0);

This confuses almost every beginner at first.

But now you can understand it.

What useState() Actually Returns

useState() returns an ARRAY.

Something conceptually like:

[0, someFunction]

Then destructuring happens:

const [count, setCount] = useState(0);

which means:

count      -> 0
setCount   -> function

React is heavily built around this pattern.

---