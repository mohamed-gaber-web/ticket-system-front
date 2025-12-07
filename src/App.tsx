import { BrowserRouter, useRoutes } from 'react-router-dom';
import './App.css';
import { routes } from './routes';
// import { useState } from 'react';

function AppRoutes() {
  const element = useRoutes(routes);
  return element;
}

function App() {

  // useState(state variable) // react hook to add state variable to your component
  // top level of your component to declare state variable.
  // useState(initialState) initialState => number - string - function
  // [ something, setSomething ] array destructuring. 
  // paramaters ( initialState ) value to start and any type
  // return: array [ currentState -- set function => updated the state to diffrent value and trigger a re-render ]
  // let x = 20;
  // const [x, setX] = useState(() => 1 + 1);
  // const [age, setAge] = useState(20);


  // console.log(x)

  return (
    <>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </>
  )
}

export default App;
