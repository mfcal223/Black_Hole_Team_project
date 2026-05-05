
# React
React is a JavaScript library that you can use to create user interfaces. 

# React Documentation: 

https://react.dev/

https://react.dev/learn

---

# Utils & Tools to work with React

## Online compiler
https://playground.react.dev/

---

## Extension for Chrome or Mozilla

Search for: `React Developer Tools`
https://addons.mozilla.org/en-US/firefox/addon/react-devtools/?utm_source=addons.mozilla.org&utm_medium=referral&utm_content=search


Once this is installer, when you are in a website that uses react (for example react.dev) you can right-click, choose Inspect, and check the components, profiler (might not be supported), and other tabs with different components of the website. 

Checking if the react logo is filled in is the correct way to verify if React is running on a page. The React logo in the upper right corner of the Developer Tools will be filled in if React is detected

---

## Alternative for VS Code

https://codesandbox.io/p/sandbox/react-new?file=%2Fsrc%2FApp.js&utm_source=dotnew

this is an in-browser editor. 


---

## Extension for VS Code

* Prettier - Code formatter
by prettier.io

* In  VS Code settings, search for "format on save" and make sure "Format a file on save" option is ON.

---

##  Vite

https://vitejs.dev/

The tool that we can use to set up a project.  
Vite will allow you to generate a React application and have some built-in tooling set up for us.  

---


# React Linkedin Learning

https://www.linkedin.com/learning/react-essential-training/how-to-use-codespaces-what-you-should-know?autoSkip=true&resume=false

Linkedin Learning : 
Usuario : pcz@tutonow.com
Pass : RgGBz0LNA&a2@L!m

## React Fundamentals

### GitHub > > > React codespace : 
In this course, you will use this codespace
https://github.com/LinkedInLearning/react-essential-training-5949338/codespaces

https://expert-train-694vvx9gvvgjcx44v.github.dev/

### codespace commands

Code state in different chapter
```bash
# example: got to chapter 4 2
git checkout 04_02b
```

If you need to install dependencies like `npm` in this directory, go to react-proyect directory and execute in the VS code terminal:

```bash
cd react-project
npm install
```
this will install dependencies in the background.


---

### React rules
React component names must always start with a capital letter, while HTML tags must be lowercase.

### How React works + DOM

The core building block of a React application is a `React element`.  
* An element describes what you see on the screen, like an HTML tag.  
* If I create an element using React `.createElement` function, that has 3 parameters:  
    * 1st parameter, it is the element being create = `*h1*`.  
    * 2nd parameter - properties. Can be NULL if you don't want it to have any properties
    * 3rd parameter is any child elements of that like `"Hello World"`.  
        * adding this as the third argument will display it when it comes to the page.  

> This is a `DOM` node that displays "Hello World".  

React apps are made up of `React-components`. React components are typically one or more React elements nested together.  
in the previous example, a React component was created using a function that returns part of the UI. In this case, we're returning an `h1`. 

In the video example, the trainer was using a syntax called `JSX`. This is a tag-based syntax that compiles to plain **JavaScript** before running it in the browser.  

**An app that is made up of several different React-components.**   

Think of these components as making up the `DOM tree`: it has a header, a main, and a footer.    
Or in this example, a title, a header, and a "paragraph" of content.
```html
<html lang="en">
  <head>
    <title>My Document</title>
  </head>
  <body>
    <h1>Header</h1>
    <p>Paragraph</p>
  </body>
</html>
```

 A `Document Object Model (DOM) tree` is a hierarchical representation of an HTML or XML document. It consists of a root node, which is the document itself, and a series of child nodes that represent the elements, attributes, and text content of the document.  
> Here are some very useful resources to understand basic conceptos on DOM:  
1.  [Document Object Model (DOM)](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)   
2. [hHTML DOM tree](https://www.w3schools.com/js/js_htmldom.asp).   

All of these can be rendered together from the app.  
React has a concept called `props`, where we can display dynamic data inside of a component. 
For example, in a function called *header*, we pass in *props* as an argument, and then *props.title* will display whatever property that I've passed in to the header. In this case, it's vite. Then when the data changes, our component will re-render, but React knows how to re-render in the most efficient way possible so that we can hold onto the parts that don't change, and just make updates to the parts that do. 

---

### Question about React "Fundamentals"
1. You have been assigned to create a mobile application that needs to run on both iOS and Android platforms. Your team is well-versed in using JavaScript and prefers a solution that integrates smoothly with their existing web development practices. Which tool would be most suitable for this project?  
React Native allows developers to create native mobile applications using JavaScript and React, making it an ideal option for a team already familiar with web development using React.  

2. You are building a React application and have a header component that should display a dynamic title passed from the parent component. How will you ensure that changes in the title prop trigger a re-render of the header component?  
Pass the title as a prop to the header component.
Passing the title as a prop ensures that React will automatically handle re-rendering the component efficiently when the prop changes.  

3. A developer wants to optimize their React components for a new project using React 19. They've heard about the new React Compiler. What step should they take first to ensure their components are optimized using this new feature?  
Use the playground at `playground.react.dev` to transform their components to optimized functions. Using the playground at playground.react.dev allows the developer to transform their components into optimized functions as demonstrated by the new React Compiler feature. 


---

## JSX

`JSX` or `JavaScript is XML` is a syntax that you can use to write HTML like syntax in a React component in a JavaScript file.  
Not only can this handle hardcoded text, but it also can handle variables.  



 ---



You have just created a new React project using Vite and need to make some initial changes to it for rendering purposes. After stripping away most elements from the App component, what should you do to ensure the basic setup renders Hello React! on the browser correctly?

    Remove unnecessary imports from App.jsx and update the main.jsx to remove StrictMode, then run the development server using npm run dev.

    Correct

    This sequence of actions ensures that unnecessary imports are removed, the main.jsx is streamlined, and running the correct npm command will launch the development server, rendering Hello React! in the browser.

---