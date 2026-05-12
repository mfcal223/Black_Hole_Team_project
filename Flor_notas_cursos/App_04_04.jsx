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

function Main({ dishes, workStatus, onStatus }) {
  return (
    <>
      <div>
        <h2> Welcome to our Home page! </h2> 
        <h3> {workStatus ? " We are working" : " We are sleeping"}</h3>
        <button onClick={() => onStatus(true)}>Are we sleeping? Click to make us work</button>
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

export default App;
