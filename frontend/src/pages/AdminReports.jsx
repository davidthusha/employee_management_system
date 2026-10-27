
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "../CSS/AdminReports.css";

function extractRecords(data) {
    if (Array.isArray(data)) return data;

    const possibleKeys = [
        "data",
        "records",
        "rows",
        "requests",
        "attendance",
        "employees",
        "departments",
    ];

    for (const key of possibleKeys) {
        if (Array.isArray(data?.[key])) {
            return data[key];
        }
    }

    return [];
}

function getDate(value) {
    if (!value) return "";

    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    return String(value).slice(0, 10);
}

function getEmployeeName(employee) {
    return `${employee?.first_name || ""} ${
        employee?.last_name || ""
    }`.trim();
}

function AdminReports() {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);

    const [reportType, setReportType] = useState("employees");
    const [departmentId, setDepartmentId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Load employee and department information for filtering.
    useEffect(() => {
        let cancelled = false;

        async function loadOptions() {
            try {
                const [employeeResponse, departmentResponse] =
                    await Promise.all([
                        api.get("/employees"),
                        api.get("/departments"),
                    ]);

                if (cancelled) return;

                setEmployees(extractRecords(employeeResponse.data));
                setDepartments(extractRecords(departmentResponse.data));
            } catch (err) {
                if (cancelled) return;

                console.error("Failed to load report options:", err);

                setError(
                    err.response?.data?.message ||
                    "Unable to load employee and department information."
                );
            }
        }

        loadOptions();

        return () => {
            cancelled = true;
        };
    }, []);

    // Load only the dataset required by the selected report.
    useEffect(() => {
        let cancelled = false;

        async function loadSelectedReport() {
            setLoading(true);
            setError("");

            try {
                let response;

                if (reportType === "employees") {
                    response = await api.get("/employees");
                } else if (reportType === "attendance") {
                    response = await api.get("/attendance");
                } else {
                    response = await api.get("/leaves/requests");
                }

                if (cancelled) return;

                const records = extractRecords(response.data);

                if (reportType === "employees") {
                    setEmployees(records);
                } else if (reportType === "attendance") {
                    setAttendance(records);
                } else {
                    setLeaveRequests(records);
                }
            } catch (err) {
                if (cancelled) return;

                console.error(
                    `Failed to load ${reportType} report:`,
                    err.response?.data || err.message
                );

                setError(
                    err.response?.data?.message ||
                    `Unable to load the ${reportType} report.`
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadSelectedReport();

        return () => {
            cancelled = true;
        };
    }, [reportType]);

    const employeeMap = useMemo(() => {
        return new Map(
            employees.map((employee) => [
                String(employee.employee_id),
                employee,
            ])
        );
    }, [employees]);

    const departmentMap = useMemo(() => {
        return new Map(
            departments.map((department) => [
                String(department.department_id),
                department.department_name,
            ])
        );
    }, [departments]);

    function findEmployee(employeeId) {
        return employeeMap.get(String(employeeId));
    }

    function getDepartmentName(record) {
        const employee = findEmployee(record.employee_id);

        return (
            record.department_name ||
            employee?.department_name ||
            departmentMap.get(
                String(record.department_id ?? employee?.department_id)
            ) ||
            "Unassigned"
        );
    }

    function matchesDepartment(record) {
        if (!departmentId) return true;

        const employee = findEmployee(record.employee_id);
        const recordDepartmentId =
            record.department_id ?? employee?.department_id;

        return (
            recordDepartmentId != null &&
            String(recordDepartmentId) === String(departmentId)
        );
    }

    // Employee Report: filter by department, not by hire date.
    const filteredEmployees = useMemo(() => {
        return employees.filter((employee) => {
            return (
                !departmentId ||
                String(employee.department_id) === String(departmentId)
            );
        });
    }, [employees, departmentId]);

    // Attendance Report: only actual attendance records.
    const filteredAttendance = useMemo(() => {
        return attendance.filter((record) => {
            if (
                record.attendance_id == null ||
                record.employee_id == null ||
                !record.attendance_date
            ) {
                return false;
            }

            const date = getDate(record.attendance_date);

            return (
                (!startDate || date >= startDate) &&
                (!endDate || date <= endDate) &&
                matchesDepartment(record)
            );
        });
    }, [
        attendance,
        employees,
        departmentId,
        startDate,
        endDate,
    ]);

    // Leave Report: only actual leave requests.
    // Include requests that overlap the selected date range.
    const filteredLeaves = useMemo(() => {
        return leaveRequests.filter((request) => {
            if (
                request.leave_request_id == null ||
                request.employee_id == null ||
                !request.start_date ||
                !request.end_date
            ) {
                return false;
            }

            const start = getDate(request.start_date);
            const end = getDate(request.end_date);

            const matchesDates =
                (!startDate || end >= startDate) &&
                (!endDate || start <= endDate);

            return matchesDates && matchesDepartment(request);
        });
    }, [
        leaveRequests,
        employees,
        departmentId,
        startDate,
        endDate,
    ]);

    // Create report columns and rows once for table, CSV, and printing.
    const report = useMemo(() => {
        if (reportType === "employees") {
            return {
                title: "Employee Report",
                filename: "employee-report.csv",
                columns: [
                    {
                        label: "Employee Code",
                        value: (employee) => employee.employee_code || "—",
                    },
                    {
                        label: "Employee Name",
                        value: getEmployeeName,
                    },
                    {
                        label: "Email",
                        value: (employee) => employee.email || "—",
                    },
                    {
                        label: "Department",
                        value: getDepartmentName,
                    },
                    {
                        label: "Job Title",
                        value: (employee) => employee.job_title || "—",
                    },
                    {
                        label: "Hire Date",
                        value: (employee) =>
                            getDate(employee.hire_date) || "—",
                    },
                    {
                        label: "Status",
                        value: (employee) => employee.status || "—",
                    },
                ],
                rows: filteredEmployees,
            };
        }

        if (reportType === "attendance") {
            return {
                title: "Attendance Report",
                filename: "attendance-report.csv",
                columns: [
                    {
                        label: "Employee Code",
                        value: (record) =>
                            record.employee_code ||
                            findEmployee(record.employee_id)?.employee_code ||
                            "—",
                    },
                    {
                        label: "Employee Name",
                        value: (record) =>
                            record.employee_name ||
                            getEmployeeName(findEmployee(record.employee_id)) ||
                            `Employee ${record.employee_id}`,
                    },
                    {
                        label: "Date",
                        value: (record) => getDate(record.attendance_date),
                    },
                    {
                        label: "Check In",
                        value: (record) => record.check_in || "—",
                    },
                    {
                        label: "Check Out",
                        value: (record) => record.check_out || "—",
                    },
                    {
                        label: "Status",
                        value: (record) => record.status || "—",
                    },
                ],
                rows: filteredAttendance,
            };
        }

        return {
            title: "Leave Report",
            filename: "leave-report.csv",
            columns: [
                {
                    label: "Employee Code",
                    value: (request) =>
                        request.employee_code ||
                        findEmployee(request.employee_id)?.employee_code ||
                        "—",
                },
                {
                    label: "Employee Name",
                    value: (request) =>
                        getEmployeeName({
                            first_name:
                                request.first_name ||
                                findEmployee(request.employee_id)?.first_name,
                            last_name:
                                request.last_name ||
                                findEmployee(request.employee_id)?.last_name,
                        }) || `Employee ${request.employee_id}`,
                },
                {
                    label: "Leave Type",
                    value: (request) => request.leave_type_name || "—",
                },
                {
                    label: "Start Date",
                    value: (request) => getDate(request.start_date),
                },
                {
                    label: "End Date",
                    value: (request) => getDate(request.end_date),
                },
                {
                    label: "Days",
                    value: (request) => request.requested_days ?? "—",
                },
                {
                    label: "Status",
                    value: (request) => request.status || "—",
                },
                {
                    label: "Reason",
                    value: (request) => request.reason || "—",
                },
            ],
            rows: filteredLeaves,
        };
    }, [
        reportType,
        filteredEmployees,
        filteredAttendance,
        filteredLeaves,
        employeeMap,
        departmentMap,
    ]);

    const activeEmployees = filteredEmployees.filter(
        (employee) =>
            String(employee.status || "").toLowerCase() === "active"
    ).length;

    const presentOrLateCount = filteredAttendance.filter((record) =>
        ["present", "late"].includes(
            String(record.status || "").toLowerCase()
        )
    ).length;

    const leaveAttendanceCount = filteredAttendance.filter(
        (record) =>
            String(record.status || "").toLowerCase() === "leave"
    ).length;

    const approvedLeaves = filteredLeaves.filter(
        (request) =>
            String(request.status || "").toLowerCase() === "approved"
    ).length;

    const pendingLeaves = filteredLeaves.filter(
        (request) =>
            String(request.status || "").toLowerCase() === "pending"
    ).length;

    async function refreshReport() {
        setLoading(true);
        setError("");

        try {
            let response;

            if (reportType === "employees") {
                response = await api.get("/employees");
            } else if (reportType === "attendance") {
                response = await api.get("/attendance");
            } else {
                response = await api.get("/leaves/requests");
            }

            const records = extractRecords(response.data);

            if (reportType === "employees") {
                setEmployees(records);
            } else if (reportType === "attendance") {
                setAttendance(records);
            } else {
                setLeaveRequests(records);
            }
        } catch (err) {
            console.error("Failed to refresh report:", err);

            setError(
                err.response?.data?.message ||
                "Unable to refresh the selected report."
            );
        } finally {
            setLoading(false);
        }
    }

    function escapeCSV(value) {
        const text =
            value === null || value === undefined ? "" : String(value);

        return `"${text.replace(/"/g, '""')}"`;
    }

    function exportCSV() {
        setError("");

        if (!report.rows.length) {
            setError("There are no records to export for the selected filters.");
            return;
        }

        const csv = [
            report.columns.map((column) => escapeCSV(column.label)).join(","),
            ...report.rows.map((row) =>
                report.columns
                    .map((column) => escapeCSV(column.value(row)))
                    .join(",")
            ),
        ].join("\r\n");

        const blob = new Blob(["\uFEFF", csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = report.filename;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    function printReport() {
        setError("");

        if (!report.rows.length) {
            setError("There are no records to print for the selected filters.");
            return;
        }

        window.print();
    }

    const selectedDepartment = departments.find(
        (department) =>
            String(department.department_id) === String(departmentId)
    );

    return (
        <div className="admin-reports">
            <div className="reports-heading reports-screen-only">
                <div>
                    <h1>Reports</h1>
                    <p>
                        Review and export employee, attendance and leave data.
                    </p>
                </div>

                <button type="button" onClick={printReport}>
                    Print Report
                </button>
            </div>

            <div className="reports-filters reports-screen-only">
                <label>
                    Report Type
                    <select
                        value={reportType}
                        onChange={(event) => {
                            setReportType(event.target.value);
                            setError("");
                        }}
                    >
                        <option value="employees">Employee Report</option>
                        <option value="attendance">Attendance Report</option>
                        <option value="leaves">Leave Report</option>
                    </select>
                </label>

                <label>
                    Department
                    <select
                        value={departmentId}
                        onChange={(event) => setDepartmentId(event.target.value)}
                    >
                        <option value="">All departments</option>

                        {departments.map((department) => (
                            <option
                                key={department.department_id}
                                value={department.department_id}
                            >
                                {department.department_name}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    From Date
                    <input
                        type="date"
                        value={startDate}
                        max={endDate || undefined}
                        onChange={(event) => setStartDate(event.target.value)}
                    />
                </label>

                <label>
                    To Date
                    <input
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(event) => setEndDate(event.target.value)}
                    />
                </label>

                <button
                    type="button"
                    onClick={refreshReport}
                    disabled={loading}
                >
                    {loading ? "Loading..." : "Refresh Report"}
                </button>

                <button type="button" onClick={exportCSV}>
                    Export CSV
                </button>
            </div>

            {error && (
                <div
                    className="reports-error reports-screen-only"
                    role="alert"
                >
                    {error}
                </div>
            )}

            {loading && (
                <p className="reports-loading reports-screen-only">
                    Loading report...
                </p>
            )}

            <section className="report-print-area">
                <header className="report-print-heading">
                    <h1>{report.title}</h1>

                    <p>
                        <strong>Department:</strong>{" "}
                        {selectedDepartment?.department_name ||
                            "All departments"}
                    </p>

                    {startDate && (
                        <p>
                            <strong>From:</strong> {startDate}
                        </p>
                    )}

                    {endDate && (
                        <p>
                            <strong>To:</strong> {endDate}
                        </p>
                    )}

                    <p>
                        <strong>Records:</strong> {report.rows.length}
                    </p>
                </header>

                {reportType === "employees" && (
                    <div className="reports-summary">
                        <div className="reports-card">
                            <span>Employees</span>
                            <strong>{filteredEmployees.length}</strong>
                        </div>

                        <div className="reports-card">
                            <span>Active Employees</span>
                            <strong>{activeEmployees}</strong>
                        </div>

                        <div className="reports-card">
                            <span>Other Statuses</span>
                            <strong>
                                {filteredEmployees.length - activeEmployees}
                            </strong>
                        </div>
                    </div>
                )}

                {reportType === "attendance" && (
                    <div className="reports-summary">
                        <div className="reports-card">
                            <span>Attendance Records</span>
                            <strong>{filteredAttendance.length}</strong>
                        </div>

                        <div className="reports-card">
                            <span>Present / Late</span>
                            <strong>{presentOrLateCount}</strong>
                        </div>

                        <div className="reports-card">
                            <span>Leave Records</span>
                            <strong>{leaveAttendanceCount}</strong>
                        </div>
                    </div>
                )}

                {reportType === "leaves" && (
                    <div className="reports-summary">
                        <div className="reports-card">
                            <span>Leave Requests</span>
                            <strong>{filteredLeaves.length}</strong>
                        </div>

                        <div className="reports-card">
                            <span>Approved</span>
                            <strong>{approvedLeaves}</strong>
                        </div>

                        <div className="reports-card">
                            <span>Pending</span>
                            <strong>{pendingLeaves}</strong>
                        </div>
                    </div>
                )}

                <div className="reports-table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                {report.columns.map((column) => (
                                    <th key={column.label} scope="col">
                                        {column.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {report.rows.map((row, index) => {
                                const rowKey =
                                    reportType === "employees"
                                        ? `employee-${row.employee_id}`
                                        : reportType === "attendance"
                                            ? `attendance-${row.attendance_id}`
                                            : `leave-${row.leave_request_id}`;

                                return (
                                    <tr key={rowKey || `${reportType}-${index}`}>
                                        {report.columns.map((column) => (
                                            <td key={column.label}>
                                                {column.value(row) ?? "—"}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}

                            {!report.rows.length && (
                                <tr>
                                    <td colSpan={report.columns.length}>
                                        {loading
                                            ? "Loading records..."
                                            : "No records found for the selected filters."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default AdminReports;
