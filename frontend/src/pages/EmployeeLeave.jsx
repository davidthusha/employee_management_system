
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../CSS/LeaveManagement.css";

function getToday() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Colombo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const values = {};
    parts.forEach(p => {
        if (p.type !== "literal") values[p.type] = p.value;
    });

    return `${values.year}-${values.month}-${values.day}`;
}

const displayDate = value => value ? String(value).slice(0, 10) : "—";
const displayDays = value => value == null ? "—" : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function EmployeeLeave() {
    const navigate = useNavigate();

    const [user, setUser] = useState({});
    const [types, setTypes] = useState([]);
    const [balances, setBalances] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [form, setForm] = useState({
        leave_type_id: "",
        start_date: getToday(),
        end_date: getToday(),
        reason: ""
    });

    const year = Number(form.start_date.slice(0, 4)) || Number(getToday().slice(0, 4));

    const displayName =
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        user.display_name ||
        user.username ||
        "Employee";

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [typeResponse, balanceResponse, requestResponse] = await Promise.all([
                api.get("/leaves/types"),
                api.get("/leaves/me/balances", { params: { year } }),
                api.get("/leaves/me/requests")
            ]);

            setTypes(Array.isArray(typeResponse.data) ? typeResponse.data : []);
            setBalances(Array.isArray(balanceResponse.data) ? balanceResponse.data : []);
            setRequests(Array.isArray(requestResponse.data) ? requestResponse.data : []);
        } catch (err) {
            console.error("Load leave data:", err.response?.data || err.message);
            setError(err.response?.data?.message || "Unable to load leave information.");

            if ([401, 403].includes(err.response?.status)) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/", { replace: true });
            }
        } finally {
            setLoading(false);
        }
    }, [navigate, year]);

    useEffect(() => {
        try {
            setUser(JSON.parse(localStorage.getItem("user") || "{}"));
        } catch {
            setUser({});
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleChange = event => {
        const { name, value } = event.target;

        setForm(previous => ({
            ...previous,
            [name]: value
        }));
    };

    const handleSubmit = async event => {
        event.preventDefault();
        setError("");
        setSuccess("");
        setSubmitting(true);

        try {
            const response = await api.post("/leaves/me/requests", {
                ...form,
                leave_type_id: Number(form.leave_type_id)
            });

            setSuccess(
                `${response.data.message} Working days requested: ${response.data.requested_days}.`
            );

            setForm(previous => ({
                ...previous,
                reason: ""
            }));

            await load();
        } catch (err) {
            setError(err.response?.data?.message || "Unable to submit leave application.");
        } finally {
            setSubmitting(false);
        }
    };

    const cancelRequest = async id => {
        if (!window.confirm("Cancel this pending leave application?")) return;

        setError("");
        setSuccess("");

        try {
            const response = await api.put(`/leaves/me/requests/${id}/cancel`);
            setSuccess(response.data.message);
            await load();
        } catch (err) {
            setError(err.response?.data?.message || "Unable to cancel the application.");
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/", { replace: true });
    };

    return (
        <div className="dashboard leave-page">
            <aside className="sidebar">
                <div className="sidebar-logo">Employee Management</div>

                <nav className="sidebar-menu">
                    <Link to="/employee-portal">Dashboard</Link>
                    <Link to="/employee-profile">My Profile</Link>
                    <Link to="/employee-attendance">My Attendance</Link>
                    <Link to="/employee-leave" className="active">Leave Management</Link>
                </nav>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h2>Leave Management</h2>
                    <div className="user-section">
                        <span className="user-name">{displayName}</span>
                        <button className="logout-button" onClick={logout}>Logout</button>
                    </div>
                </header>

                <section className="dashboard-content">
                    <div className="dashboard-welcome">
                        <div>
                            <h1>My Leave</h1>
                            <p>Apply for leave and track your application status.</p>
                        </div>
                    </div>

                    {error && <div className="dashboard-error" role="alert">{error}</div>}
                    {success && <div className="leave-success" role="status">{success}</div>}

                    <div className="leave-panel">
                        <div className="leave-panel-heading">
                            <div>
                                <h2>Leave Balances</h2>
                                <p>Calendar year {year}. Pending requests are included when checking availability.</p>
                            </div>
                        </div>

                        <div className="leave-balance-grid">
                            {balances.map(balance => (
                                <div className="leave-balance-card" key={balance.leave_type_id}>
                                    <span>{balance.leave_type_name}</span>
                                    <strong>
                                        {balance.requires_balance
                                            ? `${displayDays(balance.remaining_days)} days`
                                            : "No fixed balance"}
                                    </strong>
                                    {balance.requires_balance && (
                                        <small>
                                            Entitled: {displayDays(Number(balance.entitled_days) + Number(balance.carried_forward_days || 0))}
                                            {" · "}Approved: {displayDays(balance.used_days)}
                                            {" · "}Pending: {displayDays(balance.pending_days)}
                                        </small>
                                    )}
                                </div>
                            ))}

                            {!loading && balances.length === 0 && <p>No balances available.</p>}
                        </div>
                    </div>

                    <div className="leave-panel">
                        <div className="leave-panel-heading">
                            <div>
                                <h2>Apply for Leave</h2>
                                <p>Your application remains pending until an administrator approves it.</p>
                            </div>
                        </div>

                        <form className="leave-form" onSubmit={handleSubmit}>
                            <label>
                                Leave Type *
                                <select
                                    name="leave_type_id"
                                    value={form.leave_type_id}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select leave type</option>
                                    {types.map(type => (
                                        <option key={type.leave_type_id} value={type.leave_type_id}>
                                            {type.leave_type_name}
                                            {type.requires_balance
                                                ? ` (${type.annual_allowance} days/year)`
                                                : " (configurable)"}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Start Date *
                                <input
                                    type="date"
                                    name="start_date"
                                    min={getToday()}
                                    value={form.start_date}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label>
                                End Date *
                                <input
                                    type="date"
                                    name="end_date"
                                    min={form.start_date || getToday()}
                                    value={form.end_date}
                                    onChange={handleChange}
                                    required
                                />
                            </label>

                            <label className="leave-full-width">
                                Reason *
                                <textarea
                                    name="reason"
                                    rows="3"
                                    maxLength="2000"
                                    value={form.reason}
                                    onChange={handleChange}
                                    placeholder="Enter your reason for leave"
                                    required
                                />
                            </label>

                            <div className="leave-form-actions leave-full-width">
                                <button className="leave-primary-button" type="submit" disabled={submitting}>
                                    {submitting ? "Submitting..." : "Submit Application"}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="leave-panel">
                        <div className="leave-panel-heading">
                            <div>
                                <h2>My Applications</h2>
                                <p>{requests.length} request(s)</p>
                            </div>
                            <button className="leave-secondary-button" onClick={load} disabled={loading}>
                                Refresh
                            </button>
                        </div>

                        <div className="leave-table-wrap">
                            <table className="leave-table">
                                <thead>
                                    <tr>
                                        <th>Leave Type</th>
                                        <th>Dates</th>
                                        <th>Days</th>
                                        <th>Reason</th>
                                        <th>Status</th>
                                        <th>Admin Comment</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="7" className="leave-empty">Loading...</td></tr>
                                    ) : requests.length === 0 ? (
                                        <tr><td colSpan="7" className="leave-empty">No applications yet.</td></tr>
                                    ) : requests.map(request => (
                                        <tr key={request.leave_request_id}>
                                            <td>{request.leave_type_name}</td>
                                            <td>{displayDate(request.start_date)} – {displayDate(request.end_date)}</td>
                                            <td>{displayDays(request.requested_days)}</td>
                                            <td className="leave-reason">{request.reason}</td>
                                            <td>
                                                <span className={`leave-status leave-status-${request.status.toLowerCase()}`}>
                                                    {request.status}
                                                </span>
                                            </td>
                                            <td>{request.admin_comment || "—"}</td>
                                            <td>
                                                {request.status === "Pending" ? (
                                                    <button className="leave-danger-button" onClick={() => cancelRequest(request.leave_request_id)}>
                                                        Cancel
                                                    </button>
                                                ) : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
