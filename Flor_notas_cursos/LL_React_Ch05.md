# Chapter -5 - React Server Components

## Create a project with Next.js


1. Initialize a Next.js project
```bash
run npx create-next-app@latest. 
```
2. follow the configuration "wizard" of putting this together.
* What is your project name?  
* use TypeScript? ( `no` for this exercise)
* use ESLint? ( `no` for this exercise)
* use Tailwind? (`yes` for this exercise)
* use source directory? (`yes` for this exercise)
* Use App Router? → Yes. This enables the modern Next.js routing system.

3. Stand up the Next.js project
```bash
npm run dev
```
Usually this start the project at `localhost:3000`.  

Inside this project there is a **source folder**. Inside of that source folder is a folder called **app**. Now, all of the files  are going to live inside of the app router by default in this Next.js project. 

This is going to allow us to create routes for different endpoints within our application. 

The `layout.js` file defines shared layout and metadata of the project as well as the HTML. 

```bash
layout.js           --> = outer shell
    └── page.js     --> = actual page content
```

The `page.js` file is the component that it is going to render whenever the user goes to the homepage at localhost:3000.  
```jsx
src/app/page.js
# actually means
/
# = homepage
```

## Using the App Router
Selecting transcript lines in this section will navigate to timestamp in the video
- [Instructor] As I mentioned in the previous video, we're using Next.js, and specifically, we're using the App Router. What this means is that within my project, my Next.js project, we have a folder called app that's going to create all of the different routes that are part of our application. So, this is a file-based routing structure that we can use so that anytime I create a folder, like mountain, this is going to create a new route for me. Within that mountain folder, I can create a new file called page.js, and the page.js file is going to display whatever content we want to see when I hit this route. So, for example, I can create a new function called Page, and then here we can return a main component. Inside the main component, we'll add an h1, Lift Status Info. So, within the next React project, we're going to run npm run dev, go to localhost:3000, and we see our homepage here, but we're here really to look for mountain, right? And this is going to show our Lift Status Info. Very cool. So, this is our first example of creating a new route. A couple things to know about this. Sometimes your app folder will be inside of the source directory, sometimes it won't. That's just an option that you can choose as you're configuring your project. The app folder though, will wrap around this mountain folder and any other routes that we want to create, so, within this page, that's where we'll make that happen. Another thing that we can do, if we go to the layout file, you can add any sort of component that you'd like to right here in the layout if you want it to appear on multiple pages. So, let me show you what I mean here. We'll say return a header, inside of that header, we want a div. Inside of that, we want a nav element. So, within this div, this is where we're going to use our first component from Next.js, and this component is called Link. Nav is going to help us navigate between different components and different routes. So, let's go ahead and add an href to this. So, we'll say href/ and then let's actually make this a full link so that it has some text, so we'll open and close the link component, and then we'll say Snowtooth Mountain. Now, from here, what I want to do is, we'll create another div. This other div, we'll say mountain, and we'll call this Mountain Info. So, now once I've created the header, I can place it inside of the RootLayout. So, this'll prevent me from having to import this in absolutely every page, and remember where it goes every time. Instead, we'll just use the header on every single page. So, with that being added, I also need to remember to import this Link. So, Link is going to come from next/link. Okay, back over to LocalHost:3000. Now, if we go to just the home route, we have Snowtooth Mountain, Mountain Info. If I click on Mountain Info, that will take me to this, and then if I click back to Snow Tooth Mountain, it'll take me to the homepage. So, the link component works harmoniously with the App Router. Anytime we add a link there, it's going to keep track of where we are and help me move from page to page with ease. In a later video, we'll make some adjustments to the style so that looks a little bit better, but for now, we should understand. Use the link whenever you need to navigate between pages, and then place any components that you want to render on every single page inside of the RootLayout.

##  Building a server component
In Next.js, components are server components by default.

This means:
- rendered on server
- optimized before reaching browser
- good for fetching data
- improves performance

Use server components for:
- data fetching
- static rendering
- non-interactive UI


Anytime you create a component using Next.js, by default, that is a server component.  
```js
export default function Page() {
  return (
    <main>
      <div>Hotel Details</div>
    </main>
  );
}
```
In a Next.js project that uses the `app/` router, components are **Server Components by default**.

This means that when we create a page inside the `app/` directory, Next.js can render that component on the server before sending the result to the browser.

This is different from the first React/Vite exercises, where most of the rendering happened directly in the browser.

A Server Component is useful because it allows Next.js to prepare part of the page before the client receives it. This can improve performance because the browser does not need to do all the work by itself. Next.js can also optimize, cache, and split the JavaScript that is sent to the browser.

In practical terms:

```text
Next.js Server Component
        ↓
Rendered/prepared on the server
        ↓
HTML is sent to the browser
        ↓
Interactive parts can be hydrated with JavaScript
```


## challenge
# Challenge: Creating a Route!

- Create a new route at `/contact`
- Render a Page Component at `/contact`
- Test to make sure this is rendering appropriately
- _Extra Credit_: Add a link to the contact route from the `Header`

## my solution
1. create a new rout contact/
2. create a new page component page.js inside contact/
3. export default function Page() inside it
```jsx
export default function Page() {
  return (
    <main>
      <div>
        <h1>This is contact page</h1>
      </div>
    </main>
  );
}
```
4. Define a new route in your App Router configuration at /contact and have it render the Contact page component. 
add link to contact component inside layout.js

```jsx
function Header() {
  return (
    <header class="bg-slate-500 py-4">
      <div class="container mx-auto px-4">
        <nav class="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/">Snowtooth Mountain</Link>
          </div>
          <div>
            <Link href="/mountain">Mountain Info</Link>
          </div>
          <div>
            <Link href="/hotels">Hotels</Link>
          </div>
          <div>
            <Link href="/contact">Contact</Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
```

### Explanation

The important rule is that pages in the App Router usually need a default export:
```js
export default function Page() {
  return <main>Content here</main>;
}
```
This allows Next.js to correctly use that component as the content for the route.

Next.js uses file-based routing.
This means that routes are created by folders and files.

For example:
```
src/app/hotels/page.js
```
creates the route:
```
/hotels
```
So if we want to create a new page at:
```
/contact
```
we create this structure:
```
src/app/contact/page.js
```
Then inside page.js, we export a component:
```jsx
export default function Page() {
  return (
    <main>
      <div>
        <h1>This is contact page</h1>
      </div>
    </main>
  );
}
```
Now, when the app is running with:
```bash
npm run dev
```
we can visit:
```
http://localhost:3000/contact
```
and Next.js will render that page.

#### Important Difference From React Router

In a Vite React project, routes usually need to be manually registered using React Router.

But in Next.js App Router, we do not manually define a route configuration.

We do not write something like:
```
<Route path="/contact" element={<Contact />} />
```
Instead, the folder itself creates the route.

### Adding the Link in the Shared Header

In this project, the header is inside layout.js.

That is useful because layout.js wraps multiple pages. So if we put the navigation there, the header appears on every route.

Example:
```jsx
function Header() {
  return (
    <header className="bg-slate-500 py-4">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/">Snowtooth Mountain</Link>
          </div>

          <div>
            <Link href="/mountain">Mountain Info</Link>
          </div>

          <div>
            <Link href="/hotels">Hotels</Link>
          </div>

          <div>
            <Link href="/contact">Contact</Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
```
Important React reminder:
```
className
```
is used instead of:
```
class
```
In regular HTML we write class, but in JSX/React we should write className.

What Happens If the Route Does Not Exist?

If we visit a route that does not match any folder inside app/, Next.js shows a 404 page.

For example, if we created:
```
/contact
```
but visit:
```
/contact-us
```
Next.js will not find a matching folder and will show a not found page.