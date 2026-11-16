import { useEffect, useState } from "react";
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend
} from "recharts";
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

function getMonthKey(value) {
    if (!value) return "";
    const match = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}` : "";
}

function getLastSixMonths() {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
        return {
            key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
            month: date.toLocaleDateString("en-US", { month: "short" }),
            present: 0,
            late: 0,
            absent: 0,
            leave: 0
        };
    });
}

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
    const [myAttendance, setMyAttendance] = useState([]);
    const [leaveBalances, setLeaveBalances] = useState([]);
    const [chartLoading, setChartLoading] = useState(true);
    const [chartError, setChartError] = useState("");

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

    // Load the authenticated employee's own attendance and leave balances.
    useEffect(() => {
        if (location.pathname !== "/employee-portal") return;

        let cancelled = false;

        const loadEmployeeCharts = async () => {
            setChartLoading(true);
            setChartError("");

            const year = new Date().getFullYear();

            try {
                const [attendanceResponse, balanceResponse] = await Promise.all([
                    api.get("/attendance/me"),
                    api.get("/leaves/me/balances", { params: { year } })
                ]);

                if (cancelled) return;

                setMyAttendance(
                    Array.isArray(attendanceResponse.data)
                        ? attendanceResponse.data
                        : []
                );
                setLeaveBalances(
                    Array.isArray(balanceResponse.data)
                        ? balanceResponse.data
                        : []
                );
            } catch (err) {
                if (!cancelled) {
                    console.error("Employee chart data error:", err.response?.data || err.message);
                    setChartError(
                        err.response?.data?.message ||
                        "Unable to load attendance and leave chart data."
                    );
                }
            } finally {
                if (!cancelled) setChartLoading(false);
            }
        };

        loadEmployeeCharts();

        return () => {
            cancelled = true;
        };
    }, [location.pathname]);

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

    const employeeMonthlyData = getLastSixMonths();
    const employeeMonthIndex = new Map(employeeMonthlyData.map((item, index) => [item.key, index]));

    myAttendance.forEach(record => {
        const index = employeeMonthIndex.get(getMonthKey(record.attendance_date));
        if (index === undefined) return;

        const status = String(record.status || "").toLowerCase();
        const isLate = Number(record.is_late) === 1 ||
            (record.check_in && String(record.check_in).slice(0, 5) > "08:30");

        if (status === "absent") employeeMonthlyData[index].absent += 1;
        else if (status === "leave") employeeMonthlyData[index].leave += 1;
        else if (["present", "late"].includes(status)) {
            if (isLate || status === "late") employeeMonthlyData[index].late += 1;
            else employeeMonthlyData[index].present += 1;
        }
    });

    const chartableLeaveBalances = leaveBalances.filter(
        item => (item.requires_balance === true || Number(item.requires_balance) === 1) &&
            item.remaining_days !== null &&
            item.remaining_days !== undefined
    ).map(item => ({
        leaveType: item.leave_type_name,
        remaining: Number(item.remaining_days || 0),
        used: Number(item.used_days || 0),
        pending: Number(item.pending_days || 0)
    }));

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

                            <div className="dashboard-chart-grid employee-dashboard-charts">
                                <div className="dashboard-chart-card dashboard-chart-card-wide">
                                    <div className="dashboard-chart-heading">
                                        <h2>My Monthly Attendance</h2>
                                        <p>Your attendance records over the last six months</p>
                                    </div>
                                    {chartLoading ? (
                                        <div className="dashboard-chart-state">Loading chart...</div>
                                    ) : (
                                        <div className="dashboard-chart">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={employeeMonthlyData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="present" name="Present" stackId="attendance" fill="#0d9488" />
                                                    <Bar dataKey="late" name="Late" stackId="attendance" fill="#f59e0b" />
                                                    <Bar dataKey="absent" name="Absent" stackId="attendance" fill="#e11d48" />
                                                    <Bar dataKey="leave" name="Leave" stackId="attendance" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>

                                <div className="dashboard-chart-card">
                                    <div className="dashboard-chart-heading">
                                        <h2>My Leave Balance</h2>
                                        <p>Remaining, used and pending days for {new Date().getFullYear()}</p>
                                    </div>
                                    {chartLoading ? (
                                        <div className="dashboard-chart-state">Loading chart...</div>
                                    ) : chartableLeaveBalances.length === 0 ? (
                                        <div className="dashboard-chart-state">No leave balances available.</div>
                                    ) : (
                                        <div className="dashboard-chart">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartableLeaveBalances} margin={{ top: 8, right: 12, left: -18, bottom: 22 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="leaveType" tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={55} />
                                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="remaining" name="Remaining" fill="#0d9488" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="used" name="Used" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {chartError && (
                                <div className="dashboard-error" role="alert">{chartError}</div>
                            )}

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