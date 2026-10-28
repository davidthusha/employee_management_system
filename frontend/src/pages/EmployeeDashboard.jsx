
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    UserRound,
    CalendarCheck,
    CalendarDays,
    IdCard,
    Building2,
    BadgeCheck,
    BriefcaseBusiness,
    LogOut
} from "lucide-react";

import api from "../services/api";
import "../CSS/AdminDashboard.css";

function getDisplayName(user, employee) {
    const employeeName = [
        employee?.first_name,
        employee?.last_name
    ].filter(Boolean).join(" ");

    const userName = [
        user?.first_name,
        user?.last_name
    ].filter(Boolean).join(" ");

    return (
        employeeName ||
        user?.display_name ||
        userName ||
        user?.username ||
        "Employee"
    );
}

function EmployeeDashboard({ children }) {
    const location = useLocation();
    const navigate = useNavigate();

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

    useEffect(() => {
        let cancelled = false;

        async function loadEmployee() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get("/employees/me");

                if (!cancelled) {
                    setEmployee(response.data);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error(
                        "Employee dashboard error:",
                        err.response?.data || err.message
                    );

                    setError(
                        err.response?.data?.message ||
                        "Unable to load your employee details."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        try {
            setUser(JSON.parse(localStorage.getItem("user") || "{}"));
        } catch {
            setUser({});
        }

        loadEmployee();

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

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/", { replace: true });
    };

    const navigationItems = [
        {
            label: "Dashboard",
            path: "/employee-portal",
            Icon: LayoutDashboard
        },
        {
            label: "My Profile",
            path: "/employee-profile",
            Icon: UserRound
        },
        {
            label: "My Attendance",
            path: "/employee-attendance",
            Icon: CalendarCheck
        },
        {
            label: "Leave Management",
            path: "/employee-leave",
            Icon: CalendarDays
        }
    ];

    const activeEmployees = String(employee?.status || "").toLowerCase();

    return (
        <div className="dashboard employee-shared-layout">
            <aside className="sidebar">
                <Link to="/employee-portal" className="sidebar-brand">
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
                    {navigationItems.map(({ label, path, Icon }) => (
                        <Link
                            key={path}
                            to={path}
                            className={
                                location.pathname === path ? "active" : ""
                            }
                        >
                            <span className="nav-icon" aria-hidden="true">
                                <Icon size={18} strokeWidth={1.9} />
                            </span>
                            <span>{label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <span className="sidebar-footer-dot" />
                    <span>WorkMate Employee Portal</span>
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
                            {employeeName.charAt(0).toUpperCase()}
                        </div>

                        <div className="user-details">
                            <span className="user-name">
                                {employeeName}
                            </span>
                            <span className="user-role">Employee</span>
                        </div>

                        <button
                            type="button"
                            className="logout-button"
                            onClick={logout}
                        >
                            <LogOut size={15} aria-hidden="true" />
                            Logout
                        </button>
                    </div>
                </header>

                <section className="dashboard-content">
                    {children ? (
                        children
                    ) : (
                        <>
                            <div className="dashboard-welcome">
                                <div className="welcome-copy">
                                    <span className="welcome-label">
                                        YOUR WORKSPACE
                                    </span>
                                    <h1>Welcome, {employeeName}!</h1>
                                    <p>
                                        View your employee information and
                                        access your services here.
                                    </p>
                                </div>

                                <div className="welcome-logo">
                                    <img
                                        src="/WorkMateLogo.png"
                                        alt="WorkMate"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="dashboard-error" role="alert">
                                    {error}
                                </div>
                            )}

                            <div className="dashboard-section-heading">
                                <h2>My Overview</h2>
                                <p>
                                    Your employee information at a glance.
                                </p>
                            </div>

                            <div className="dashboard-cards employee-overview-cards">
                                <div className="dashboard-card">
                                    <div className="dashboard-card-icon employees-icon">
                                        <IdCard size={23} strokeWidth={2} />
                                    </div>
                                    <h3>Employee ID</h3>
                                    <p className="employee-overview-value">
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
                                        <Building2 size={23} strokeWidth={2} />
                                    </div>
                                    <h3>Department</h3>
                                    <p className="employee-overview-value">
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
                                        <BadgeCheck size={23} strokeWidth={2} />
                                    </div>
                                    <h3>Employment Status</h3>
                                    <p className="employee-overview-value">
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
                                        <BriefcaseBusiness
                                            size={23}
                                            strokeWidth={2}
                                        />
                                    </div>
                                    <h3>Job Title</h3>
                                    <p className="employee-overview-value">
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
                                                <td>{employeeName}</td>
                                            </tr>
                                            <tr>
                                                <th>Employee Code</th>
                                                <td>
                                                    {employee?.employee_code || "—"}
                                                </td>
                                            </tr>
                                            <tr>
                                                <th>Username</th>
                                                <td>{user.username || "—"}</td>
                                            </tr>
                                            <tr>
                                                <th>Department</th>
                                                <td>
                                                    {employee?.department_name ||
                                                        "Unassigned"}
                                                </td>
                                            </tr>
                                            <tr>
                                                <th>Job Title</th>
                                                <td>
                                                    {employee?.job_title || "—"}
                                                </td>
                                            </tr>
                                            <tr>
                                                <th>Employment Status</th>
                                                <td>
                                                    {employee?.status || "—"}
                                                </td>
                                            </tr>
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

export default EmployeeDashboard;
