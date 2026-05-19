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
Selecting transcript lines in this section will navigate to timestamp in the video
- [Narrator] Within our React project here, within our next JS React project, to be specific, we have our app directory that's going to contain all of the files that we're going to render in the app. So what's kind of hiding in plain sight here? So if I run this app on localhost:3000, I can see that these routes are being created for mountain, for our home route, and then we have links in between them. Anytime I create a component using Next.js, by default, this is a server component. So think of a server component as a component that allows you to write some UI that can be rendered and optionally cached on the server. So what we can see here, if we open up our developer tools, so we'll go to the Elements tab and then we'll start to investigate some of these tags that are in the head. You're going to see a lot of these chunks, these pieces of the app that are being imported also at the end of the body because they want to make this as efficient as possible. We want to render something and then load our JavaScript in the background. All of this JavaScript is being rendered as this string. So this is considering performance every step of the way. And we're also getting some benefits like security and caching and all sorts of things are happening behind the scenes that we as developers don't have to worry about too much, but we can understand that it's going to make things much faster. So we can automatically implement server rendering without configuring anything. All we need to do is create these folders and create these components that live inside of them. Something to note about creating these pages or these components is that each one of the pages, each one of the files has to have a default export. So this is why we're export default function Page, that is how we're creating this component so that it can be properly consumed. So basically anything that's on the page is this interactive preview of HTML, and then anything that's interactive can be hydrated with that JavaScript. So let's go ahead and make a couple adjustments here. So we're going to create another directory called hotels. Inside of the hotels directory we'll create a page.js file. The page.js file, again, export default function Page, and then we want something to be displayed here. So let's go ahead and return a main element and then we'll return a div that says Hotel Details. Nice, so this is, as a preview, going to be a container for some data that we're going to load in a future video, but we're rendering a server component here by default with our Hotel Details. I don't love how that menu looks and I promised that we would change it. So let's go ahead and do that now. We're going to within our header component that's inside of the layout, make some adjustments here. Configured in our app router project, we have selected Tailwind as the CSS tool for this app, and Tailwind works with different classes. So let's go ahead and add a few things. We're going to say bg-slate-500. P-Y stands for padding on the Y-axis for about 16 pixels of padding. Let's add a little bit more markup here to our div. We'll say class="container mx-auto px-4". Same amount of padding, but on the X-axis. Then we'll add class="flex items-center justify-between". So this is going to help us incorporate Tailwind's Flexbox to order these elements about the page. Here we'll say className="flex items-center" again. Let's see how we're looking. All right, cool, so now we have these elements here. That's looking pretty good. Mountain Info and Snowtooth Mountain, all of those are appearing. So in a subsequent video we'll work on the look and feel of the lift status info, but we'll have to load some data first. But for now, we see these. You can always add additional links if you want to. Let's link to our hotel, for example. As soon as I add that link component, it will be added here and then I can click on it and that'll take me to that page. All right, so we have React server components supported. All of that is working in the background to make these apps, make these components as efficient as possible so that our app can be super fast.


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
4. Define a new route in your React Router configuration at /contact and have it render the Contact page component. 
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

Explained solution to the challenge
 Solution: Creating a route
Selecting transcript lines in this section will navigate to timestamp in the video
(upbeat rhythmic music) - [Instructor] Alright, let's go over our solution. So we wanted to create a new route, we wanted to render a page component, and we wanted to make sure that the link is to the contact route from the header. So anytime I want to create a route, I go to the app folder, I create a new folder called "Contact." Within it, we have a default export typically in a file called "page." (keys clicking) And we export a component. In React, we want to always make sure that our component name is capitalized. That is a React thing, not a Next.js thing necessarily. Let's go ahead and return a main element, and we'll say, "Contact us!" Great. So this should be exported from that route. If I go to the correct folder, I make sure all of my node modules are installed, and I run "npm run dev." This should run. We go back to localhost:3000, it looks like it's on the hotels route, that's okay. But if I go to contact, we should see "Contact Us!" Nice. What happens if I go to a route that doesn't exist? Well, I could see like, "contact-us," that's not a route I've created, that's not a folder. It's just going to 404 out. We can always customize that page of course, if we'd like to. I also added the extra credit, right? So all these errors are because I added that contact-us 404 route. So let's go ahead and go back to the header, which lives in the layout.js file. What I can do here is just copy and paste one of these divs, add the appropriate href to contact. We can change the title to "Contact Us." And then when I go back here, we see Mountain Info, Hotels, Contact Us, I click on it. And there we go, how cool is that? So that is how I add that link, that is how I create the page. And we can always add additional routes as our content demands. So awesome job, everybody. We've done it, we have created even more server components inside of our app.
