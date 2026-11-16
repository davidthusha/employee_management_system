
const pool = require("../config/db");

const ALLOWED_DECISIONS = ["Approved", "Rejected"];
const ALLOWED_STATUSES = ["Pending", "Approved", "Rejected", "Cancelled"];

function sriLankaDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Colombo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const values = {};
    for (const part of parts) {
        if (part.type !== "literal") values[part.type] = part.value;
    }

    return `${values.year}-${values.month}-${values.day}`;
}

function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);

    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
}

function workingDays(start, end) {
    let count = 0;
    const current = new Date(`${start}T00:00:00Z`);
    const last = new Date(`${end}T00:00:00Z`);

    while (current <= last) {
        const weekday = current.getUTCDay();

        if (weekday !== 0 && weekday !== 6) {
            count++;
        }

        current.setUTCDate(current.getUTCDate() + 1);
    }

    return count;
}

function positiveId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function getEmployeeId(req) {
    return positiveId(req.user?.employee_id);
}

async function getActiveType(connection, id) {
    const [rows] = await connection.query(
        `SELECT leave_type_id, leave_type_name, annual_allowance,
                requires_balance, is_active
         FROM leave_types
         WHERE leave_type_id = ? AND is_active = 1
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
}

async function ensureBalance(connection, employeeId, type, year) {
    if (!Number(type.requires_balance)) return null;

    await connection.query(
        `INSERT IGNORE INTO leave_balances
            (employee_id, leave_type_id, leave_year, entitled_days)
         VALUES (?, ?, ?, ?)`,
        [
            employeeId,
            type.leave_type_id,
            year,
            Number(type.annual_allowance || 0)
        ]
    );

    const [rows] = await connection.query(
        `SELECT *
         FROM leave_balances
         WHERE employee_id = ?
           AND leave_type_id = ?
           AND leave_year = ?
         FOR UPDATE`,
        [employeeId, type.leave_type_id, year]
    );

    return rows[0] || null;
}

async function balanceSummary(connection, employeeId, type, year) {
    if (!Number(type.requires_balance)) {
        return {
            leave_type_id: type.leave_type_id,
            leave_type_name: type.leave_type_name,
            leave_year: year,
            entitled_days: null,
            carried_forward_days: 0,
            used_days: null,
            pending_days: null,
            remaining_days: null,
            requires_balance: false
        };
    }

    const [balanceRows] = await connection.query(
        `SELECT entitled_days, carried_forward_days
         FROM leave_balances
         WHERE employee_id = ?
           AND leave_type_id = ?
           AND leave_year = ?`,
        [employeeId, type.leave_type_id, year]
    );

    const [usageRows] = await connection.query(
        `SELECT
            COALESCE(SUM(
                CASE WHEN status = 'Approved'
                     THEN requested_days ELSE 0 END
            ), 0) AS used_days,
            COALESCE(SUM(
                CASE WHEN status = 'Pending'
                     THEN requested_days ELSE 0 END
            ), 0) AS pending_days
         FROM leave_requests
         WHERE employee_id = ?
           AND leave_type_id = ?
           AND YEAR(start_date) = ?`,
        [employeeId, type.leave_type_id, year]
    );

    const balance = balanceRows[0] || {
        entitled_days: 0,
        carried_forward_days: 0
    };

    const entitled = Number(balance.entitled_days || 0);
    const carried = Number(balance.carried_forward_days || 0);
    const used = Number(usageRows[0].used_days || 0);
    const pending = Number(usageRows[0].pending_days || 0);

    return {
        leave_type_id: type.leave_type_id,
        leave_type_name: type.leave_type_name,
        leave_year: year,
        entitled_days: entitled,
        carried_forward_days: carried,
        used_days: used,
        pending_days: pending,
        remaining_days: Math.max(0, entitled + carried - used - pending),
        requires_balance: true
    };
}

// GET /api/leaves/types
const getLeaveTypes = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT leave_type_id, leave_type_name,
                    annual_allowance, requires_balance, is_active
             FROM leave_types
             WHERE is_active = 1
             ORDER BY leave_type_id`
        );

        return res.json(rows);
    } catch (error) {
        console.error("getLeaveTypes:", error);
        return res.status(500).json({
            message: "Failed to retrieve leave types."
        });
    }
};

// PUT /api/leaves/types/:id
const updateLeaveType = async (req, res) => {
    const id = positiveId(req.params.id);
    const { annual_allowance, is_active } = req.body;

    if (!id) {
        return res.status(400).json({ message: "Invalid leave type ID." });
    }

    const allowance =
        annual_allowance === null || annual_allowance === ""
            ? null
            : Number(annual_allowance);

    if (
        allowance !== null &&
        (!Number.isFinite(allowance) || allowance < 0 || allowance > 365)
    ) {
        return res.status(400).json({
            message: "Allowance must be between 0 and 365 days, or blank for no fixed allowance."
        });
    }

    if (
        is_active !== undefined &&
        ![true, false, 0, 1, "0", "1", "true", "false"].includes(is_active)
    ) {
        return res.status(400).json({ message: "Invalid active status." });
    }

    try {
        const activeValue = is_active === undefined
            ? null
            : ([true, 1, "1", "true"].includes(is_active) ? 1 : 0);

        const [result] = await pool.query(
            `UPDATE leave_types
             SET annual_allowance = ?,
                 is_active = COALESCE(?, is_active)
             WHERE leave_type_id = ?`,
            [allowance, activeValue, id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Leave type not found." });
        }

        if (allowance !== null) {
            await pool.query(
                `UPDATE leave_balances b
                 SET b.entitled_days = ?
                 WHERE b.leave_type_id = ?
                   AND NOT EXISTS (
                       SELECT 1
                       FROM leave_requests lr
                       WHERE lr.employee_id = b.employee_id
                         AND lr.leave_type_id = b.leave_type_id
                         AND YEAR(lr.start_date) = b.leave_year
                         AND lr.status IN ('Pending', 'Approved')
                   )`,
                [allowance, id]
            );
        }

        return res.json({ message: "Leave type updated successfully." });
    } catch (error) {
        console.error("updateLeaveType:", error);
        return res.status(500).json({
            message: "Failed to update leave type."
        });
    }
};

// GET /api/leaves/me/balances?year=2026
const getMyBalances = async (req, res) => {
    const employeeId = getEmployeeId(req);

    if (!employeeId) {
        return res.status(403).json({
            message: "Your account is not linked to an employee."
        });
    }

    const year = req.query.year
        ? Number(req.query.year)
        : Number(sriLankaDate().slice(0, 4));

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return res.status(400).json({ message: "Invalid leave year." });
    }

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [types] = await connection.query(
            `SELECT *
             FROM leave_types
             WHERE is_active = 1
             ORDER BY leave_type_id`
        );

        const balances = [];

        for (const type of types) {
            if (Number(type.requires_balance)) {
                await ensureBalance(connection, employeeId, type, year);
            }

            balances.push(
                await balanceSummary(connection, employeeId, type, year)
            );
        }

        await connection.commit();
        return res.json(balances);
    } catch (error) {
        if (connection) await connection.rollback();

        console.error("getMyBalances:", error);
        return res.status(500).json({
            message: "Failed to retrieve leave balances."
        });
    } finally {
        if (connection) connection.release();
    }
};

// GET /api/leaves/me/requests
const getMyLeaveRequests = async (req, res) => {
    const employeeId = getEmployeeId(req);

    if (!employeeId) {
        return res.status(403).json({
            message: "Your account is not linked to an employee."
        });
    }

    try {
        const [rows] = await pool.query(
            `SELECT
                lr.leave_request_id,
                lr.employee_id,
                lr.leave_type_id,
                lt.leave_type_name,
                DATE_FORMAT(lr.start_date, '%Y-%m-%d') AS start_date,
                DATE_FORMAT(lr.end_date, '%Y-%m-%d') AS end_date,
                lr.requested_days,
                lr.reason,
                lr.status,
                lr.applied_at,
                lr.reviewed_at,
                lr.admin_comment,
                reviewer.username AS reviewer_username
             FROM leave_requests lr
             INNER JOIN leave_types lt
                ON lt.leave_type_id = lr.leave_type_id
             LEFT JOIN users reviewer
                ON reviewer.user_id = lr.reviewed_by
             WHERE lr.employee_id = ?
             ORDER BY lr.applied_at DESC, lr.leave_request_id DESC`,
            [employeeId]
        );

        return res.json(rows);
    } catch (error) {
        console.error("getMyLeaveRequests:", error);
        return res.status(500).json({
            message: "Failed to retrieve your leave requests."
        });
    }
};

// POST /api/leaves/me/requests
const applyForLeave = async (req, res) => {
    const employeeId = getEmployeeId(req);

    if (!employeeId) {
        return res.status(403).json({
            message: "Your account is not linked to an employee."
        });
    }

    const { leave_type_id, start_date, end_date, reason } = req.body;

    if (
        !positiveId(leave_type_id) ||
        !validDate(start_date) ||
        !validDate(end_date) ||
        end_date < start_date ||
        typeof reason !== "string" ||
        !reason.trim()
    ) {
        return res.status(400).json({
            message: "Select a leave type, valid dates and provide a reason."
        });
    }

    if (start_date < sriLankaDate()) {
        return res.status(400).json({
            message: "Leave cannot be applied for dates in the past."
        });
    }

    if (start_date.slice(0, 4) !== end_date.slice(0, 4)) {
        return res.status(400).json({
            message: "Submit separate applications for different calendar years."
        });
    }

    if (reason.trim().length > 2000) {
        return res.status(400).json({
            message: "Reason must be 2000 characters or fewer."
        });
    }

    const days = workingDays(start_date, end_date);

    if (days < 1) {
        return res.status(400).json({
            message: "Selected dates contain no working days."
        });
    }

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const type = await getActiveType(connection, Number(leave_type_id));

        if (!type) {
            await connection.rollback();
            return res.status(400).json({
                message: "Selected leave type is unavailable."
            });
        }

        const year = Number(start_date.slice(0, 4));

        if (Number(type.requires_balance)) {
            await ensureBalance(connection, employeeId, type, year);
        }

        const [overlaps] = await connection.query(
            `SELECT leave_request_id
             FROM leave_requests
             WHERE employee_id = ?
               AND status IN ('Pending', 'Approved')
               AND start_date <= ?
               AND end_date >= ?
             LIMIT 1`,
            [employeeId, end_date, start_date]
        );

        if (overlaps.length) {
            await connection.rollback();
            return res.status(409).json({
                message: "These dates overlap an existing pending or approved request."
            });
        }

        if (Number(type.requires_balance)) {
            const summary = await balanceSummary(connection, employeeId, type, year);

            if (days > summary.remaining_days) {
                await connection.rollback();
                return res.status(400).json({
                    message: `Insufficient ${type.leave_type_name} balance. Available: ${summary.remaining_days} day(s).`,
                    available_days: summary.remaining_days,
                    requested_days: days
                });
            }
        }

        const [result] = await connection.query(
            `INSERT INTO leave_requests
                (employee_id, leave_type_id, start_date, end_date,
                 requested_days, reason, status)
             VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
            [employeeId, type.leave_type_id, start_date, end_date, days, reason.trim()]
        );

        await connection.commit();

        return res.status(201).json({
            message: "Leave application submitted and is awaiting approval.",
            leave_request_id: result.insertId,
            requested_days: days,
            status: "Pending"
        });
    } catch (error) {
        if (connection) await connection.rollback();

        console.error("applyForLeave:", error);
        return res.status(500).json({
            message: "Failed to submit leave application."
        });
    } finally {
        if (connection) connection.release();
    }
};

// PUT /api/leaves/me/requests/:id/cancel
const cancelMyLeaveRequest = async (req, res) => {
    const employeeId = getEmployeeId(req);
    const id = positiveId(req.params.id);

    if (!employeeId) {
        return res.status(403).json({
            message: "Your account is not linked to an employee."
        });
    }

    if (!id) {
        return res.status(400).json({ message: "Invalid request ID." });
    }

    try {
        const [result] = await pool.query(
            `UPDATE leave_requests
             SET status = 'Cancelled'
             WHERE leave_request_id = ?
               AND employee_id = ?
               AND status = 'Pending'`,
            [id, employeeId]
        );

        if (!result.affectedRows) {
            return res.status(409).json({
                message: "Only pending requests can be cancelled."
            });
        }

        return res.json({ message: "Leave application cancelled." });
    } catch (error) {
        console.error("cancelMyLeaveRequest:", error);
        return res.status(500).json({
            message: "Failed to cancel request."
        });
    }
};

// GET /api/leaves/requests?status=Pending
const getAllLeaveRequests = async (req, res) => {
    try {
        const { status, employee_id } = req.query;

        if (status && !ALLOWED_STATUSES.includes(status)) {
            return res.status(400).json({ message: "Invalid status." });
        }

        let sql = `
            SELECT
                lr.leave_request_id,
                lr.employee_id,
                e.employee_code,
                e.first_name,
                e.last_name,
                lt.leave_type_name,
                lr.leave_type_id,
                DATE_FORMAT(lr.start_date, '%Y-%m-%d') AS start_date,
                DATE_FORMAT(lr.end_date, '%Y-%m-%d') AS end_date,
                lr.requested_days,
                lr.reason,
                lr.status,
                lr.applied_at,
                lr.reviewed_at,
                lr.admin_comment,
                reviewer.username AS reviewer_username
            FROM leave_requests lr
            INNER JOIN employees e ON e.employee_id = lr.employee_id
            INNER JOIN leave_types lt ON lt.leave_type_id = lr.leave_type_id
            LEFT JOIN users reviewer ON reviewer.user_id = lr.reviewed_by
            WHERE 1 = 1`;

        const params = [];

        if (status) {
            sql += " AND lr.status = ?";
            params.push(status);
        }

        if (employee_id) {
            const id = positiveId(employee_id);

            if (!id) {
                return res.status(400).json({ message: "Invalid employee ID." });
            }

            sql += " AND lr.employee_id = ?";
            params.push(id);
        }

        sql += ` ORDER BY FIELD(lr.status, 'Pending', 'Approved', 'Rejected', 'Cancelled'),
                 lr.applied_at DESC`;

        const [rows] = await pool.query(sql, params);
        return res.json(rows);
    } catch (error) {
        console.error("getAllLeaveRequests:", error);
        return res.status(500).json({
            message: "Failed to retrieve leave requests."
        });
    }
};

// PUT /api/leaves/requests/:id/decision
const reviewLeaveRequest = async (req, res) => {
    const id = positiveId(req.params.id);
    const { decision, admin_comment } = req.body;

    if (!id) {
        return res.status(400).json({ message: "Invalid request ID." });
    }

    if (!ALLOWED_DECISIONS.includes(decision)) {
        return res.status(400).json({
            message: "Decision must be Approved or Rejected."
        });
    }

    if (
        admin_comment !== undefined &&
        (typeof admin_comment !== "string" || admin_comment.length > 2000)
    ) {
        return res.status(400).json({
            message: "Comment must be 2000 characters or fewer."
        });
    }

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Format the dates in SQL so Node.js always receives YYYY-MM-DD strings.
        const [rows] = await connection.query(
            `SELECT
                lr.*,
                DATE_FORMAT(lr.start_date, '%Y-%m-%d') AS start_date_iso,
                DATE_FORMAT(lr.end_date, '%Y-%m-%d') AS end_date_iso,
                YEAR(lr.start_date) AS leave_year,
                lt.leave_type_name,
                lt.annual_allowance,
                lt.requires_balance
             FROM leave_requests lr
             INNER JOIN leave_types lt
                ON lt.leave_type_id = lr.leave_type_id
             WHERE lr.leave_request_id = ?
             FOR UPDATE`,
            [id]
        );

        if (!rows.length) {
            await connection.rollback();
            return res.status(404).json({ message: "Leave request not found." });
        }

        const request = rows[0];

        if (request.status !== "Pending") {
            await connection.rollback();
            return res.status(409).json({
                message: "This request is no longer pending."
            });
        }

        if (decision === "Approved") {
            if (Number(request.requires_balance)) {
                const type = {
                    leave_type_id: request.leave_type_id,
                    leave_type_name: request.leave_type_name,
                    annual_allowance: request.annual_allowance,
                    requires_balance: request.requires_balance
                };

                const balance = await ensureBalance(
                    connection,
                    request.employee_id,
                    type,
                    Number(request.leave_year)
                );

                const [usage] = await connection.query(
                    `SELECT
                        COALESCE(SUM(CASE WHEN status = 'Approved'
                            THEN requested_days ELSE 0 END), 0) AS used_days,
                        COALESCE(SUM(CASE WHEN status = 'Pending'
                            AND leave_request_id <> ?
                            THEN requested_days ELSE 0 END), 0) AS pending_days
                     FROM leave_requests
                     WHERE employee_id = ?
                       AND leave_type_id = ?
                       AND YEAR(start_date) = ?`,
                    [
                        id,
                        request.employee_id,
                        request.leave_type_id,
                        Number(request.leave_year)
                    ]
                );

                const available =
                    Number(balance.entitled_days || 0) +
                    Number(balance.carried_forward_days || 0) -
                    Number(usage[0].used_days || 0) -
                    Number(usage[0].pending_days || 0);

                if (Number(request.requested_days) > available) {
                    await connection.rollback();
                    return res.status(409).json({
                        message: `Cannot approve: only ${Math.max(0, available)} day(s) remain after other pending requests.`
                    });
                }
            }

            const [overlaps] = await connection.query(
                `SELECT leave_request_id
                 FROM leave_requests
                 WHERE employee_id = ?
                   AND leave_request_id <> ?
                   AND status IN ('Pending', 'Approved')
                   AND start_date <= ?
                   AND end_date >= ?
                 LIMIT 1`,
                [
                    request.employee_id,
                    id,
                    request.end_date_iso,
                    request.start_date_iso
                ]
            );

            if (overlaps.length) {
                await connection.rollback();
                return res.status(409).json({
                    message: "Cannot approve because these dates overlap another pending or approved request."
                });
            }

            // Update the request within the same transaction as attendance creation.
            await connection.query(
                `UPDATE leave_requests
                 SET status = 'Approved',
                     reviewed_by = ?,
                     reviewed_at = NOW(),
                     admin_comment = ?
                 WHERE leave_request_id = ?`,
                [
                    req.user.user_id,
                    typeof admin_comment === "string"
                        ? admin_comment.trim() || null
                        : null,
                    id
                ]
            );

            const start = new Date(`${request.start_date_iso}T00:00:00Z`);
            const end = new Date(`${request.end_date_iso}T00:00:00Z`);

            if (
                Number.isNaN(start.getTime()) ||
                Number.isNaN(end.getTime())
            ) {
                throw new Error(
                    `Invalid leave dates for request ${id}: ` +
                    `${request.start_date_iso} to ${request.end_date_iso}`
                );
            }

            let leaveAttendanceCreated = 0;
            let existingAttendanceFound = 0;

            for (
                const dateCursor = new Date(start);
                dateCursor <= end;
                dateCursor.setUTCDate(dateCursor.getUTCDate() + 1)
            ) {
                const weekday = dateCursor.getUTCDay();

                // Only create attendance for Monday to Friday.
                if (weekday === 0 || weekday === 6) continue;

                const date = dateCursor.toISOString().slice(0, 10);

                const [result] = await connection.query(
                    `INSERT INTO attendance
                        (employee_id, attendance_date, check_in, check_out, status)
                     SELECT ?, ?, NULL, NULL, 'Leave'
                     WHERE NOT EXISTS (
                         SELECT 1
                         FROM attendance
                         WHERE employee_id = ?
                           AND attendance_date = ?
                     )`,
                    [
                        request.employee_id,
                        date,
                        request.employee_id,
                        date
                    ]
                );

                if (result.affectedRows > 0) {
                    leaveAttendanceCreated += result.affectedRows;
                } else {
                    existingAttendanceFound++;
                }
            }

            console.log(
                `[Leave Approval] Request=${id}, ` +
                `Employee=${request.employee_id}, ` +
                `Dates=${request.start_date_iso} to ${request.end_date_iso}, ` +
                `Leave attendance created=${leaveAttendanceCreated}, ` +
                `Existing attendance rows skipped=${existingAttendanceFound}`
            );
        } else {
            await connection.query(
                `UPDATE leave_requests
                 SET status = 'Rejected',
                     reviewed_by = ?,
                     reviewed_at = NOW(),
                     admin_comment = ?
                 WHERE leave_request_id = ?`,
                [
                    req.user.user_id,
                    typeof admin_comment === "string"
                        ? admin_comment.trim() || null
                        : null,
                    id
                ]
            );
        }

        await connection.commit();

        return res.json({
            message: decision === "Approved"
                ? "Leave approved. Missing weekday attendance rows were marked as Leave."
                : "Leave request rejected.",
            leave_request_id: id,
            status: decision
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Leave approval rollback error:", rollbackError);
            }
        }

        console.error("reviewLeaveRequest error:", error);
        console.error("Database error code:", error.code);
        console.error("Database error message:", error.sqlMessage);

        return res.status(500).json({
            message: "Failed to review leave request."
        });
    } finally {
        if (connection) connection.release();
    }
};

// GET /api/leaves/employees/:employeeId/balances?year=2026
const getEmployeeBalances = async (req, res) => {
    const employeeId = positiveId(req.params.employeeId);
    const year = req.query.year
        ? Number(req.query.year)
        : Number(sriLankaDate().slice(0, 4));

    if (!employeeId || !Number.isInteger(year) || year < 2000 || year > 2100) {
        return res.status(400).json({
            message: "Valid employee ID and year are required."
        });
    }

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [types] = await connection.query(
            `SELECT * FROM leave_types ORDER BY leave_type_id`
        );

        const balances = [];

        for (const type of types) {
            if (Number(type.requires_balance)) {
                await ensureBalance(connection, employeeId, type, year);
            }

            balances.push(
                await balanceSummary(connection, employeeId, type, year)
            );
        }

        await connection.commit();
        return res.json(balances);
    } catch (error) {
        if (connection) await connection.rollback();

        console.error("getEmployeeBalances:", error);
        return res.status(500).json({
            message: "Failed to retrieve employee balances."
        });
    } finally {
        if (connection) connection.release();
    }
};

// PUT /api/leaves/employees/:employeeId/balances/:leaveTypeId
const updateEmployeeBalance = async (req, res) => {
    const employeeId = positiveId(req.params.employeeId);
    const typeId = positiveId(req.params.leaveTypeId);
    const year = Number(req.body.leave_year);
    const entitled = Number(req.body.entitled_days);
    const carried = req.body.carried_forward_days === undefined
        ? 0
        : Number(req.body.carried_forward_days);

    if (
        !employeeId ||
        !typeId ||
        !Number.isInteger(year) ||
        year < 2000 ||
        year > 2100 ||
        !Number.isFinite(entitled) ||
        entitled < 0 ||
        entitled > 366 ||
        !Number.isFinite(carried) ||
        carried < 0 ||
        carried > 366
    ) {
        return res.status(400).json({
            message: "Provide a valid year, entitlement and carry-forward amount."
        });
    }

    try {
        const [types] = await pool.query(
            `SELECT leave_type_id, requires_balance
             FROM leave_types
             WHERE leave_type_id = ?`,
            [typeId]
        );

        if (!types.length) {
            return res.status(404).json({ message: "Leave type not found." });
        }

        if (!Number(types[0].requires_balance)) {
            return res.status(400).json({
                message: "This leave type does not use a balance."
            });
        }

        const [employees] = await pool.query(
            `SELECT employee_id FROM employees WHERE employee_id = ?`,
            [employeeId]
        );

        if (!employees.length) {
            return res.status(404).json({ message: "Employee not found." });
        }

        await pool.query(
            `INSERT INTO leave_balances
                (employee_id, leave_type_id, leave_year,
                 entitled_days, carried_forward_days)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                entitled_days = VALUES(entitled_days),
                carried_forward_days = VALUES(carried_forward_days)`,
            [employeeId, typeId, year, entitled, carried]
        );

        return res.json({ message: "Employee leave balance updated." });
    } catch (error) {
        console.error("updateEmployeeBalance:", error);
        return res.status(500).json({
            message: "Failed to update employee leave balance."
        });
    }
};

module.exports = {
    getLeaveTypes,
    updateLeaveType,
    getMyBalances,
    getMyLeaveRequests,
    applyForLeave,
    cancelMyLeaveRequest,
    getAllLeaveRequests,
    reviewLeaveRequest,
    getEmployeeBalances,
    updateEmployeeBalance
};
