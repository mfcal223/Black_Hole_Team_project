## Fetching data in React applications

In a Next.js application, the recommended place to fetch data is inside a **Server Component** whenever possible.

Because Server Components run on the server, they can request data before the page reaches the browser. This can improve performance because the browser receives already-prepared content instead of having to fetch everything itself after loading the page.

In this example, the `mountain/page.js` file becomes responsible for both:

- fetching the data
- rendering the UI

This is often called `Co-locating data fetching with the component` meaning the component and the logic that retrieves its data live together.

### Creating an Async Function

The first step is creating an asynchronous function that requests data from an API:
```jsx
async function getData() {
  const res = await fetch(
    "https://snowtooth-api-rest.fly.dev"
  );
  return res.json();
}
```
* `fetch()` sends a request to a REST API  
* `await` pauses execution until the response arrives  
* `res.json()` converts the response into JavaScript data  

The `fetch` used by Next.js behaves similarly to the browser `fetch`, but Next.js adds optimizations such as caching and server-side handling.  

### Async Server Components

Because the page needs to wait for data before rendering, the component itself becomes asynchronous. This allows the component to use: `await getData()` directly inside the page.  

This is one of the major differences between modern Next.js Server Components and traditional client-side React applications.

### Rendering the Data

Initially, it can be useful to inspect the API response:
```jsx
{JSON.stringify(data)}
```
This helps understand the structure of the returned JSON.

Once the structure is understood, the data can be rendered properly using JSX.

### Rendering Dynamic Tables

The API returns an array of lifts.

To render multiple rows dynamically, we use:
```
data.map()
```

Each item in the array becomes one table row:
```jsx
<tbody>
  {data.map((lift) => (
    <tr key={lift.id}>      //each rendered item needs a unique key
      <td>{lift.name}</td>
      <td>{lift.status}</td>
    </tr>
  ))}
</tbody>
```

### Final Example
```jsx
# inside src/app/mountain/page.js
async function getData() {
  const res = await fetch(
    "https://snowtooth-api-rest.fly.dev"
  );
  return res.json();
}

export default async function Page() {
  const data = await getData();
  return (
    <main>
      <h1>Lift Status Info</h1>
      <table>
        <thead>
          <tr>
            <th>Lift Name</th>
            <th>Current Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((lift) => (
            <tr key={lift.id}>
              <td>{lift.name}</td>
              <td>{lift.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
```

---

## Passing data as props

After fetching data in a Server Component, the next step is usually passing part of that data into smaller child components.

This follows one of the most common React patterns:

```text
Parent component fetches/manages data  ----> Server Components for data/static rendering
        ↓
Child components receive props
        ↓
Child components focus on rendering UI  ----> Client Components for interactivity/browser features
```

Good Next.js applications try to keep as much as possible on the server, while only moving interactive pieces to the client.

### Fetching Data in the Parent Component

The page component is responsible for:
* requesting hotel data  
* waiting for the response  
* rendering multiple hotel blocks  
* const data = await getData();

The page acts as the **"smart"** component that controls the data.

#### Creating a Presentation Component
The HotelBlock component is a simpler child component.

Its responsibility is only:
```
Receive props
        ↓
Display UI
```
This is sometimes called a `Presentation Component` because it focuses on displaying information instead of fetching/managing data itself.

#### Receiving Props

The component receives values using destructuring:
```jsx
function HotelBlock({ name, capacity })
```
This means:
* name      -> hotel name  
* capacity  -> hotel capacity  

Those values are passed from the parent component.
```jsx
{data.map((hotel) => (
  <HotelBlock
    key={hotel.id}
    name={hotel.name}
    capacity={hotel.capacity}
  />
))}
```
Each hotel object becomes one rendered HotelBlock. This demonstrates another important React pattern:
```html
Fetch once in parent
        ↓
Pass only needed data to children
```
instead of making every child component fetch its own data separately.

#### Final Example
```jsx
// inside src/app/hotels/page.js
async function getData() {
  const res = await fetch(
    "https://snowtooth-hotel-api.fly.dev"
  );
  return res.json();
}

function HotelBlock({ name, capacity }) {
  return (
    <div>
      <h2>{name}</h2>
      <p>{capacity}</p>
    </div>
  );
}

export default async function Page() {
  const data = await getData();
  return (
    <main>
      <div>
        <h1>Hotel Details</h1>
        <div>
          {data.map((hotel) => (
            <HotelBlock
              key={hotel.id}
              name={hotel.name}
              capacity={hotel.capacity}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

```

---

## Creating a client component (Load an image)

In Next.js, components are Server Components by default.  

Server Components are excellent for:  

- fetching data  
- rendering static content  
- optimizing performance  

However, some features require access to the browser environment.  

Examples include:  

- button interactions  
- browser APIs  
- localStorage  
- geolocation  
- animations  
- accessing local/public assets dynamically  

For those situations, Next.js provides:  

```jsx
"use client";
```
which marks a component as a Client Component. 

### Why a Client Component Was Needed Here

The project wanted to dynamically load hotel images from the public/ directory.

Each image follows this pattern:

/public/hotels/{id}.jpeg

The image path depends on the hotel ID returned by the API.

Because this involves browser-side behavior and dynamic image loading, the component needed to become a Client Component.

### Separating the Component

Instead of keeping everything inside page.js, the image-rendering logic was moved into:

HotelBlock.js

This is useful because:

the page remains a Server Component
only the interactive/browser-dependent part becomes client-side

This is an important optimization pattern in Next.js.

### Marking the Component as Client-Side

At the very top of the file:

"use client";

This tells Next.js:

Render this component on the client/browser.

Without this line, Next.js treats the component as a Server Component by default.

### Using the Next.js Image Component

Instead of a normal HTML <img>, Next.js provides:

import Image from "next/image";

The Image component adds optimizations such as:

lazy loading
responsive loading
image optimization
better performance

### Dynamic Image Loader

The loader function dynamically creates the image path:

const imageLoader = ({ src }) => {
  return `./hotels/${src}.jpeg`;
};

If:

src = 3

the final image path becomes:

./hotels/3.jpeg

### Passing the ID as a Prop

The parent component passes the hotel ID:
```jsx
<HotelBlock
  key={hotel.id}
  id={hotel.id}
  name={hotel.name}
  capacity={hotel.capacity}
/>
```
The child component then uses that ID to generate the image URL.

### Final code
```jsx
// hotes/page.js
import HotelBlock from "./HotelBlock";

async function getData() {
  const res = await fetch(
    "https://snowtooth-hotel-api.fly.dev"
  );
  return res.json();
}

export default async function Page() {
  const data = await getData();
  return (
    <main>
      <div>
        <h1>Hotel Details</h1>
        <div>
          {data.map((hotel) => (
            <HotelBlock
              key={hotel.id}
              id={hotel.id}
              name={hotel.name}
              capacity={hotel.capacity}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

// HotelBlocks.js
"use client";
import Image from "next/image";

export default function HotelBlock({ id, name, capacity }) {
  const imageLoader = ({ src }) => {
    return `./hotels/${src}.jpeg`;
  };
  return (
    <div>
      <h2>{name}</h2>
      <p>{capacity}</p>
      <Image
        src={id}
        width={300}
        height={300}
        loader={imageLoader}
      />
    </div>
  );
}
```

## Create a (Contact) form

This section introduces how forms are built in a Next.js/React application.

The main goal is to create a UI that allows users to:

- enter an email address
- write a message
- submit the form

At this stage, the focus is mainly on:

```text
Form structure
        +
React/JSX syntax
        +
Tailwind styling
```
The form is not yet connected to a backend. That happens in the next section with **Server Actions**.

### Basic Form Structure

A form in React/JSX still uses standard HTML form elements:

<form>

Inside the form, we usually place:

labels
inputs
textareas
buttons

Example:

<label>Email</label>
<input type="email" />

### Labels and Accessibility

Each label uses:

htmlFor

instead of regular HTML:

for

because for is a reserved JavaScript keyword.

Example:

<label htmlFor="email">

This connects the label to the input:

<input id="email" />

Benefits:

accessibility
screen reader support
clicking the label focuses the input

### Controlled Form Fields

The form contains two fields:
* email input  
* message textarea  

#### Email Input
<input
  id="email"
  type="email"
  name="email"
  required
/>

Important attributes:

| Attribute      | Purpose                                |
| -------------- | -------------------------------------- |
| `id`           | connects input to label                |
| `type="email"` | browser validates email format         |
| `name`         | identifies the field during submission |
| `required`     | field cannot be empty                  |

#### Text area

The message field uses:

<textarea>

instead of an input because it supports multi-line text.

Example:

<textarea
  id="message"
  name="message"
  rows="4"
  required
/>

The rows property controls the visible height.

### Submit Button

The form button uses:

<button type="submit">

This tells the browser = `[Clicking this button submits the form]`

---

## Styling With Tailwind

This lesson also introduces more Tailwind usage.

Instead of creating separate CSS files, Tailwind allows styling directly inside JSX using utility classes.

Example: `className="bg-blue-600 text-white"`

> In React/JSX `className` must be used instead of `class` because class is a reserved JavaScript keyword.

### Container Styling

The main container uses:
```jsx
className="max-w-md mx-auto p-6 bg-white shadow-md rounded-md"
```
Some important Tailwind utilities:

| Class        | Meaning             |
| ------------ | ------------------- |
| `max-w-md`   | maximum width       |
| `mx-auto`    | center horizontally |
| `p-6`        | padding             |
| `bg-white`   | white background    |
| `shadow-md`  | medium shadow       |
| `rounded-md` | rounded corners     |

### Form Spacing
```jsx
className="space-y-4"
```
adds vertical spacing between form elements.

### Focus Styling

Inputs use classes like:
```
focus:ring-2
focus:ring-blue-500
focus:border-blue-500
```
These styles activate when the input is focused/clicked.

---

###  Final Example

```jsx
export default function Page() {
  return (
    <main className="max-w-md mx-auto p-6 bg-white shadow-md rounded-md">
      <h1 className="text-2xl font-bold text-center mb-6">
        Contact us!
      </h1>
      <form className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            required
            className="border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-gray-700"
          >
            Message
          </label>
          <textarea
            id="message"
            required
            name="message"
            rows="4"
            className="border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>
        <button
          type="submit"
          className="text-white bg-blue-600 rounded-md p-3"
        >
          Send Message
        </button>
      </form>
    </main>
  );
}
```

---

## Creating a server action

A Server Action is a function that runs on the server and can be triggered directly from a form or a client interaction.

Server Actions are commonly used for:

form submissions
database updates
API calls
creating/updating data
mutations

This allows Next.js applications to handle backend-related logic without necessarily creating a separate API endpoint for every action.  

Earlier, the form only displayed UI elements (inputs, textarea, submit button) but now the form becomes functional: when the user clicks `"Send Message"`the form data is processed by a server-side function.  

> Using `console.log(...)` inside a Server Action prints in terminal/server console, NOT in the browser console. Because the function executes on the server, not in the browser.  

### Creating the Server Action

The function:
```
async function submitForm(formData)
```
is responsible for handling the submitted form.

This function receives `formData` which contains all form values.

### "use server"

Inside the function `"use server";` is the directive that tells Next.js "This function must execute on the server".
Without this directive, the function would not behave as a Server Action.

This is similar in concept to:
```
"use client";
```
which marks a component as client-side.

### Reading Form Data

The browser automatically collects form fields and sends them into formData.

The values can be accessed using:
```
formData.get("fieldName")
```
Example:
```jsx
formData.get("email")
// retrieves the value from:
<input name="email" />
```
and:
```jsx
formData.get("message")
// retrieves the value from:
<textarea name="message" />
```

### Creating a JavaScript Object

The submitted values are grouped into an object:
```jsx
const formFields = {
  email: formData.get("email"),
  message: formData.get("message")
};
```
This makes the data easier to work with.

Result example:
```javascript
{
  email: "user@email.com",
  message: "Hello!"
}
```

### Connecting the Action to the Form

This is the most important line:
```jsx
<form action={submitForm}>
```
Instead of manually attaching an onSubmit event like traditional React/Vite apps often do, Next.js allows the form to directly call a Server Action.

Conceptually:
```
User submits form
        ↓
Next.js sends formData
        ↓
submitForm() runs on the server
        ↓
server processes data
```

### final example
```jsx
export default function Page() {
  async function submitForm(formData) {
    "use server";
    const formFields = {
      email: formData.get("email"),
      message: formData.get("message")
    };
    console.log("formFields", formFields);
    console.log(
      "TODO: Send these form field values to a backend"
    );
    return formFields;
  }
  return (
    <main className="max-w-md mx-auto p-6 bg-white shadow-md rounded-md">
      <h1 className="text-2xl font-bold text-center mb-6">
        Contact us!
      </h1>
      <form className="space-y-4" action={submitForm}>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            required
            className="border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-gray-700"
          >
            Message
          </label>
          <textarea
            id="message"
            required
            name="message"
            rows="4"
            className="border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>
        <button
          type="submit"
          className="text-white bg-blue-600 rounded-md p-3"
        >
          Send Message
        </button>
      </form>
    </main>
  );
}
```

---


