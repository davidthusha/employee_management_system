
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../CSS/AdminDashboard.css";
import "../CSS/AdminAttendance.css";

const EMPTY_FORM = {
    employee_id: "",
    attendance_date: "",
    check_in: "",
    check_out: "",
    status: "Present"
};

const NAVIGATION = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Employees", path: "/employees" },
    { label: "Departments", path: "/departments" },
    { label: "Attendance", path: "/attendance" },
    { label: "Reports", path: "/reports" }
];

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

function isLate(record) {
    if (!record.check_in) return false;

    const time = String(record.check_in).slice(0, 8);

    return (
        record.is_late === 1 ||
        record.is_late === true ||
        record.is_late === "1" ||
        time > "08:30:00"
    );
}

function statusLabel(record) {
    if (
        ["Present", "Late"].includes(record.status) &&
        isLate(record)
    ) {
        return "Present · Late";
    }

    if (record.status === "Late") {
        return "Present · Late";
    }

    return record.status || "—";
}

function statusClass(status) {
    switch (String(status || "").toLowerCase()) {
        case "present":
            return "is-active";
        case "late":
            return "is-late";
        case "absent":
            return "is-inactive";
        case "leave":
            return "is-leave";
        default:
            return "";
    }
}

function AdminAttendance() {
    const navigate = useNavigate();
    const location = useLocation();

    const [records, setRecords] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [filters, setFilters] = useState({
        date: "",
        employee_id: "",
        status: ""
    });

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    // Load employees for the employee filter and attendance form.
    const loadEmployees = useCallback(async () => {
        try {
            const response = await api.get("/employees");

            setEmployees(
                Array.isArray(response.data) ? response.data : []
            );
        } catch (err) {
            console.error(
                "Load employees error:",
                err.response?.data || err.message
            );
        }
    }, []);

    // Load attendance using the currently selected filters.
    const loadAttendance = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const params = {};

            if (filters.date) {
                params.date = filters.date;
            }

            if (filters.employee_id) {
                params.employee_id = filters.employee_id;
            }

            if (filters.status) {
                params.status = filters.status;
            }

            const response = await api.get("/attendance", { params });

            setRecords(
                Array.isArray(response.data) ? response.data : []
            );
        } catch (err) {
            console.error(
                "Load attendance error:",
                err.response?.status,
                err.response?.data || err.message
            );

            setError(
                err.response?.data?.message ||
                "Unable to load attendance records."
            );
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    useEffect(() => {
        loadAttendance();
    }, [loadAttendance]);

    // Summary statistics.
    const presentCount = new Set(
        records
            .filter(record =>
                ["present", "late"].includes(
                    String(record.status || "").toLowerCase()
                )
            )
            .map(record => record.employee_id)
    ).size;

    const lateCount = records.filter(isLate).length;

    const checkedOutCount = records.filter(
        record =>
            record.check_out !== null &&
            record.check_out !== undefined &&
            String(record.check_out).trim() !== ""
    ).length;

    const leaveCount = records.filter(
        record =>
            String(record.status || "").toLowerCase() === "leave"
    ).length;

    const absentCount = records.filter(
        record =>
            String(record.status || "").toLowerCase() === "absent"
    ).length;

    // Filter controls.
    const handleFilterChange = event => {
        const { name, value } = event.target;

        setFilters(previous => ({
            ...previous,
            [name]: value
        }));
    };

    const resetFilters = () => {
        setFilters({
            date: "",
            employee_id: "",
            status: ""
        });
    };

    // Create a new attendance record.
    const openCreateForm = () => {
        setEditingId(null);

        const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Colombo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(new Date());

        setForm({
            ...EMPTY_FORM,
            attendance_date: today
        });

        setShowForm(true);
        setError("");
        setSuccess("");
    };

    // Load an existing record into the edit form.
    const openEditForm = record => {
        setEditingId(record.attendance_id);

        setForm({
            employee_id: String(record.employee_id),
            attendance_date: String(record.attendance_date).slice(0, 10),
            check_in: record.check_in
                ? String(record.check_in).slice(0, 5)
                : "",
            check_out: record.check_out
                ? String(record.check_out).slice(0, 5)
                : "",
            status: record.status || "Present"
        });

        setShowForm(true);
        setError("");
        setSuccess("");
    };

    const handleFormChange = event => {
        const { name, value } = event.target;

        setForm(previous => ({
            ...previous,
            [name]: value
        }));
    };

    // Save a new record or update an existing one.
    const handleSubmit = async event => {
        event.preventDefault();

        setSaving(true);
        setError("");
        setSuccess("");

        const payload = {
            employee_id: Number(form.employee_id),
            attendance_date: form.attendance_date,
            check_in: form.check_in || null,
            check_out: form.check_out || null,
            status: form.status
        };

        try {
            if (editingId) {
                await api.put(
                    `/attendance/${editingId}`,
                    payload
                );

                setSuccess("Attendance record updated successfully.");
            } else {
                await api.post("/attendance", payload);

                setSuccess("Attendance record created successfully.");
            }

            setShowForm(false);
            setEditingId(null);
            setForm(EMPTY_FORM);

            await loadAttendance();
        } catch (err) {
            console.error(
                "Save attendance error:",
                err.response?.data || err.message
            );

            setError(
                err.response?.data?.message ||
                "Unable to save attendance record."
            );
        } finally {
            setSaving(false);
        }
    };

    // Delete with confirmation.
    const handleDelete = async record => {
        const employeeName =
            `${record.first_name || ""} ${record.last_name || ""}`.trim() ||
            record.employee_code ||
            `Employee ${record.employee_id}`;

        const confirmed = window.confirm(
            `Delete the attendance record for ${employeeName} on ${formatDate(record.attendance_date)}? This cannot be undone.`
        );

        if (!confirmed) return;

        setError("");
        setSuccess("");

        try {
            await api.delete(
                `/attendance/${record.attendance_id}`
            );

            setSuccess("Attendance record deleted successfully.");

            await loadAttendance();
        } catch (err) {
            console.error(
                "Delete attendance error:",
                err.response?.data || err.message
            );

            setError(
                err.response?.data?.message ||
                "Unable to delete attendance record."
            );
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/", { replace: true });
    };

    return (
        <div className="dashboard">
            {/* Admin sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    Employee Management
                </div>

                <nav className="sidebar-menu">
                    {NAVIGATION.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={
                                location.pathname === item.path
                                    ? "active"
                                    : ""
                            }
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Main page */}
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h2>Attendance Management</h2>

                    <div className="user-section">
                        <span className="user-name">Admin</span>

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
                            <h1>Attendance Management</h1>
                            <p>
                                View, filter and manage employee attendance records.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="admin-attendance-primary-button"
                            onClick={openCreateForm}
                        >
                            + Add Attendance
                        </button>
                    </div>

                    {error && (
                        <div className="dashboard-error" role="alert">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div
                            className="admin-attendance-success"
                            role="status"
                        >
                            {success}
                        </div>
                    )}

                    {/* Updated statistics */}
                    <div className="dashboard-cards admin-attendance-summary">
                        <div className="dashboard-card">
                            <div className="dashboard-card-icon employees-icon">
                                👥
                            </div>

                            <h3>Employees Present</h3>

                            <p>{loading ? "..." : presentCount}</p>

                            <span className="dashboard-card-note">
                                Unique employees present, including late arrivals
                            </span>
                        </div>

                        <div className="dashboard-card">
                            <div className="dashboard-card-icon attendance-icon">
                                ⏰
                            </div>

                            <h3>Late Arrivals</h3>

                            <p>{loading ? "..." : lateCount}</p>

                            <span className="dashboard-card-note">
                                Check-ins after 08:30 Sri Lanka time
                            </span>
                        </div>

                        <div className="dashboard-card">
                            <div className="dashboard-card-icon active-icon">
                                ✓
                            </div>

                            <h3>Checked Out</h3>

                            <p>{loading ? "..." : checkedOutCount}</p>

                            <span className="dashboard-card-note">
                                Records with a checkout time
                            </span>
                        </div>

                        <div className="dashboard-card">
                            <div className="dashboard-card-icon departments-icon">
                                📴
                            </div>

                            <h3>Leave Records</h3>

                            <p>{loading ? "..." : leaveCount}</p>

                            <span className="dashboard-card-note">
                                {absentCount} absent · {leaveCount} on leave
                            </span>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="dashboard-recent admin-attendance-panel">
                        <div className="dashboard-section-header">
                            <div>
                                <h2>Filter Attendance</h2>
                                <p>
                                    Filter by date, employee or attendance status.
                                </p>
                            </div>
                        </div>

                        <div className="admin-attendance-filters">
                            <label>
                                Attendance Date

                                <input
                                    type="date"
                                    name="date"
                                    value={filters.date}
                                    onChange={handleFilterChange}
                                />
                            </label>

                            <label>
                                Employee

                                <select
                                    name="employee_id"
                                    value={filters.employee_id}
                                    onChange={handleFilterChange}
                                >
                                    <option value="">All employees</option>

                                    {employees.map(employee => (
                                        <option
                                            key={employee.employee_id}
                                            value={employee.employee_id}
                                        >
                                            {employee.first_name} {employee.last_name}
                                            {employee.employee_code
                                                ? ` (${employee.employee_code})`
                                                : ""}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Status

                                <select
                                    name="status"
                                    value={filters.status}
                                    onChange={handleFilterChange}
                                >
                                    <option value="">All statuses</option>
                                    <option value="Present">Present</option>
                                    <option value="Late">Late (legacy records)</option>
                                    <option value="Absent">Absent</option>
                                    <option value="Leave">Leave</option>
                                </select>
                            </label>

                            <button
                                type="button"
                                className="admin-attendance-secondary-button"
                                onClick={resetFilters}
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>

                    {/* Create / edit form */}
                    {showForm && (
                        <div className="dashboard-recent admin-attendance-panel">
                            <div className="dashboard-section-header">
                                <div>
                                    <h2>
                                        {editingId
                                            ? "Edit Attendance"
                                            : "Add Attendance"}
                                    </h2>

                                    <p>
                                        Enter the employee's attendance details.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="admin-attendance-secondary-button"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingId(null);
                                        setForm(EMPTY_FORM);
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>

                            <form
                                className="admin-attendance-form"
                                onSubmit={handleSubmit}
                            >
                                <label>
                                    Employee *

                                    <select
                                        name="employee_id"
                                        value={form.employee_id}
                                        onChange={handleFormChange}
                                        required
                                    >
                                        <option value="">Select employee</option>

                                        {employees.map(employee => (
                                            <option
                                                key={employee.employee_id}
                                                value={employee.employee_id}
                                            >
                                                {employee.first_name} {employee.last_name}
                                                {employee.employee_code
                                                    ? ` (${employee.employee_code})`
                                                    : ""}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    Attendance Date *

                                    <input
                                        type="date"
                                        name="attendance_date"
                                        value={form.attendance_date}
                                        onChange={handleFormChange}
                                        required
                                    />
                                </label>

                                <label>
                                    Check-in Time

                                    <input
                                        type="time"
                                        name="check_in"
                                        value={form.check_in}
                                        onChange={handleFormChange}
                                    />
                                </label>

                                <label>
                                    Check-out Time

                                    <input
                                        type="time"
                                        name="check_out"
                                        value={form.check_out}
                                        onChange={handleFormChange}
                                    />
                                </label>

                                <label>
                                    Attendance Status *

                                    <select
                                        name="status"
                                        value={form.status}
                                        onChange={handleFormChange}
                                        required
                                    >
                                        <option value="Present">Present</option>
                                        <option value="Absent">Absent</option>
                                        <option value="Late">Late</option>
                                        <option value="Leave">Leave</option>
                                    </select>
                                </label>

                                <div className="admin-attendance-form-actions">
                                    <button
                                        type="submit"
                                        className="admin-attendance-primary-button"
                                        disabled={saving}
                                    >
                                        {saving
                                            ? "Saving..."
                                            : editingId
                                                ? "Save Changes"
                                                : "Create Record"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Attendance records table */}
                    <div className="dashboard-recent">
                        <div className="dashboard-section-header">
                            <div>
                                <h2>Attendance Records</h2>

                                <p>
                                    {records.length} record(s) match the current filters.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="admin-attendance-secondary-button"
                                disabled={loading}
                                onClick={loadAttendance}
                            >
                                Refresh
                            </button>
                        </div>

                        <div className="dashboard-table-container">
                            <table className="dashboard-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Employee</th>
                                        <th>Employee Code</th>
                                        <th>Check In</th>
                                        <th>Check Out</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td
                                                colSpan="7"
                                                className="dashboard-empty"
                                            >
                                                Loading attendance records...
                                            </td>
                                        </tr>
                                    ) : records.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan="7"
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
                                                    <div className="dashboard-employee">
                                                        <strong>
                                                            {`${record.first_name || ""} ${record.last_name || ""}`.trim() ||
                                                                "Unknown employee"}
                                                        </strong>
                                                    </div>
                                                </td>

                                                <td>
                                                    {record.employee_code || "—"}
                                                </td>

                                                <td>
                                                    {formatTime(record.check_in)}
                                                </td>

                                                <td>
                                                    {formatTime(record.check_out)}
                                                </td>

                                                <td>
                                                    <span
                                                        className={`dashboard-status ${statusClass(record.status)}`}
                                                    >
                                                        {statusLabel(record)}
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="admin-attendance-row-actions">
                                                        <button
                                                            type="button"
                                                            className="admin-attendance-edit-button"
                                                            onClick={() =>
                                                                openEditForm(record)
                                                            }
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="admin-attendance-delete-button"
                                                            onClick={() =>
                                                                handleDelete(record)
                                                            }
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
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

export default AdminAttendance;
