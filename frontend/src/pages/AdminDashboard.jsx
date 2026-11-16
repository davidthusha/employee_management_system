
import { useEffect, useState } from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    UsersRound,
    Building2,
    Clock,
    CalendarDays,
    ChartNoAxesColumn,
    UserCheck,
    CalendarCheck
} from "lucide-react";
import api from "../services/api";
import "../CSS/AdminDashboard.css";

const CHART_COLORS = [
    "#4f46e5",
    "#0d9488",
    "#f59e0b",
    "#e11d48",
    "#8b5cf6",
    "#64748b"
];

function getMonthKey(value) {
    if (!value) return "";

    const match = String(value)
        .slice(0, 10)
        .match(/^(\d{4})-(\d{2})/);

    return match ? `${match[1]}-${match[2]}` : "";
}

function getLastSixMonths() {
    const now = new Date();

    return Array.from({ length: 6 }, (_, index) => {
        const date = new Date(
            now.getFullYear(),
            now.getMonth() - (5 - index),
            1
        );

        return {
            key: `${date.getFullYear()}-${String(
                date.getMonth() + 1
            ).padStart(2, "0")}`,
            month: date.toLocaleDateString("en-US", {
                month: "short"
            }),
            present: 0,
            late: 0,
            absent: 0,
            leave: 0
        };
    });
}

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

    const [monthlyAttendanceRecords, setMonthlyAttendanceRecords] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);

    const [loading, setLoading] = useState(true);
    const [attendanceLoading, setAttendanceLoading] = useState(true);
    const [chartsLoading, setChartsLoading] = useState(true);

    const [error, setError] = useState("");
    const [attendanceError, setAttendanceError] = useState("");
    const [chartsError, setChartsError] = useState("");

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

    // Load attendance and leave records for dashboard charts.
    useEffect(() => {
        if (location.pathname !== "/dashboard") return;

        let cancelled = false;

        const loadChartData = async () => {
            setChartsLoading(true);
            setChartsError("");

            try {
                const [attendanceResponse, leaveResponse] =
                    await Promise.all([
                        api.get("/attendance"),
                        api.get("/leaves/requests")
                    ]);

                if (cancelled) return;

                setMonthlyAttendanceRecords(
                    Array.isArray(attendanceResponse.data)
                        ? attendanceResponse.data
                        : []
                );

                setLeaveRequests(
                    Array.isArray(leaveResponse.data)
                        ? leaveResponse.data
                        : []
                );
            } catch (err) {
                if (!cancelled) {
                    console.error(
                        "Dashboard chart data error:",
                        err.response?.data || err.message
                    );

                    setChartsError(
                        err.response?.data?.message ||
                        "Some dashboard charts could not be loaded."
                    );
                }
            } finally {
                if (!cancelled) {
                    setChartsLoading(false);
                }
            }
        };

        loadChartData();

        return () => {
            cancelled = true;
        };
    }, [location.pathname]);

    // Dashboard summary calculations.
    const activeEmployees = employees.filter(
        employee =>
            String(employee.status || "").toLowerCase() === "active"
    ).length;

    const recentEmployees = employees.slice(0, 5);

    // 1. Department Distribution Chart.
    const departmentChartData = Object.entries(
        employees.reduce((counts, employee) => {
            const name = employee.department_name || "Unassigned";

            counts[name] = (counts[name] || 0) + 1;

            return counts;
        }, {})
    ).map(([name, employeesCount]) => ({
        name,
        employees: employeesCount
    }));

    // 2. Monthly Attendance Chart.
    const monthlyChartData = getLastSixMonths();

    const monthIndex = new Map(
        monthlyChartData.map((item, index) => [item.key, index])
    );

    monthlyAttendanceRecords.forEach(record => {
        const index = monthIndex.get(
            getMonthKey(record.attendance_date)
        );

        if (index === undefined) return;

        const status = String(record.status || "").toLowerCase();

        const isLate =
            Number(record.is_late) === 1 ||
            (
                record.check_in &&
                String(record.check_in).slice(0, 5) > "08:30"
            );

        if (status === "absent") {
            monthlyChartData[index].absent += 1;
        } else if (status === "leave") {
            monthlyChartData[index].leave += 1;
        } else if (["present", "late"].includes(status)) {
            if (isLate || status === "late") {
                monthlyChartData[index].late += 1;
            } else {
                monthlyChartData[index].present += 1;
            }
        }
    });

    // 3. Leave Statistics Chart.
    const leaveStatusCounts = leaveRequests.reduce((counts, request) => {
        const status = String(request.status || "Unknown");

        counts[status] = (counts[status] || 0) + 1;

        return counts;
    }, {});

    const leaveChartData = Object.entries(leaveStatusCounts).map(
        ([name, value]) => ({
            name,
            value
        })
    );

    // 4. Employee Status Distribution Chart.
    const employeeStatusCounts = employees.reduce((counts, employee) => {
        const rawStatus = employee.status || "Unknown";

        const formattedStatus = String(rawStatus)
            .trim()
            .toLowerCase()
            .replace(/\b\w/g, char => char.toUpperCase());

        counts[formattedStatus] = (counts[formattedStatus] || 0) + 1;

        return counts;
    }, {});

    const employeeStatusChartData = Object.entries(
        employeeStatusCounts
    ).map(([name, value]) => ({
        name,
        value
    }));

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
                        <span className="nav-icon" aria-hidden="true">
                            <LayoutDashboard size={18} />
                        </span>
                        <span>Dashboard</span>
                    </Link>

                    <Link
                        to="/employees"
                        className={isActive("/employees") ? "active" : ""}
                    >
                        <span className="nav-icon" aria-hidden="true">
                            <UsersRound size={18} />
                        </span>
                        <span>Employees</span>
                    </Link>

                    <Link
                        to="/departments"
                        className={isActive("/departments") ? "active" : ""}
                    >
                        <span className="nav-icon" aria-hidden="true">
                            <Building2 size={18} />
                        </span>
                        <span>Departments</span>
                    </Link>

                    <Link
                        to="/attendance"
                        className={isActive("/attendance") ? "active" : ""}
                    >
                        <span className="nav-icon" aria-hidden="true">
                            <Clock size={18} />
                        </span>
                        <span>Attendance</span>
                    </Link>

                    <Link
                        to="/admin-leave"
                        className={isActive("/admin-leave") ? "active" : ""}
                    >
                        <span className="nav-icon" aria-hidden="true">
                            <CalendarDays size={18} />
                        </span>
                        <span>Leave Management</span>
                    </Link>

                    <Link
                        to="/reports"
                        className={isActive("/reports") ? "active" : ""}
                    >
                        <span className="nav-icon" aria-hidden="true">
                            <ChartNoAxesColumn size={18} />
                        </span>
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
                                {/* Total Employees */}
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

                                {/* Active Employees */}
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

                                {/* Today's Attendance */}
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

                            {/* =====================================
                                DASHBOARD CHARTS
                            ====================================== */}

                            <div className="dashboard-chart-grid">

                                {/* 1. Department Distribution */}
                                <div className="dashboard-chart-card">
                                    <div className="dashboard-chart-heading">
                                        <h2>Department Distribution</h2>
                                        <p>
                                            Employees grouped by department
                                        </p>
                                    </div>

                                    {(loading || chartsLoading) ? (
                                        <div className="dashboard-chart-state">
                                            Loading chart...
                                        </div>
                                    ) : departmentChartData.length === 0 ? (
                                        <div className="dashboard-chart-state">
                                            No department data available.
                                        </div>
                                    ) : (
                                        <div className="dashboard-chart">
                                            <ResponsiveContainer
                                                width="100%"
                                                height="100%"
                                            >
                                                <PieChart>
                                                    <Pie
                                                        data={departmentChartData}
                                                        dataKey="employees"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="48%"
                                                        innerRadius={55}
                                                        outerRadius={90}
                                                        paddingAngle={3}
                                                    >
                                                        {departmentChartData.map(
                                                            (entry, index) => (
                                                                <Cell
                                                                    key={entry.name}
                                                                    fill={
                                                                        CHART_COLORS[
                                                                            index %
                                                                            CHART_COLORS.length
                                                                        ]
                                                                    }
                                                                />
                                                            )
                                                        )}
                                                    </Pie>

                                                    <Tooltip />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Monthly Attendance */}
                                <div className="dashboard-chart-card dashboard-chart-card-wide">
                                    <div className="dashboard-chart-heading">
                                        <h2>Monthly Attendance</h2>
                                        <p>
                                            Attendance records over the last
                                            six months
                                        </p>
                                    </div>

                                    {chartsLoading ? (
                                        <div className="dashboard-chart-state">
                                            Loading chart...
                                        </div>
                                    ) : (
                                        <div className="dashboard-chart">
                                            <ResponsiveContainer
                                                width="100%"
                                                height="100%"
                                            >
                                                <BarChart
                                                    data={monthlyChartData}
                                                    margin={{
                                                        top: 8,
                                                        right: 12,
                                                        left: -18,
                                                        bottom: 0
                                                    }}
                                                >
                                                    <CartesianGrid
                                                        strokeDasharray="3 3"
                                                        vertical={false}
                                                    />

                                                    <XAxis
                                                        dataKey="month"
                                                        tickLine={false}
                                                        axisLine={false}
                                                    />

                                                    <YAxis
                                                        allowDecimals={false}
                                                        tickLine={false}
                                                        axisLine={false}
                                                    />

                                                    <Tooltip />
                                                    <Legend />

                                                    <Bar
                                                        dataKey="present"
                                                        name="Present"
                                                        stackId="attendance"
                                                        fill="#0d9488"
                                                    />

                                                    <Bar
                                                        dataKey="late"
                                                        name="Late"
                                                        stackId="attendance"
                                                        fill="#f59e0b"
                                                    />

                                                    <Bar
                                                        dataKey="absent"
                                                        name="Absent"
                                                        stackId="attendance"
                                                        fill="#e11d48"
                                                    />

                                                    <Bar
                                                        dataKey="leave"
                                                        name="Leave"
                                                        stackId="attendance"
                                                        fill="#6366f1"
                                                        radius={[4, 4, 0, 0]}
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>

                                {/* 3. Leave Statistics */}
                                <div className="dashboard-chart-card">
                                    <div className="dashboard-chart-heading">
                                        <h2>Leave Statistics</h2>
                                        <p>
                                            Requests by current status
                                        </p>
                                    </div>

                                    {chartsLoading ? (
                                        <div className="dashboard-chart-state">
                                            Loading chart...
                                        </div>
                                    ) : leaveChartData.length === 0 ? (
                                        <div className="dashboard-chart-state">
                                            No leave requests available.
                                        </div>
                                    ) : (
                                        <div className="dashboard-chart">
                                            <ResponsiveContainer
                                                width="100%"
                                                height="100%"
                                            >
                                                <PieChart>
                                                    <Pie
                                                        data={leaveChartData}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="48%"
                                                        outerRadius={88}
                                                        label
                                                    >
                                                        {leaveChartData.map(
                                                            (entry, index) => (
                                                                <Cell
                                                                    key={entry.name}
                                                                    fill={
                                                                        CHART_COLORS[
                                                                            index %
                                                                            CHART_COLORS.length
                                                                        ]
                                                                    }
                                                                />
                                                            )
                                                        )}
                                                    </Pie>

                                                    <Tooltip />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>

                                {/* 4. Employee Status Distribution */}
                                <div className="dashboard-chart-card">
                                    <div className="dashboard-chart-heading">
                                        <h2>Employee Status Distribution</h2>
                                        <p>
                                            Employees grouped by employment
                                            status
                                        </p>
                                    </div>

                                    {loading ? (
                                        <div className="dashboard-chart-state">
                                            Loading chart...
                                        </div>
                                    ) : employeeStatusChartData.length === 0 ? (
                                        <div className="dashboard-chart-state">
                                            No employee status data available.
                                        </div>
                                    ) : (
                                        <div className="dashboard-chart">
                                            <ResponsiveContainer
                                                width="100%"
                                                height="100%"
                                            >
                                                <PieChart>
                                                    <Pie
                                                        data={employeeStatusChartData}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="48%"
                                                        innerRadius={55}
                                                        outerRadius={90}
                                                        paddingAngle={3}
                                                    >
                                                        {employeeStatusChartData.map(
                                                            (entry, index) => (
                                                                <Cell
                                                                    key={entry.name}
                                                                    fill={
                                                                        CHART_COLORS[
                                                                            index %
                                                                            CHART_COLORS.length
                                                                        ]
                                                                    }
                                                                />
                                                            )
                                                        )}
                                                    </Pie>

                                                    <Tooltip />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {chartsError && (
                                <div
                                    className="dashboard-error"
                                    role="alert"
                                >
                                    {chartsError}
                                </div>
                            )}

                            {/* Recent Employees */}
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
                                                                    )
                                                                        .charAt(0)
                                                                        .toUpperCase()}
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
                                                                    ).toLowerCase() ===
                                                                    "active"
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
