
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../CSS/AdminDashboard.css";

const WORK_START_TIME = "08:30:00";

function getSriLankaDate() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Colombo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const values = {};

    parts.forEach(part => {
        if (part.type !== "literal") values[part.type] = part.value;
    });

    return `${values.year}-${values.month}-${values.day}`;
}

function formatDate(value) {
    if (!value) return "—";

    const parts = String(value).slice(0, 10).split("-");

    return parts.length === 3
        ? `${parts[2]}/${parts[1]}/${parts[0]}`
        : String(value);
}

function formatTime(value) {
    return value ? String(value).slice(0, 5) : "—";
}

function isLateRecord(record) {
    if (!record.check_in) return false;

    // The backend supplies is_late. The time comparison also
    // supports older records that do not have this field.
    if (
        record.is_late === 1 ||
        record.is_late === true ||
        record.is_late === "1"
    ) {
        return true;
    }

    return String(record.check_in).slice(0, 8) > WORK_START_TIME;
}

function getStatusClass(status) {
    switch (String(status || "").toLowerCase()) {
        case "present":
            return "is-active";
        case "absent":
            return "is-inactive";
        case "late":
            return "is-late";
        case "leave":
            return "is-leave";
        default:
            return "";
    }
}

function EmployeeAttendance() {
    const navigate = useNavigate();

    const [user, setUser] = useState({});
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const today = getSriLankaDate();

    const loadAttendance = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);

        try {
            const response = await api.get("/attendance/me");
            const data = Array.isArray(response.data)
                ? response.data
                : [];

            setRecords(data);
            setError("");
            return data;
        } catch (err) {
            console.error(
                "Attendance loading error:",
                err.response?.status,
                err.response?.data || err.message
            );

            setError(
                err.response?.data?.message ||
                "Unable to load attendance records. Please refresh."
            );

            return null;
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    useEffect(() => {
        try {
            setUser(JSON.parse(localStorage.getItem("user") || "{}"));
        } catch {
            setUser({});
        }

        loadAttendance();
    }, [loadAttendance]);

    const todayRecord = records.find(record =>
        String(record.attendance_date || "").slice(0, 10) === today
    );

    const checkedIn = Boolean(
        todayRecord?.check_in &&
        String(todayRecord.check_in).trim() !== ""
    );

    const checkedOut = Boolean(
        todayRecord?.check_out &&
        String(todayRecord.check_out).trim() !== ""
    );

    // Present includes both on-time arrivals and late arrivals.
    const countPresentDays = () =>
        records.filter(record => {
            const status = String(record.status || "").toLowerCase();

            return status === "present" || status === "late";
        }).length;

    const countLateArrivals = () =>
        records.filter(isLateRecord).length;

    const countStatus = status =>
        records.filter(
            record =>
                String(record.status || "").toLowerCase() ===
                status.toLowerCase()
        ).length;

    const handleAttendanceAction = async action => {
        if (actionLoading) return;

        setActionLoading(true);
        setError("");
        setSuccess("");

        try {
            const response = await api.post(`/attendance/${action}`);

            setSuccess(
                response.data?.message ||
                (action === "check-in"
                    ? "Check-in successful."
                    : "Check-out successful.")
            );

            await loadAttendance(false);
        } catch (err) {
            console.error(
                `${action} error:`,
                err.response?.status,
                err.response?.data || err.message
            );

            // Reload after conflicts too, so existing database records
            // determine the current button state.
            await loadAttendance(false);

            setError(
                err.response?.data?.message ||
                "Unable to update attendance. Please try again."
            );
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/", { replace: true });
    };

    return (
        <div className="dashboard">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    Employee Management
                </div>

                <nav className="sidebar-menu">
                    <Link to="/employee-portal">
                        Dashboard
                    </Link>

                    <Link to="/employee-profile">
                        My Profile
                    </Link>

                    <Link
                        to="/employee-attendance"
                        className="active"
                    >
                        My Attendance
                    </Link>
                </nav>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h2>My Attendance</h2>

                    <div className="user-section">
                        <span className="user-name">
                            {user.username || "Employee"}
                        </span>

                        <button
                            type="button"
                            className="logout-button"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <section className="dashboard-content">
                    <div className="dashboard-welcome">
                        <div>
                            <h1>My Attendance</h1>
                            <p>
                                Check in when you arrive and check out
                                when you finish work.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="dashboard-error" role="alert">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="attendance-success" role="status">
                            {success}
                        </div>
                    )}

                    <div className="dashboard-recent attendance-action-panel">
                        <div className="dashboard-section-header">
                            <div>
                                <h2>Today's Attendance</h2>
                                <p>
                                    Date: {formatDate(today)}
                                    {" · "}
                                    Work starts at 08:30 Sri Lanka time
                                </p>
                            </div>

                            {todayRecord?.status && (
                                <span
                                    className={`dashboard-status ${getStatusClass(todayRecord.status)}`}
                                >
                                    {isLateRecord(todayRecord)
                                        ? "Present · Late"
                                        : todayRecord.status}
                                </span>
                            )}
                        </div>

                        <div className="attendance-action-content">
                            <div className="attendance-time-grid">
                                <div className="attendance-time-item">
                                    <span>Check-in time</span>
                                    <strong>
                                        {formatTime(todayRecord?.check_in)}
                                    </strong>
                                </div>

                                <div className="attendance-time-item">
                                    <span>Check-out time</span>
                                    <strong>
                                        {formatTime(todayRecord?.check_out)}
                                    </strong>
                                </div>
                            </div>

                            <div className="attendance-actions">
                                <button
                                    type="button"
                                    className="attendance-checkin-button"
                                    disabled={
                                        loading ||
                                        actionLoading ||
                                        checkedIn
                                    }
                                    onClick={() =>
                                        handleAttendanceAction("check-in")
                                    }
                                >
                                    {actionLoading
                                        ? "Processing..."
                                        : checkedIn
                                            ? "Checked In"
                                            : "Check In"}
                                </button>

                                <button
                                    type="button"
                                    className="attendance-checkout-button"
                                    disabled={
                                        loading ||
                                        actionLoading ||
                                        !checkedIn ||
                                        checkedOut
                                    }
                                    onClick={() =>
                                        handleAttendanceAction("check-out")
                                    }
                                >
                                    {actionLoading
                                        ? "Processing..."
                                        : checkedOut
                                            ? "Checked Out"
                                            : "Check Out"}
                                </button>
                            </div>

                            <p className="attendance-help">
                                {loading
                                    ? "Loading today's attendance..."
                                    : checkedOut
                                        ? "You have completed attendance for today."
                                        : checkedIn
                                            ? "You are checked in. Check out when you finish work."
                                            : "You have not checked in today."}
                            </p>
                        </div>
                    </div>

                    <div className="dashboard-cards attendance-summary">
                        <div className="dashboard-card">
                            <div className="dashboard-card-icon active-icon">
                                ✓
                            </div>
                            <h3>Present Days</h3>
                            <p>
                                {loading ? "..." : countPresentDays()}
                            </p>
                            <span className="dashboard-card-note">
                                Includes late arrivals
                            </span>
                        </div>

                        <div className="dashboard-card">
                            <div className="dashboard-card-icon attendance-icon">
                                ⏰
                            </div>
                            <h3>Late Arrivals</h3>
                            <p>
                                {loading ? "..." : countLateArrivals()}
                            </p>
                            <span className="dashboard-card-note">
                                Check-ins after 08:30
                            </span>
                        </div>

                        <div className="dashboard-card">
                            <div className="dashboard-card-icon departments-icon">
                                ✕
                            </div>
                            <h3>Absent Days</h3>
                            <p>
                                {loading ? "..." : countStatus("Absent")}
                            </p>
                            <span className="dashboard-card-note">
                                Records marked absent
                            </span>
                        </div>

                        <div className="dashboard-card">
                            <div className="dashboard-card-icon job-title-icon">
                                📴
                            </div>
                            <h3>Leave Days</h3>
                            <p>
                                {loading ? "..." : countStatus("Leave")}
                            </p>
                            <span className="dashboard-card-note">
                                Records marked leave
                            </span>
                        </div>
                    </div>

                    <div className="dashboard-recent">
                        <div className="dashboard-section-header">
                            <div>
                                <h2>Attendance History</h2>
                                <p>
                                    Your recorded check-in, check-out and status.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="attendance-refresh-button"
                                disabled={loading || actionLoading}
                                onClick={() => loadAttendance()}
                            >
                                Refresh
                            </button>
                        </div>

                        <div className="dashboard-table-container">
                            <table className="dashboard-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Check In</th>
                                        <th>Check Out</th>
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
                                                Loading attendance records...
                                            </td>
                                        </tr>
                                    ) : records.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan="4"
                                                className="dashboard-empty"
                                            >
                                                No attendance records found.
                                            </td>
                                        </tr>
                                    ) : (
                                        records.map(record => (
                                            <tr key={record.attendance_id}>
                                                <td>
                                                    {formatDate(record.attendance_date)}
                                                </td>
                                                <td>
                                                    {formatTime(record.check_in)}
                                                </td>
                                                <td>
                                                    {formatTime(record.check_out)}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`dashboard-status ${getStatusClass(record.status)}`}
                                                    >
                                                        {isLateRecord(record)
                                                            ? "Present · Late"
                                                            : record.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default EmployeeAttendance;
