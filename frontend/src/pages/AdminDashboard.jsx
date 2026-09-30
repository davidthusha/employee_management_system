import { Link } from "react-router-dom";
import "../CSS/AdminDashboard.css";

function AdminDashboard() {

    const user = JSON.parse(
        localStorage.getItem("user")
    );

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "/";
    };

    return (
        <div className="dashboard">

            {/* Sidebar */}

            <aside className="sidebar">

                <div className="sidebar-logo">
                    Employee Management
                </div>

                <nav className="sidebar-menu">

                    <Link
                        to="/dashboard"
                        className="active"
                    >
                        Dashboard
                    </Link>

                    <Link to="/employees">
                        Employees
                    </Link>

                    <Link to="/departments">
                        Departments
                    </Link>

                    <Link to="/attendance">
                        Attendance
                    </Link>

                    <Link to="/reports">
                        Reports
                    </Link>

                </nav>

            </aside>

            {/* Main */}

            <main className="dashboard-main">

                <header className="dashboard-header">

                    <h2>Dashboard</h2>

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

                </section>

            </main>

        </div>
    );
}

export default AdminDashboard;