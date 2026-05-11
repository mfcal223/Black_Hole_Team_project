import { useState } from "react";
import "./App.css";
import logo from "./images/BHT_logo.png";

function Header({ name, year }) {
  return (
    <header>
      <h1>{name}'s Kitchen</h1>
      <p>Copyright {year}</p>
    </header>
  );
}

const items = [
  "Working Hard",
  "Innovating always",
  "Smoothing the workload"
];

const dishObjects = items.map((dish, i) => ({
  id: i,
  title: dish
}));

function Main({ dishes }) {
  return (
    <>
      <div>
        Welcome to our Home page
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

export default App;
