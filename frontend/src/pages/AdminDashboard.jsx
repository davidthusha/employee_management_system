
import { Link, useLocation } from "react-router-dom";
import "../CSS/AdminDashboard.css";

function AdminDashboard({ children }) {
    const user = JSON.parse(localStorage.getItem("user"));
    const location = useLocation();

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
    };

    const currentPage = {
        "/dashboard": "Dashboard",
        "/employees": "Employees",
        "/departments": "Departments",
        "/attendance": "Attendance",
        "/reports": "Reports"
    }[location.pathname] || "Dashboard";

    return (
        <div className="dashboard">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    Employee Management
                </div>

                <nav className="sidebar-menu">
                    <Link
                        to="/dashboard"
                        className={location.pathname === "/dashboard" ? "active" : ""}
                    >
                        Dashboard
                    </Link>

                    <Link
                        to="/employees"
                        className={location.pathname === "/employees" ? "active" : ""}
                    >
                        Employees
                    </Link>

                    <Link
                        to="/departments"
                        className={location.pathname === "/departments" ? "active" : ""}
                    >
                        Departments
                    </Link>

                    <Link
                        to="/attendance"
                        className={location.pathname === "/attendance" ? "active" : ""}
                    >
                        Attendance
                    </Link>

                    <Link
                        to="/reports"
                        className={location.pathname === "/reports" ? "active" : ""}
                    >
                        Reports
                    </Link>
                </nav>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h2>{currentPage}</h2>

                    <div className="user-section">
                        <span className="user-name">
                            {user?.username}
                        </span>

                        <button
                            className="logout-button"
                            onClick={logout}
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <section className="dashboard-content">
                    {children || (
                        <>
                            <h1>Welcome to the Dashboard</h1>

                            <div className="dashboard-cards">
                                <div className="dashboard-card">
                                    <h3>Total Employees</h3>
                                    <p>0</p>
                                </div>

                                <div className="dashboard-card">
                                    <h3>Departments</h3>
                                    <p>0</p>
                                </div>

                                <div className="dashboard-card">
                                    <h3>Today's Attendance</h3>
                                    <p>0</p>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}

export default AdminDashboard;
