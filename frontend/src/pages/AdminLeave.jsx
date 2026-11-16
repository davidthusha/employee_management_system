
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import AdminDashboard from "./AdminDashboard";
import "../CSS/LeaveManagement.css";

const STATUSES = ["Pending", "Approved", "Rejected", "Cancelled"];

const displayDate = value =>
    value ? String(value).slice(0, 10) : "—";

const displayDays = value =>
    value == null
        ? "—"
        : Number(value).toLocaleString(undefined, {
            maximumFractionDigits: 2
        });

export default function AdminLeave() {
    const navigate = useNavigate();

    const [user, setUser] = useState({});
    const [requests, setRequests] = useState([]);
    const [types, setTypes] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [filter, setFilter] = useState("Pending");
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [comments, setComments] = useState({});
    const [allowanceDrafts, setAllowanceDrafts] = useState({});

    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [selectedYear, setSelectedYear] = useState(
        String(new Date().getFullYear())
    );
    const [employeeBalances, setEmployeeBalances] = useState([]);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [balanceDrafts, setBalanceDrafts] = useState({});

    const displayName =
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        user.display_name ||
        (user.role === "Admin" ? "Administrator" : user.username) ||
        "User";

    const loadRequests = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/leaves/requests", {
                params: filter ? { status: filter } : {}
            });

            setRequests(
                Array.isArray(response.data) ? response.data : []
            );
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load leave applications."
            );

            if ([401, 403].includes(err.response?.status)) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/", { replace: true });
            }
        } finally {
            setLoading(false);
        }
    }, [filter, navigate]);

    const loadSettings = useCallback(async () => {
        try {
            const [typeResponse, employeeResponse] = await Promise.all([
                api.get("/leaves/types"),
                api.get("/employees")
            ]);

            const typeList = Array.isArray(typeResponse.data)
                ? typeResponse.data
                : [];

            setTypes(typeList);
            setEmployees(
                Array.isArray(employeeResponse.data)
                    ? employeeResponse.data
                    : []
            );

            setAllowanceDrafts(
                Object.fromEntries(
                    typeList.map(type => [
                        type.leave_type_id,
                        type.annual_allowance == null
                            ? ""
                            : String(type.annual_allowance)
                    ])
                )
            );
        } catch (err) {
            console.error(
                "Load leave settings:",
                err.response?.data || err.message
            );
            setError(
                err.response?.data?.message ||
                "Unable to load leave settings."
            );
        }
    }, []);

    useEffect(() => {
        try {
            setUser(JSON.parse(localStorage.getItem("user") || "{}"));
        } catch {
            setUser({});
        }
    }, []);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const review = async (request, decision) => {
        const comment = comments[request.leave_request_id] || "";

        if (!window.confirm(
            `${decision} the leave request for ${request.first_name} ${request.last_name}?`
        )) {
            return;
        }

        setBusyId(request.leave_request_id);
        setError("");
        setSuccess("");

        try {
            const response = await api.put(
                `/leaves/requests/${request.leave_request_id}/decision`,
                {
                    decision,
                    admin_comment: comment
                }
            );

            setSuccess(response.data.message);
            await loadRequests();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to review this request."
            );
        } finally {
            setBusyId(null);
        }
    };

    const saveAllowance = async type => {
        setError("");
        setSuccess("");

        const raw = allowanceDrafts[type.leave_type_id];
        const allowance = raw === "" ? null : Number(raw);

        if (
            allowance !== null &&
            (!Number.isFinite(allowance) ||
                allowance < 0 ||
                allowance > 365)
        ) {
            setError(
                "Enter an allowance between 0 and 365, or leave blank for no fixed allowance."
            );
            return;
        }

        try {
            const response = await api.put(
                `/leaves/types/${type.leave_type_id}`,
                { annual_allowance: allowance }
            );

            setSuccess(response.data.message);
            await loadSettings();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to update allowance."
            );
        }
    };

    const loadEmployeeBalances = async () => {
        if (!selectedEmployee) {
            setError("Select an employee first.");
            return;
        }

        const year = Number(selectedYear);

        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
            setError("Enter a valid year.");
            return;
        }

        setBalanceLoading(true);
        setError("");
        setEmployeeBalances([]);

        try {
            const response = await api.get(
                `/leaves/employees/${selectedEmployee}/balances`,
                { params: { year } }
            );

            const data = Array.isArray(response.data)
                ? response.data
                : [];

            setEmployeeBalances(data);

            setBalanceDrafts(
                Object.fromEntries(
                    data
                        .filter(item => item.requires_balance)
                        .map(item => [
                            item.leave_type_id,
                            {
                                entitled_days: String(item.entitled_days ?? 0),
                                carried_forward_days: String(
                                    item.carried_forward_days ?? 0
                                )
                            }
                        ])
                )
            );
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load employee balances."
            );
        } finally {
            setBalanceLoading(false);
        }
    };

    const saveEmployeeBalance = async balance => {
        const draft = balanceDrafts[balance.leave_type_id] || {};
        const entitlement = Number(draft.entitled_days);
        const carried = Number(draft.carried_forward_days);

        if (
            !Number.isFinite(entitlement) ||
            entitlement < 0 ||
            entitlement > 366 ||
            !Number.isFinite(carried) ||
            carried < 0 ||
            carried > 366
        ) {
            setError(
                "Entitlement and carry-forward must be between 0 and 366 days."
            );
            return;
        }

        setError("");
        setSuccess("");

        try {
            const response = await api.put(
                `/leaves/employees/${selectedEmployee}/balances/${balance.leave_type_id}`,
                {
                    leave_year: Number(selectedYear),
                    entitled_days: entitlement,
                    carried_forward_days: carried
                }
            );

            setSuccess(response.data.message);
            await loadEmployeeBalances();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to save employee balance."
            );
        }
    };

    return (
        <AdminDashboard>
            <div className="dashboard-welcome">
                <div>
                    <h1>Leave Management</h1>
                    <p>
                        Review applications. Only approved requests are valid leave.
                    </p>
                </div>
            </div>

            {error && (
                <div className="dashboard-error" role="alert">
                    {error}
                </div>
            )}

            {success && (
                <div className="leave-success" role="status">
                    {success}
                </div>
            )}

            <div className="leave-panel">
                <div className="leave-panel-heading">
                    <div>
                        <h2>Applications</h2>
                        <p>Approve or reject employee requests.</p>
                    </div>

                    <button
                        className="leave-secondary-button"
                        onClick={loadRequests}
                        disabled={loading}
                    >
                        Refresh
                    </button>
                </div>

                <div className="leave-filter-row">
                    <label>
                        Filter by status
                        <select
                            value={filter}
                            onChange={event => setFilter(event.target.value)}
                        >
                            <option value="">All statuses</option>
                            {STATUSES.map(status => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="leave-table-wrap">
                    <table className="leave-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Leave Type</th>
                                <th>Dates</th>
                                <th>Days</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th>Admin Comment</th>
                                <th>Decision</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="leave-empty">
                                        Loading...
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="leave-empty">
                                        No applications found.
                                    </td>
                                </tr>
                            ) : (
                                requests.map(request => (
                                    <tr key={request.leave_request_id}>
                                        <td>
                                            <strong>
                                                {request.first_name} {request.last_name}
                                            </strong>
                                            <small>
                                                {request.employee_code ||
                                                    `Employee ${request.employee_id}`}
                                            </small>
                                        </td>

                                        <td>{request.leave_type_name}</td>

                                        <td>
                                            {displayDate(request.start_date)} –{" "}
                                            {displayDate(request.end_date)}
                                        </td>

                                        <td>{displayDays(request.requested_days)}</td>

                                        <td className="leave-reason">
                                            {request.reason}
                                        </td>

                                        <td>
                                            <span
                                                className={`leave-status leave-status-${String(request.status || "").toLowerCase()}`}
                                            >
                                                {request.status}
                                            </span>
                                        </td>

                                        <td>
                                            {request.status === "Pending" ? (
                                                <textarea
                                                    rows="2"
                                                    maxLength="2000"
                                                    value={
                                                        comments[request.leave_request_id] || ""
                                                    }
                                                    onChange={event =>
                                                        setComments(previous => ({
                                                            ...previous,
                                                            [request.leave_request_id]:
                                                                event.target.value
                                                        }))
                                                    }
                                                    placeholder="Optional comment"
                                                />
                                            ) : (
                                                request.admin_comment || "—"
                                            )}
                                        </td>

                                        <td>
                                            {request.status === "Pending" ? (
                                                <div className="leave-decision-actions">
                                                    <button
                                                        className="leave-primary-button"
                                                        disabled={
                                                            busyId === request.leave_request_id
                                                        }
                                                        onClick={() =>
                                                            review(request, "Approved")
                                                        }
                                                    >
                                                        {busyId === request.leave_request_id
                                                            ? "Saving..."
                                                            : "Approve"}
                                                    </button>

                                                    <button
                                                        className="leave-danger-button"
                                                        disabled={
                                                            busyId === request.leave_request_id
                                                        }
                                                        onClick={() =>
                                                            review(request, "Rejected")
                                                        }
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="leave-panel">
                <div className="leave-panel-heading">
                    <div>
                        <h2>Default Leave Allowances</h2>
                        <p>
                            Changes update unused balances; existing balances
                            with requests are preserved.
                        </p>
                    </div>
                </div>

                <div className="leave-table-wrap">
                    <table className="leave-table">
                        <thead>
                            <tr>
                                <th>Leave Type</th>
                                <th>Annual Allowance (days)</th>
                                <th>Balance Required</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {types.map(type => (
                                <tr key={type.leave_type_id}>
                                    <td>{type.leave_type_name}</td>
                                    <td>
                                        <input
                                            type="number"
                                            min="0"
                                            max="365"
                                            step="0.5"
                                            value={
                                                allowanceDrafts[type.leave_type_id] ?? ""
                                            }
                                            onChange={event =>
                                                setAllowanceDrafts(previous => ({
                                                    ...previous,
                                                    [type.leave_type_id]:
                                                        event.target.value
                                                }))
                                            }
                                            placeholder="Configurable"
                                            aria-label={`${type.leave_type_name} allowance`}
                                        />
                                    </td>
                                    <td>{type.requires_balance ? "Yes" : "No"}</td>
                                    <td>
                                        <button
                                            className="leave-secondary-button"
                                            onClick={() => saveAllowance(type)}
                                        >
                                            Save Allowance
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="leave-panel">
                <div className="leave-panel-heading">
                    <div>
                        <h2>Employee Leave Balances</h2>
                        <p>
                            Adjust entitlement and carry-forward for a selected year.
                        </p>
                    </div>
                </div>

                <div className="leave-balance-admin-controls">
                    <label>
                        Employee
                        <select
                            value={selectedEmployee}
                            onChange={event =>
                                setSelectedEmployee(event.target.value)
                            }
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
                        Year
                        <input
                            type="number"
                            min="2000"
                            max="2100"
                            value={selectedYear}
                            onChange={event =>
                                setSelectedYear(event.target.value)
                            }
                        />
                    </label>

                    <button
                        className="leave-primary-button"
                        onClick={loadEmployeeBalances}
                        disabled={balanceLoading}
                    >
                        {balanceLoading ? "Loading..." : "Load Balances"}
                    </button>
                </div>

                {employeeBalances.length > 0 && (
                    <div className="leave-table-wrap">
                        <table className="leave-table">
                            <thead>
                                <tr>
                                    <th>Leave Type</th>
                                    <th>Entitlement</th>
                                    <th>Carry Forward</th>
                                    <th>Approved Used</th>
                                    <th>Pending</th>
                                    <th>Remaining</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {employeeBalances.map(balance => (
                                    <tr key={balance.leave_type_id}>
                                        <td>{balance.leave_type_name}</td>

                                        {balance.requires_balance ? (
                                            <>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="366"
                                                        step="0.5"
                                                        value={
                                                            balanceDrafts[balance.leave_type_id]
                                                                ?.entitled_days ?? ""
                                                        }
                                                        onChange={event =>
                                                            setBalanceDrafts(previous => ({
                                                                ...previous,
                                                                [balance.leave_type_id]: {
                                                                    ...previous[
                                                                        balance.leave_type_id
                                                                    ],
                                                                    entitled_days:
                                                                        event.target.value
                                                                }
                                                            }))
                                                        }
                                                    />
                                                </td>

                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="366"
                                                        step="0.5"
                                                        value={
                                                            balanceDrafts[balance.leave_type_id]
                                                                ?.carried_forward_days ?? ""
                                                        }
                                                        onChange={event =>
                                                            setBalanceDrafts(previous => ({
                                                                ...previous,
                                                                [balance.leave_type_id]: {
                                                                    ...previous[
                                                                        balance.leave_type_id
                                                                    ],
                                                                    carried_forward_days:
                                                                        event.target.value
                                                                }
                                                            }))
                                                        }
                                                    />
                                                </td>

                                                <td>{displayDays(balance.used_days)}</td>
                                                <td>{displayDays(balance.pending_days)}</td>
                                                <td>{displayDays(balance.remaining_days)}</td>

                                                <td>
                                                    <button
                                                        className="leave-secondary-button"
                                                        onClick={() =>
                                                            saveEmployeeBalance(balance)
                                                        }
                                                    >
                                                        Save
                                                    </button>
                                                </td>
                                            </>
                                        ) : (
                                            <td colSpan="6">No fixed balance</td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminDashboard>
    );
}
