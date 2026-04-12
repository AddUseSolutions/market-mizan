import { Link, NavLink, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import AdminPage from "./pages/AdminPage";
import ContactPage from "./pages/ContactPage";

function App() {
  return (
    <div>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="logo">
            <img src="/logo-market-mizan.svg" alt="Market Mizan" className="logo-img" />
          </Link>
          <nav className="topnav">
            <NavLink to="/search" className={({ isActive }) => `topnav-link ${isActive ? "topnav-link-active" : ""}`}>Search</NavLink>
            <NavLink to="/admin" className={({ isActive }) => `topnav-link topnav-link-accent ${isActive ? "topnav-link-active" : ""}`}>Admin</NavLink>
            <NavLink to="/contact" className={({ isActive }) => `topnav-link ${isActive ? "topnav-link-active" : ""}`}>Contact</NavLink>
          </nav>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/property/:id" element={<PropertyDetailPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
    </div>
  );
}

export default App;
