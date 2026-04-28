https://www.linkedin.com/learning/react-essential-training/how-to-use-codespaces-what-you-should-know?autoSkip=true&resume=false

Linkedin Learning : 
Usuario : pcz@tutonow.com
Pass : RgGBz0LNA&a2@L!m


React codespace en github: 
https://github.com/LinkedInLearning/react-essential-training-5949338/codespaces

https://expert-train-694vvx9gvvgjcx44v.github.dev/


------

# codespace commands

Code state in different chapter
```bash
# chapter 4 2
git checkout 04_02b
```

In this directory, go to react-proyect directory

```bash
cd react-project
npm install
```
this will install dependencies in the background.

---

React is a JavaScript library that you can use to create user interfaces. 

# React Documentation: 

https://react.dev/

https://react.dev/learn

---
# Online compiler
https://playground.react.dev/

---

# Extension for Chrome or Mozilla

Search for: `React Developer Tools`
https://addons.mozilla.org/en-US/firefox/addon/react-devtools/?utm_source=addons.mozilla.org&utm_medium=referral&utm_content=search


Once this is installer, when you are in a website that uses react (for example react.dev) you can right-click, choose Inspect, and check the components, profiler (might not be supported), and other tabs with different components of the website. 

Checking if the react logo is filled in is the correct way to verify if React is running on a page. The React logo in the upper right corner of the Developer Tools will be filled in if React is detected

---

# Alternative for VS Code

https://codesandbox.io/p/sandbox/react-new?file=%2Fsrc%2FApp.js&utm_source=dotnew

this is an in-browser editor. 

# Extension for VS Code

* Prettier - Code formatter
by prettier.io

* In  VS Code settings, search for "format on save" and make sure "Format a file on save" option is ON.
---

#  Vite

https://vite.dev/

The tool that we're going to be using to set up our project is called Vite. Vite is a tool that will allow us to generate a React application and have some built-in tooling set up for us. 

---


# React rules
React component names must always start with a capital letter, while HTML tags must be lowercase.

# How React works

The core building block of a React application is a React element. An element describes what you see on the screen, like an HTML tag. So, if I create an element using React .createElement, I'm creating an h1, I pass that as the first argument to that function, I pass null for the second because I don't want it to have any properties, and then any child elements of that like Hello World, I'm going to add as the third argument so that that displays when I come to the page. So, this is a DOM node that displays Hello World. React apps are made up of React components. React components are typically one or more React elements nested together. We create a React component using a function that returns part of our UI. In this case, we're returning an h1. Here, we're using a syntax called JSX. This is a tag-based syntax that compiles to plain JavaScript before we run it in the browser.  

We then create an app that is made up of a bunch of different components. Think of these components as making up the DOM tree. So, I have a header, a main, and a footer. All of these can be rendered together from the app. React has a concept called props, where we can display dynamic data inside of a component. So, here, in our function called header, we pass in props as an argument, and then props.title will display whatever property that I've passed in to the header. In this case, it's vite. Then when the data changes, our component will re-render, but React knows how to re-render in the most efficient way possible so that we can hold onto the parts that don't change, and just make updates to the parts that do. 

---


Questions Part 1:
1. You have been assigned to create a mobile application that needs to run on both iOS and Android platforms. Your team is well-versed in using JavaScript and prefers a solution that integrates smoothly with their existing web development practices. Which tool would be most suitable for this project?  
React Native allows developers to create native mobile applications using JavaScript and React, making it an ideal option for a team already familiar with web development using React.  

2. You are building a React application and have a header component that should display a dynamic title passed from the parent component. How will you ensure that changes in the title prop trigger a re-render of the header component?  
Pass the title as a prop to the header component.
Passing the title as a prop ensures that React will automatically handle re-rendering the component efficiently when the prop changes.  

3. A developer wants to optimize their React components for a new project using React 19. They've heard about the new React Compiler. What step should they take first to ensure their components are optimized using this new feature?  
Use the playground at playground.react.dev to transform their components to optimized functions. Using the playground at playground.react.dev allows the developer to transform their components into optimized functions as demonstrated by the new React Compiler feature. 


---

# Part 2

Started video 1