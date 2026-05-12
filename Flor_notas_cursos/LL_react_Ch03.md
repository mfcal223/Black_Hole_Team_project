## Lists

### Non-dynamic way

Call a function "Main()" in App().
Main() returns a <ul>  (?????) that has a list <li>.

```jsx
import "./App.css";

function Header({ name, year }) {
  return (
    <header>
        <h1> {name} project. </h1>
        <p>  Starting {year}</p>

    </header>
  )
}

function Main() {
  return (
    <ul>
      <li>item 1</li>
      <li>item 2</li>
      <li>item 3</li>
    </ul>
  )
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

### Dynamic way

Create an array for the elements inside the list.
Call that array from App().

```jsx
import "./App.css";

function Header({ name, year }) {
  return (
    <header>
        <h1> {name} project. </h1>
        <p>  Starting {year}</p>

    </header>
  )
}

const items = [
  "♫ Trabajo muy duro ♪",
  "♪...como un esclavo... ♫",
  "♫ ...pagenme dinero....$$$ "
];

function Main({dishes}) {
  return (
    <ul>
      {dishes.map((dish) => (
          <li> {dish} </li>
      ))}

    </ul>
  )
}

function App() {
  return (
    <div>
      <Header name="BHT" year={new Date().getFullYear()} />
      <Main dishes={items} />
    </div>
  );
}

export default App;
```

You can style this
* to remove the bullets of each element in the list
```jsx
function Main({dishes}) {
  return (
    <ul>
      {dishes.map((dish) => (
          <li style={{listStyleType: "none"}}> {dish} </li>
      ))}

    </ul>
  )
}
```