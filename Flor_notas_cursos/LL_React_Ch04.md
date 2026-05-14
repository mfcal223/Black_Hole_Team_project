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

**React uses a function because it needs to track the change, re-render and update DOM safely.**

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

## Toggling State

In order to be able to toggle the state of a displayed element, you can adjust our code to a `Boolean State`.

Set the initial state as `true`
```jsx
const [status, setStatus] = useState(true);
```

It no longer stores plain text. Now it stores a **Boolean value**.   

To be able to set up a `Conditional Rendering`, you can use a `Ternary Operator`.

```jsx
      <h1> 
        The team is currently {" "}
        {status ? "working" : "on a break"}.
      </h1>
```

As the initial status == true, then at first the UI will display "working".

To set the opposite (!status), you can modify the button.  
Depending of the boolean state of **status**, the text displayed on the button can be toggled too.  


Final version of the code:  
```jsx
<button onClick={() => setStatus(!status)}> 
        {status ? "The team is tired" : "The team is full of energy"}
        </button>
```

```jsx
function App() {
  const [status, setStatus] = useState(true);

  return (
    <div>
      <Header name="BHT" year={new Date().getFullYear()} />
      <Main dishes={dishObjects} />
      <h1> 
        The team is currently {" "}
        {status ? "working" : "on a break"}.
      </h1>
      <button onClick={() => setStatus(!status)}> 
        {status ? "The team is tired" : "The team is full of energy"}
        </button>
    </div>
  );
}
```

> This lesson reinforces a major React principle: `The UI is a reflection of state`. You do NOT manually change HTML. When state changes, React re-renders and the UI automatically reflects the new state.  
> React UI is dynamically generated from state.

---

## Handling state with nested components

State usually belongs in the closest common parent component that needs to control or share it (it should be created in the highest-in-the-DOM-tree common parent component).  
In these examples, the state is created in App() for this reason.  

In the current example, App() is the component that "owns" the state (parent);  Header and Main are its children components/. 

![SS parent-child component tree](/Flor_notas_cursos\pics\State_owner.png)

### How do you communicate parent and child components?
`You pass the component as a prop. `  
Props allow a parent component to send information to a child component.  

Like this, you can pass down values and functions. 

```jsx
/*inside App()*/
<Main dishes={dishObjects} workStatus={status} onStatus={setStatus}/>
/* " I am sending main() the current status value and this function that can change it.*/ 
```

Inside the child component, they are received as props.  
Passing the state-updating function is quite important. This means the child component is able to call it and modify the state.
```jsx
function Main({ dishes, workStatus, onStatus }) {
  return (
    <>
      <div>
        <h2>Welcome to our Home page! {workStatus ? "Working" : "Sleeping"}</h2>
        <button onClick={() => onStatus(true)}>They want to work!</button>
      </div>
[...]
  )
}
```

`So even though the button is inside Main, the state still changes in App.`

If you were to duplicae this state in several child components, that could lead to sync issues.
In this situations is better to keep one ***Single Source of Truth***

This is how the code looks now:  
```jsx
function Main({ dishes, workStatus, onStatus }) {
  return (
    <>
      <div>
        <h2>
        Welcome to our Home page!
        {workStatus ? "We are working" : "We are sleeping"}
        </h2> 
        <button onClick={() => onStatus(true)}>They want to work!</button>
       </div>
      <main> 
          <img 
              src={logo}
              height={200}
              alt="BHT's logo"/>
          <ul> 
            {dishes.map((dish) => (
              <li key={dish.id} style={{ listStyleType: "none"}}>
                {dish.title}</li>
            ))} 
          </ul>
      </main>
    </>
  );
}

console.log(dishObjects);

function App() {
  const [status, setStatus] = useState(true);

  return (
    <div>
      <h1> 
        The team is currently {" "}
        {status ? "working" : "on a break"}.
      </h1>
      <button onClick={() => setStatus(!status)}> 
        {status ? "BUT the team is very tired" : "Now the team is full of energy"}
        </button>
      <Header name="BHT" year={new Date().getFullYear()} />
      <Main dishes={dishObjects} workStatus={status} onStatus={setStatus}/>
    </div>
  );
}
```

---

## Managing state with useReducer

`useReducer` is another React Hook. It is similar to `useState`, but it organizes state changes differently.  

A `reducer` is a function that receives the current state and returns the next state.  

```jsx
//in the headertop of App.jsx file
import { useState,useReducer } from "react";

//then in App()
function App() {
  //const [status, setStatus] = useState(true);
  const [status, toggle_dispatch] = useReducer((status) => !status, true);
  return (
    <div>
      <h1> 
        The team is currently {" "}
        {status ? "working" : "on a break"}.
      </h1>
      <button onClick={toggle_dispatch}> 
        {status ? "BUT the team is very tired" : "Now the team is full of energy"}
        </button>
      <Header name="BHT" year={new Date().getFullYear()} />
      <Main 
        dishes={dishObjects}
        workStatus={status} 
        onStatus={toggle_dispatch}/>
    </div>
  );
}
```

With `useState`, you directly say what the new state should be: 
`setStatus(!status);`  

With useReducer, you move the update logic into a separate function:  
```jsx
(status) => !status
```
Then your button only calls: `toggle_dispatch`  
So the component using the button does not need to know how the state changes.  
Therefore, child components can receive only this: `onStatus={toggle_dispatch}` without needing to know whether the state becomes true, false, or something else.

| useState | useReducer|
|----------|-----------|
|when the state is simple | when state changes have more rules   |
| open / closed | when several actions can modify the same state |
| to count |when state is an object with many fields|
| to input text | when you want update logic in one place|
| true / false ||



---

## Working with the useEffect hook

`useEffect` is used when you want React to perform actions outside of rendering the UI itself. These actions are called `Side Effects` and they can be:  
* print messages to the console (logs)  
* fetch data from an API  
* start animations  
* update the browser title  
* work with timers  
* save data (write to localStorage)  
* subscribe to events

```jsx
//iimport useEffect
import { useEffect,useState,useReducer } from "react";

// example: whenever [status] changes run this function
    useEffect(() => {
      console.log(`The team is ${status ? "working" : "sleeping"}.`)
    }, [status]);
```

useEffect() takes 2 parameteres
```jsx
useEffect(
  callbackFunction,
  dependencyArray
);
```

`callbackFunction` = what shoud be executed. In the example: print a message to the console. 

`dependencyArray` = controls WHEN the effect runs. in the example when [status] change.    
It could be `[]` == when the UI is first rendered.  
It could be after every render if no argument is supplied.
```jsx
useEffect(() => {
  console.log("Hello");
});
```

Some different examples could be:  

> Fetching data  
When the component first loads, fetch data from the server.  

```jsx
useEffect(() => {
  fetchUsers();
}, []);
```

> Updating Browser Title  
Whenever count changes, update the browser tab title.  
```jsx
useEffect(() => {
  document.title = `Users: ${count}`;
}, [count]);
```

> Timers
Start a timer when component loads.
```jsx
useEffect(() => {
  const timer = setInterval(...);

  return () => clearInterval(timer);
}, []);
```