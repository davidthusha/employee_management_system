
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../CSS/AdminDashboard.css";

function AdminDashboard({ children }) {
    const location = useLocation();
    const navigate = useNavigate();

    let user = {};

    try {
        user = JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        user = {};
    }

    const [employees, setEmployees] = useState([]);
    const [departmentCount, setDepartmentCount] = useState(0);
    const [todayAttendance, setTodayAttendance] = useState(0);

    const [loading, setLoading] = useState(true);
    const [attendanceLoading, setAttendanceLoading] = useState(true);
    const [error, setError] = useState("");
    const [attendanceError, setAttendanceError] = useState("");

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/", { replace: true });
    };

    const currentPage = {
        "/dashboard": "Dashboard",
        "/employees": "Employees",
        "/departments": "Departments",
        "/attendance": "Attendance",
        "/reports": "Reports"
    }[location.pathname] || "Dashboard";

    // Load employee and department statistics for the dashboard.
    useEffect(() => {
        if (location.pathname !== "/dashboard") return;

        let cancelled = false;

        const fetchDashboardData = async () => {
            setLoading(true);
            setError("");

            try {
                const [employeeResponse, departmentResponse] =
                    await Promise.all([
                        api.get("/employees"),
                        api.get("/departments")
                    ]);

                if (cancelled) return;

                setEmployees(
                    Array.isArray(employeeResponse.data)
                        ? employeeResponse.data
                        : []
                );

                setDepartmentCount(
                    Array.isArray(departmentResponse.data)
                        ? departmentResponse.data.length
                        : 0
                );
            } catch (err) {
                if (!cancelled) {
                    console.error(
                        "Dashboard data error:",
                        err.response?.data || err.message
                    );

                    setError(
                        err.response?.data?.message ||
                        "Unable to load dashboard data. Please try again."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchDashboardData();

        return () => {
            cancelled = true;
        };
    }, [location.pathname]);

    // Load today's attendance using Sri Lanka's local date.
    useEffect(() => {
        if (location.pathname !== "/dashboard") return;

        let cancelled = false;

        const fetchTodayAttendance = async () => {
            setAttendanceLoading(true);
            setAttendanceError("");

            try {
                const today = new Intl.DateTimeFormat("en-CA", {
                    timeZone: "Asia/Colombo",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }).format(new Date());

                const response = await api.get("/attendance", {
                    params: { date: today }
                });

                if (cancelled) return;

                const records = Array.isArray(response.data)
                    ? response.data
                    : [];

                // Count unique employees who checked in today.
                // Late arrivals count as present too.
                const employeeIdsPresent = new Set(
                    records
                        .filter(record => {
                            const status = String(
                                record.status || ""
                            ).toLowerCase();

                            return (
                                Boolean(record.check_in) &&
                                ["present", "late"].includes(status)
                            );
                        })
                        .map(record => record.employee_id)
                        .filter(id => id !== null && id !== undefined)
                );

                setTodayAttendance(employeeIdsPresent.size);
            } catch (err) {
                if (!cancelled) {
                    console.error(
                        "Today's attendance error:",
                        err.response?.status,
                        err.response?.data || err.message
                    );

                    setAttendanceError(
                        err.response?.data?.message ||
                        "Unable to load today's attendance"
                    );
                }
            } finally {
                if (!cancelled) {
                    setAttendanceLoading(false);
                }
            }
        };

        fetchTodayAttendance();

        return () => {
            cancelled = true;
        };
    }, [location.pathname]);

    const activeEmployees = employees.filter(
        employee =>
            String(employee.status || "").toLowerCase() === "active"
    ).length;

    const recentEmployees = employees.slice(0, 5);

    return (
        <div className="dashboard">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    Employee Management
                </div>

                <nav className="sidebar-menu">
                    <Link
                        to="/dashboard"
                        className={
                            location.pathname === "/dashboard" ? "active" : ""
                        }
                    >
                        Dashboard
                    </Link>

                    <Link
                        to="/employees"
                        className={
                            location.pathname === "/employees" ? "active" : ""
                        }
                    >
                        Employees
                    </Link>

                    <Link
                        to="/departments"
                        className={
                            location.pathname === "/departments" ? "active" : ""
                        }
                    >
                        Departments
                    </Link>

                    <Link
                        to="/attendance"
                        className={
                            location.pathname === "/attendance" ? "active" : ""
                        }
                    >
                        Attendance
                    </Link>

                    <Link
                        to="/reports"
                        className={
                            location.pathname === "/reports" ? "active" : ""
                        }
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
                            {user?.username || "Admin"}
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
                    {children || (
                        <>
                            <div className="dashboard-welcome">
                                <div>
                                    <h1>Welcome to the Dashboard</h1>
                                    <p>
                                        Here's an overview of your workforce.
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
                                        <span aria-hidden="true">👥</span>
                                    </div>

                                    <h3>Total Employees</h3>

                                    <p>{loading ? "..." : employees.length}</p>

                                    <span className="dashboard-card-note">
                                        All employee records
                                    </span>
                                </div>

                                <div className="dashboard-card">
                                    <div className="dashboard-card-icon departments-icon">
                                        <span aria-hidden="true">🏢</span>
                                    </div>

                                    <h3>Departments</h3>

                                    <p>{loading ? "..." : departmentCount}</p>

                                    <span className="dashboard-card-note">
                                        Registered departments
                                    </span>
                                </div>

                                <div className="dashboard-card">
                                    <div className="dashboard-card-icon active-icon">
                                        <span aria-hidden="true">✓</span>
                                    </div>

                                    <h3>Active Employees</h3>

                                    <p>{loading ? "..." : activeEmployees}</p>

                                    <span className="dashboard-card-note">
                                        Employees with active status
                                    </span>
                                </div>

                                <div className="dashboard-card">
                                    <div className="dashboard-card-icon attendance-icon">
                                        <span aria-hidden="true">👥</span>
                                    </div>

                                    <h3>Today's Attendance</h3>

                                    <p>
                                        {attendanceLoading
                                            ? "..."
                                            : attendanceError
                                                ? "—"
                                                : todayAttendance}
                                    </p>

                                    <span className="dashboard-card-note">
                                        {attendanceError ||
                                            "Employees who checked in today, including late arrivals"}
                                    </span>
                                </div>
                            </div>

                            <div className="dashboard-recent">
                                <div className="dashboard-section-header">
                                    <div>
                                        <h2>Recent Employees</h2>
                                        <p>
                                            The latest employee records in your
                                            system.
                                        </p>
                                    </div>

                                    <Link
                                        to="/employees"
                                        className="dashboard-view-all"
                                    >
                                        View All →
                                    </Link>
                                </div>

                                <div className="dashboard-table-container">
                                    <table className="dashboard-table">
                                        <thead>
                                            <tr>
                                                <th>Employee</th>
                                                <th>Department</th>
                                                <th>Job Title</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td
                                                        colSpan="4"
                                                        className="dashboard-empty"
                                                    >
                                                        Loading employees...
                                                    </td>
                                                </tr>
                                            ) : employees.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan="4"
                                                        className="dashboard-empty"
                                                    >
                                                        No employees found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                recentEmployees.map(employee => (
                                                    <tr key={employee.employee_id}>
                                                        <td>
                                                            <div className="dashboard-employee">
                                                                <strong>
                                                                    {employee.first_name}{" "}
                                                                    {employee.last_name}
                                                                </strong>

                                                                <span>
                                                                    {employee.employee_code}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            {employee.department_name ||
                                                                "Unassigned"}
                                                        </td>

                                                        <td>
                                                            {employee.job_title || "—"}
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`dashboard-status ${
                                                                    String(
                                                                        employee.status || ""
                                                                    ).toLowerCase() === "active"
                                                                        ? "is-active"
                                                                        : "is-inactive"
                                                                }`}
                                                            >
                                                                {employee.status ||
                                                                    "Unknown"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
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
