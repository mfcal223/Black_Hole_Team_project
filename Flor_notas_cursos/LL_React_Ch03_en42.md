# Chapter 03

## Working with list

### Make a Non dynamic list

```jsx
import "./App.css";

function Header({ name, year }) {
  return (
    <header>
      <h1>{name}'s Kitchen</h1>
      <p>Copyright {year}</p>
    </header>
  );
}

function Main() {
  return (
    <ul>
      <li> Working Hard</li>
      <li> Innovating always </li>
      <li> Keep Walking</li>
    </ul>
    );
}

function App() {
  return (
    <div>
      <Header name="BHT" year={new Date().getFullYear()} />
      <Main />

    </div>
  );
}

export default App;
```

### Make a Dynamic List

```jsx
const items = [
  "Working Hard",
  "Innovating always",
  "Keep Walking"
];

function Main({ dishes }) {
  return (
  <ul> 
    {dishes.map((dish) => (
      <li>{dish}</li>
    ))} 
    </ul>
  );
}

function App() {
  return (
    <div>
      <Header name="BHT" year={new Date().getFullYear()} />
      <Main dishes={items} />

    </div>
  );
}
```

---

#### Format the list

* remove bullets

By using `<li style={{ listStyleType: "none"}}>`

```jsx
function Main({ dishes }) {
  return (
  <ul> 
    {dishes.map((dish) => (
      <li style={{ listStyleType: "none"}}>{dish}</li>
    ))} 
    </ul>
  );
}
```

---

### Rendering errors
If you inspect the website now, you'll see an ERROR message

```bash
Each child in a list should have a unique "key" prop.

Check the render method of `Main`. See https://react.dev/link/warning-keys for more information. Component Stack: 
    Main App.jsx:20
    div unknown:0
    App unknown:0
```
In React, each element in an array or iterator should have a unique key property to help React identify which items have changed, are added, or are removed.
A `key` is like an ID that help you keep everything in sync.

The 1st way to solve this error is by adding a variable (`i`) that will act as a key.

```jsx
function Main({ dishes }) {
  return (
  <ul> 
    {dishes.map((dish, i) => (
      <li key={i} style={{ listStyleType: "none"}}>{dish}</li>
    ))} 
    </ul>
  );
}
```

If you refresh the website, and check the Console again, the "key" error will disappear.

But the React documentation actually disapproves this method, as the consider there can still be rendering problems.

Instead we can take each of the items in the list and map them to this `i` value:
* create a value called `dishObjects` = our map.  
* `dishObjects` will be = to items.map(),  that will receive (dish, i) as parameters.  
* For every dish and i, it will return an object on the list.  
* Inside dishObjects there are 2 values: `id` (which is whatever `i` is), and `title` (which is whatever `dish` is, = an element on the list items).  


```jsx

const items = [
  "Working Hard",
  "Innovating always",
  "Keep Walking"
];

const dishObjects = items.map((dish, i) => ({
  id: i,
  title: dish
}));

function Main({ dishes }) {
  return (
  <ul> 
    {dishes.map((dish, i) => (
      <li key={i} style={{ listStyleType: "none"}}>{dish}</li>
    ))} 
    </ul>
  );
}


```

If you add a line to obtain ***console logs*** on the website console:
```jsx
console.log(dishObjects);
```
you will see this:

```c
Array(3) [ {…}, {…}, {…} ]
0: Object { id: 0, title: "Work Smart" }
1: Object { id: 1, title: "Innovate Always" }
2: Object { id: 2, title: "Keep Walking" }
length: 3
```
> Creating a list of objects with unique IDs ensures keys are stable and helps React efficiently re-render the list items.  

`dishObjects` can now be pass as part of property Main, inside `App()`, and it also needs the correct property referencing. 
```jsx
function Main({ dishes }) {
  return (
  <ul> 
    {dishes.map((dish) => (
      <li key={dish.id} style={{ listStyleType: "none"}}>
        {dish.title}</li>
    ))} 
    </ul>
  );
}
/* variable "i" disappears, and is change by the values inside dishObjects [dish.id].
Something similar is change for dish, that transforms into [dish.title]*/

function App() {
  return (
    <div>
      <Header name="BHT" year={new Date().getFullYear()} />
      <Main dishes={dishObjects} />
    </div>
  );
}
/*NOW --> dishes = dishObjects */
```

---

## Add an Image

1. Create a new directory inside the react-project called "images".  
2. Paste an image inside. For example `logo.png`
3. import the image in the App.jsx file.
```jsx
import logo from "./images/BHT_logo.png";
```
4. Inside Main(), wrap the lines inside <ul></ul> in another tag called <main></main>.
5. Inside <main></main>, but before <ul>, insert the image, define the height and provide and alternative text in case a person uses a screen reader.
```jsx
function Main({ dishes }) {
  return (
    <main> 
        <img 
            /*src="https://github.com/mfcal223.png"*/
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
  );
}
```

> Remember ***numbers*** MUST be wrapped inside `{}`

> If you use the URL of your github account and add ".png" at the end, it will render your github avatar.

---

## Using fragments

In React, a component must return ONE parent element.  

This works:
```jsx
return (
  <div>
    <h1>Hello</h1>
    <p>Welcome</p>
  </div>
);
```
But this does NOT work:
```jsx
return (
  <h1>Hello</h1>
  <p>Welcome</p>
);
```
because React sees:
```jsx
one <h1>
one <p>
```
at the same level.

React expects a component to return `a single root object/tree`.  

> Why Does React Require One Parent?
> Think of JSX as being transformed into JavaScript objects behind the scenes.  
> This `<h1>Hello</h1>` becomes something like `React.createElement("h1", null, "Hello");` in the back. This returns ONE value.  
> A component cannot return: `return value1, value2;`

One old technique to solved this was wrapping everything inside a <div>
```jsx
return (
  <div>
    <h1>Hello</h1>
    <p>Welcome</p>
  </div>
);
```

The problem is: if every component adds unnecessary wrapper divs, the HTML becomes messy.
If you inspect the website, and check the HTML, you'll get a "DIV soup" (a cluttered DOM)
```html
<div>
  <div>
    <div>
      <Header />
    </div>
  </div>
</div>
```

> The DOM (Document Object Model) is the browser’s internal tree structure of the webpage.  

Too many unnecessary nodes makes debugging harder, CSS harder. The layouts become more annoying and, also, this slightly increase browser work.

To improve this solution, React created `the Fragment Solution`.  
***A fragment is a wrapper that exists for React, but does NOT appear in the final HTML page.***

```jsx
<>
  <h1>Hello</h1>
  <p>Welcome</p>
</>
```
This is like saying “Group these together internally, but do not create an actual HTML element.”

You could also use this alternative :
```jsx
/*needs to import the necessary React package*/
<React.Fragment>
  ...
</React.Fragment>
```
