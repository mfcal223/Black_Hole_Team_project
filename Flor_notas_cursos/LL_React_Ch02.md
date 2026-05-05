# Create React Elements (Part 2)

## 02_01 -- Start a project with VITE
> This section corresponds to video [Initializing a project with vite](https://www.linkedin.com/learning/react-essential-training/initializing-a-project-with-vite?autoSkip=true&resume=false)

To start the project, you will use VITE. 

You will need to download the **Exercise_files.zip** from the course webpage.
Open the your course codespace, go to `Menu > Open in VS code Desktop`
Once the codespace is open in you local app, you can add the Exercise folder. 

Go to `directory 02_01b`  ---------> today's exercise !
```
Exercise_Files/Ch02/02_01/02_01b

```
And run a command to create the vite project:
```bash

npm create vite@latest react-project -- --template react 
# "react-project" is a name for the project. You can change this, just remember to keep consistency with future commands
# there might already be a "react-project" folder, so you might need to choose a different name
# this comand will prompt a response telling you to run these other commands
```

This is what I saw when trying this exercise (*it asked me to install a dependency to what I said yes*):
```bash
$ npm create vite@latest react-project-flor -- --template react

> npx
> "create-vite" react-project-flor --template react

│
◇  Install with npm and start now?
│  Yes
│
◇  Scaffolding project in /workspaces/react-essential-training-5949338/Exercise_Files/Ch02/02_01/02_01b/react-project-flor...
│
◇  Installing dependencies with npm...

# it installed npm

◇  Starting dev server...

> react-project-flor@0.0.0 dev
> vite


  VITE v8.0.10  ready in 779 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

In the terminal, move inside your react-project directory. 
```bash
cd react-project-flor
```

Confirm there is a file `"package.json"` (`ls`).  
Open that package.json and delete the **"dependencies" block for react**
save file. Don't forget to *save* this change. 

Then, in the terminal, execute:
```bash
npm install --save-exact react@rc react-dom@rc
```

Now, you should see this new block in the `package.json` file
```json
  "dependencies": {
    "react": "19.0.0-rc.1",
    "react-dom": "19.0.0-rc.1"
  }
  ```

Now that you've done that, this has installed the most recent versions of React, so React 19, the release candidate.  
Run the rest of the packages: 
```bash
npm install
```
Then you can run based on these scripts that are here.  


To "START" the project do:
```bash
npm run dev
```
This is going to start it on `localhost:5173`.  
In the browser, go to `https://localhost:5173`
This is going to show me the React project working.  

Now, you can try modifying it.  
Go to `src/App.jsx`, and change the header (text between `<h1> </h1>`)

You will see the change inmediatly in the browser.
![react project is working](/Flor_notas_cursos/pics/react_home_02_01b.png)

---

## 02_02 -- 

The project has a src/ where you can find the App.jsx file we used in the previous exercise.

There is also a src/main.jsx file where you can see a function called
```jsx
createRoot(document.getElementById("root")).render(<App />);
```

What this is doing is going to the poject file `index.html`, and it finds the div that has the id of **"root"**, and it's using the rules of JavaScript to inject whatever should be added to the page.  
```html
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
```

This main.jsx file is saying go find that element (**"root"**) and render this component (**"(<App />)"**).

```jsx
# file App.jsx
import "./App.css";

function App() {
  return <h1>Hello World!!</h1>;
}

export default App;
```

Looking at App.jsx file, you can see that this component is a header `<h1>`.  

If you now run 
```bash
npm install
npm run dev
```

You will be able to open the project's page in the browser (port might be different from previous exercise).
If you inspect the elements in the browser, you might see that inside `<body`, there is `<div id="root>`, and nested inside it, is our header "Hello World"

> this observacion of the html code is visible in the trainers screen, in MY screen I only see the reference to main.jsx, exactly like in index.html.  

## 02_03 - What is JSX?

As JSX allows you to create variables that can be injected into the body of the component using curly braces, you can use methods to modify or alter those elements.

![02_03b](/Flor_notas_cursos/pics/hello_javascript_moon.png)

This is your first component (or "building block") or the UI.

```jsx
import "./App.css";

let language = "React";
let moon = "🌙";

function App() {
  return (
    <h1>
      Hello {language.toUpperCase()} {moon}!!
    </h1>
  );
}

export default App;
```
Here, JSX is being used to inject variables into the displayed component. 

## 02_04 - Creating a React Component as a function.

Instead of just using variable, you can call a function.

```jsx
import "./App.css";

function Header() {
  return (
    <header>
      <h1> The Team is cooking </h1>
    </header>
  )
}

function App() {
  return <Header />;
}

export default App;
```

**App()** will take the content of **Header()** as a component.
You can check this nesting in the browser, by inspecting it, then going to "Components" (react components developper tools)

![02_04](/Flor_notas_cursos/pics/02_04_Header_team_is_cooking.png)

If you want to add more elements to this example, you will need to wrap the adjacents tags (all of them) in an enclosing tag ( in a set of `" (  ) " `)

Here is how it can look now:
```jsx
import "./App.css";

function Header() {
  return (
    <header>
      <h1> The Team is cooking </h1>
    </header>
  )
}

function App() {
  return (
  <div>
    <Header />
    <main>
      <h2> Ask about our Agent menu . </h2>
    </main>
    </div>
  )
  ;
}

export default App;
```

## 02_05 - Adding properties to the Components

Using JSX, you can inject the names of variables into components, but it's also possible to ***display dynamic data*** from a very important object called `props`.  

`props` allows you to pass on properties by passing it as a parameter.
```jsx
import "./App.css";

function Header(props) {
  console.log(props);
  return (
    <header>
      <h1> {props.name} is cooking </h1>
      <p>Operating since {props.year}. Current year {props.year_now}</p>
    </header>
  )
}

function App() {
  return (
  <div>
    <Header name="The BH team" year={2024} year_now={new Date().getFullYear()} />
    <main>
      <h2> Ask about our Agent menu . </h2>
    </main>
    </div>
  )
  ;
}

export default App;
```

`props` will look for the content in the variable's name, and inject it into the element. 
```jsx
props.propertyName
```
* INT variables need to be between `{}`  
* strign variables remain between `""`  
* you can call functions to make the information dynamic.   
    * example: Date().getFullYear()  

![02_05](/Flor_notas_cursos/pics/02_05_props.png)

---

#### 📢 Disclaimer:

I had an issue while doing this. I had some warnings about props variable not being validated. Apparently that is due to a strict "eslint" configuration.

For the course purpouse I can turn them oFF by changing this block in the "rules" block of the .eslint.config file of this react-project directory.

```jsx
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
```

You can also fix this "the proper way": props needs to be told what can of variable he is working with. What is the prototype for the variables being passed on as parameters?
So this is what I added to App.jsx file:  
```jsx
# in the header section of the file
import PropTypes from "prop-types";

# before App()
Header.propTypes = {
  name: PropTypes.string.isRequired,
  year: PropTypes.number.isRequired,
  year_now: PropTypes.number.isRequired,
};
```

The ".isRequired" part says the props are not optional.

## 02_06 - Destructuring components

You can add a simplification to this header. Instead of passing the entire "props" object, you can be more granular or specific about which variables you'll be passing.

Instead of passing (props) as parameter, you'll pass ("{name, year, year_now}")

```jsx
import "./App.css";

function Header({name, year, year_now}) {
  return (
    <header>
      <h1> {name} is cooking </h1>
      <p>Operating since {year}. Current year {year_now}</p>
    </header>
  )
}

function App() {
  return (
  <div>
    <Header name="The Team" year={2024} year_now={new Date().getFullYear()} />
    <main>
      <h2> Ask about our Agent menu . </h2>
    </main>
    </div>
  )
  ;
}

export default App;
```

Destructuring the name and year properties in the function parameters is a shorthand syntax that allows you to directly access these properties without the props. prefix. This makes the code cleaner and more readable.  