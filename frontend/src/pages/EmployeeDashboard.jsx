import { useNavigate, useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../services/api";
import "../CSS/AdminDashboard.css";

function getDisplayName(user, employee) {
    const employeeFullName = [
        employee?.first_name,
        employee?.last_name
    ]
        .filter(name => typeof name === "string" && name.trim())
        .map(name => name.trim())
        .join(" ");

    const userFullName = [
        user?.first_name,
        user?.last_name
    ]
        .filter(name => typeof name === "string" && name.trim())
        .map(name => name.trim())
        .join(" ");

    return (
        employeeFullName ||
        user?.display_name ||
        userFullName ||
        user?.username ||
        "Employee"
    );
}

function EmployeeDashboard() {
    const navigate = useNavigate();
    const location = useLocation();

    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "{}");
        } catch {
            return {};
        }
    });

    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/", { replace: true });
    };

    useEffect(() => {
        let cancelled = false;

        const loadEmployeeData = async () => {
            setLoading(true);
            setError("");

            try {
                // The backend derives the employee ID from the JWT.
                const response = await api.get("/employees/me");

                if (cancelled) return;

                setEmployee(response.data);
            } catch (err) {
                if (cancelled) return;

                console.error(
                    "Employee dashboard error:",
                    err.response?.status,
                    err.response?.data || err.message
                );

                setError(
                    err.response?.data?.message ||
                    "Unable to load your employee details. Please try again."
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadEmployeeData();

        return () => {
            cancelled = true;
        };
    }, []);

    const employeeName = getDisplayName(user, employee);

    const currentPage = {
        "/employee-portal": "Dashboard",
        "/employee-profile": "My Profile",
        "/employee-attendance": "My Attendance",
        "/employee-leave": "Leave Management"
    }[location.pathname] || "Dashboard";

    return (
        <div className="dashboard">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    Employee Management
                </div>

                <nav className="sidebar-menu">
                    <Link
                        to="/employee-portal"
                        className={
                            location.pathname === "/employee-portal"
                                ? "active"
                                : ""
                        }
                    >
                        Dashboard
                    </Link>

                    <Link
                        to="/employee-profile"
                        className={
                            location.pathname === "/employee-profile"
                                ? "active"
                                : ""
                        }
                    >
                        My Profile
                    </Link>

                    <Link
                        to="/employee-attendance"
                        className={
                            location.pathname === "/employee-attendance"
                                ? "active"
                                : ""
                        }
                    >
                        My Attendance
                    </Link>

                    <Link
                        to="/employee-leave"
                        className={
                            location.pathname === "/employee-leave"
                                ? "active"
                                : ""
                        }
                    >
                        Leave Management
                    </Link>
                </nav>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h2>{currentPage}</h2>

                    <div className="user-section">
                        <span className="user-name">
                            {employeeName}
                        </span>

                        <button
                            type="button"
                            className="logout-button"
                            onClick={logout}
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <section className="dashboard-content">
                    <div className="dashboard-welcome">
                        <div>
                            <h1>Welcome, {employeeName}!</h1>
                            <p>
                                View your employee information and access
                                your services here.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="dashboard-error" role="alert">
                            {error}
                        </div>
                    )}

                    <div className="dashboard-cards">
                        <div className="dashboard-card">
                            <div className="dashboard-card-icon employees-icon">
                                <span aria-hidden="true">👤</span>
                            </div>

                            <h3>Employee ID</h3>

                            <p style={{ fontSize: "24px" }}>
                                {loading
                                    ? "..."
                                    : employee?.employee_code || "—"}
                            </p>

                            <span className="dashboard-card-note">
                                Your employee identification
                            </span>
                        </div>

                        <div className="dashboard-card">
                            <div className="dashboard-card-icon departments-icon">
                                <span aria-hidden="true">🏢</span>
                            </div>

                            <h3>Department</h3>

                            <p style={{ fontSize: "22px" }}>
                                {loading
                                    ? "..."
                                    : employee?.department_name || "—"}
                            </p>

                            <span className="dashboard-card-note">
                                Your assigned department
                            </span>
                        </div>

                        <div className="dashboard-card">
                            <div className="dashboard-card-icon active-icon">
                                <span aria-hidden="true">✓</span>
                            </div>

                            <h3>Employment Status</h3>

                            <p style={{ fontSize: "22px" }}>
                                {loading
                                    ? "..."
                                    : employee?.status || "—"}
                            </p>

                            <span className="dashboard-card-note">
                                Your current employment status
                            </span>
                        </div>

                        <div className="dashboard-card">
                            <div className="dashboard-card-icon job-title-icon">
                                <span aria-hidden="true">💼</span>
                            </div>

                            <h3>Job Title</h3>

                            <p style={{ fontSize: "22px" }}>
                                {loading
                                    ? "..."
                                    : employee?.job_title || "—"}
                            </p>

                            <span className="dashboard-card-note">
                                Your current position
                            </span>
                        </div>
                    </div>

                    <div className="dashboard-recent">
                        <div className="dashboard-section-header">
                            <div>
                                <h2>My Account</h2>
                                <p>
                                    Your employee account information.
                                </p>
                            </div>

                            <Link
                                to="/employee-profile"
                                className="dashboard-view-all"
                            >
                                View Profile →
                            </Link>
                        </div>

                        <div className="dashboard-table-container">
                            <table className="dashboard-table">
                                <tbody>
                                    <tr>
                                        <th>Full Name</th>
                                        <td>
                                            {loading
                                                ? "Loading..."
                                                : employeeName}
                                        </td>
                                    </tr>

                                    <tr>
                                        <th>Employee Code</th>
                                        <td>
                                            {loading
                                                ? "Loading..."
                                                : employee?.employee_code || "—"}
                                        </td>
                                    </tr>

                                    <tr>
                                        <th>Username</th>
                                        <td>{user.username || "—"}</td>
                                    </tr>

                                    <tr>
                                        <th>Department</th>
                                        <td>
                                            {loading
                                                ? "Loading..."
                                                : employee?.department_name || "Unassigned"}
                                        </td>
                                    </tr>

                                    <tr>
                                        <th>Job Title</th>
                                        <td>
                                            {loading
                                                ? "Loading..."
                                                : employee?.job_title || "—"}
                                        </td>
                                    </tr>

                                    <tr>
                                        <th>Employment Status</th>
                                        <td>
                                            {loading
                                                ? "Loading..."
                                                : employee?.status || "—"}
                                        </td>
                                    </tr>

                                    <tr>
                                        <th>Role</th>
                                        <td>{user.role || "Employee"}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default EmployeeDashboard;