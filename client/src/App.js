import logo from './logo.svg';
import './App.css';
import { Routes, Route } from "react-router-dom";
import Header from './Header';
import Table from './Table';
import Footer from './Footer';

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Table />} />
        <Route path=":page/:rows" element={<Table />} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;
