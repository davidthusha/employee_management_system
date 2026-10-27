
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    UsersRound,
    Building2,
    UserCheck,
    CalendarCheck
} from "lucide-react";
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

    const displayName =
        user?.display_name ||
        [user?.first_name, user?.last_name]
            .filter(name => typeof name === "string" && name.trim())
            .map(name => name.trim())
            .join(" ") ||
        (user?.role === "Admin" ? "Administrator" : user?.username) ||
        "User";

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
        "/admin-leave": "Leave Management",
        "/reports": "Reports"
    }[location.pathname] || "Dashboard";

    const isActive = path => location.pathname === path;

    // Load employee and department statistics.
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

                const employeeData = Array.isArray(employeeResponse.data)
                    ? employeeResponse.data
                    : [];

                const departmentData = Array.isArray(departmentResponse.data)
                    ? departmentResponse.data
                    : [];

                setEmployees(employeeData);
                setDepartmentCount(departmentData.length);
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

    // Load today's attendance using Sri Lanka local date.
    useEffect(() => {
        if (location.pathname !== "/dashboard") return;

        let cancelled = false;

        const fetchTodayAttendance = async () => {
            setAttendanceLoading(true);
            setAttendanceError("");

            try {
                const parts = new Intl.DateTimeFormat("en-CA", {
                    timeZone: "Asia/Colombo",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }).formatToParts(new Date());

                const dateParts = {};

                parts.forEach(part => {
                    if (part.type !== "literal") {
                        dateParts[part.type] = part.value;
                    }
                });

                const today =
                    `${dateParts.year}-${dateParts.month}-${dateParts.day}`;

                const response = await api.get("/attendance", {
                    params: { date: today }
                });

                if (cancelled) return;

                const records = Array.isArray(response.data)
                    ? response.data
                    : [];

                // Count unique employees who checked in.
                // Late arrivals count as present.
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
                        "Unable to load today's attendance."
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
                <Link to="/dashboard" className="sidebar-brand">
                    <img
                        src="/WorkMateLogo.png"
                        alt="WorkMate Logo"
                        className="sidebar-brand-logo"
                    />

                    <div className="sidebar-brand-text">
                        <span className="sidebar-brand-name">
                            WorkMate
                        </span>
                        <span className="sidebar-brand-subtitle">
                            Employee Management
                        </span>
                    </div>
                </Link>

                <nav className="sidebar-menu">
                    <Link
                        to="/dashboard"
                        className={isActive("/dashboard") ? "active" : ""}
                    >
                        <span className="nav-icon" aria-hidden="true">▦</span>
                        <span>Dashboard</span>
                    </Link>

                    <Link
                        to="/employees"
                        className={isActive("/employees") ? "active" : ""}
                    >
                        <span className="nav-icon" aria-hidden="true">♙</span>
                        <span>Employees</span>
                    </Link>

                    <Link
                        to="/departments"
                        className={isActive("/departments") ? "active" : ""}
                    >
                        <span className="nav-icon" aria-hidden="true">▤</span>
                        <span>Departments</span>
                    </Link>

                    <Link
                        to="/attendance"
                        className={isActive("/attendance") ? "active" : ""}
                    >
                        <span className="nav-icon" aria-hidden="true">◷</span>
                        <span>Attendance</span>
                    </Link>

                    <Link
                        to="/admin-leave"
                        className={isActive("/admin-leave") ? "active" : ""}
                    >
                        <span className="nav-icon" aria-hidden="true">▣</span>
                        <span>Leave Management</span>
                    </Link>

                    <Link
                        to="/reports"
                        className={isActive("/reports") ? "active" : ""}
                    >
                        <span className="nav-icon" aria-hidden="true">▥</span>
                        <span>Reports</span>
                    </Link>
                </nav>

                <div className="sidebar-footer">
                    <span className="sidebar-footer-dot" />
                    <span>WorkMate HR System</span>
                </div>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header">
                    <div className="header-page-info">
                        <span className="header-eyebrow">
                            WORKMATE WORKSPACE
                        </span>
                        <h2>{currentPage}</h2>
                    </div>

                    <div className="user-section">
                        <div className="user-avatar" aria-hidden="true">
                            {displayName.charAt(0).toUpperCase()}
                        </div>

                        <div className="user-details">
                            <span className="user-name">
                                {displayName}
                            </span>
                            <span className="user-role">
                                {user?.role || "User"}
                            </span>
                        </div>

                        <button
                            type="button"
                            className="logout-button"
                            onClick={logout}
                        >
                            <span aria-hidden="true">↪</span>
                            Logout
                        </button>
                    </div>
                </header>

                <section className="dashboard-content">
                    {children || (
                        <>
                            <div className="dashboard-welcome">
                                <div className="welcome-copy">
                                    <span className="welcome-label">
                                        YOUR WORKFORCE OVERVIEW
                                    </span>

                                    <h1>
                                        Welcome back,{" "}
                                        {displayName.split(" ")[0]}!
                                    </h1>

                                    <p>
                                        Here's what's happening with your
                                        workforce today.
                                    </p>
                                </div>

                                <div className="welcome-logo">
                                    <img
                                        src="/WorkMateLogo.png"
                                        alt=""
                                    />
                                </div>
                            </div>

                            {error && (
                                <div
                                    className="dashboard-error"
                                    role="alert"
                                >
                                    {error}
                                </div>
                            )}

                            <div className="dashboard-section-heading">
                                <div>
                                    <h2>Workforce Overview</h2>
                                    <p>
                                        Key employee and attendance
                                        information at a glance.
                                    </p>
                                </div>
                            </div>

                            <div className="dashboard-cards">
                                {/* Total employees */}
                                <div className="dashboard-card">
                                    <div className="dashboard-card-top">
                                        <div className="dashboard-card-icon employees-icon">
                                            <UsersRound
                                                aria-hidden="true"
                                                size={23}
                                                strokeWidth={2}
                                            />
                                        </div>

                                        <span className="card-label">
                                            EMPLOYEES
                                        </span>
                                    </div>

                                    <h3>Total Employees</h3>

                                    <p className="dashboard-card-value">
                                        {loading ? "..." : employees.length}
                                    </p>

                                    <span className="dashboard-card-note">
                                        All employee records
                                    </span>
                                </div>

                                {/* Departments */}
                                <div className="dashboard-card">
                                    <div className="dashboard-card-top">
                                        <div className="dashboard-card-icon departments-icon">
                                            <Building2
                                                aria-hidden="true"
                                                size={23}
                                                strokeWidth={2}
                                            />
                                        </div>

                                        <span className="card-label">
                                            ORGANISATION
                                        </span>
                                    </div>

                                    <h3>Departments</h3>

                                    <p className="dashboard-card-value">
                                        {loading ? "..." : departmentCount}
                                    </p>

                                    <span className="dashboard-card-note">
                                        Registered departments
                                    </span>
                                </div>

                                {/* Active employees */}
                                <div className="dashboard-card">
                                    <div className="dashboard-card-top">
                                        <div className="dashboard-card-icon active-icon">
                                            <UserCheck
                                                aria-hidden="true"
                                                size={25}
                                                strokeWidth={2}
                                            />
                                        </div>

                                        <span className="card-label">
                                            CURRENT STATUS
                                        </span>
                                    </div>

                                    <h3>Active Employees</h3>

                                    <p className="dashboard-card-value">
                                        {loading ? "..." : activeEmployees}
                                    </p>

                                    <span className="dashboard-card-note">
                                        Employees with active status
                                    </span>
                                </div>

                                {/* Today's attendance */}
                                <div className="dashboard-card">
                                    <div className="dashboard-card-top">
                                        <div className="dashboard-card-icon attendance-icon">
                                            <CalendarCheck
                                                aria-hidden="true"
                                                size={23}
                                                strokeWidth={2}
                                            />
                                        </div>

                                        <span className="card-label">
                                            TODAY
                                        </span>
                                    </div>

                                    <h3>Today's Attendance</h3>

                                    <p className="dashboard-card-value">
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
                                            The latest employee records in
                                            your system.
                                        </p>
                                    </div>

                                    <Link
                                        to="/employees"
                                        className="dashboard-view-all"
                                    >
                                        View All
                                        <span aria-hidden="true"> →</span>
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
                                                    <tr
                                                        key={employee.employee_id}
                                                    >
                                                        <td>
                                                            <div className="dashboard-employee">
                                                                <div
                                                                    className="employee-avatar"
                                                                    aria-hidden="true"
                                                                >
                                                                    {(
                                                                        employee.first_name ||
                                                                        "?"
                                                                    ).charAt(0).toUpperCase()}
                                                                </div>

                                                                <div className="employee-info">
                                                                    <strong>
                                                                        {employee.first_name}{" "}
                                                                        {employee.last_name}
                                                                    </strong>

                                                                    <span>
                                                                        {employee.employee_code}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            {employee.department_name ||
                                                                "Unassigned"}
                                                        </td>

                                                        <td>
                                                            {employee.job_title ||
                                                                "—"}
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
