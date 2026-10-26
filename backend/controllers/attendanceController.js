
const pool = require("../config/db");

const TIME_ZONE = "Asia/Colombo";
const WORK_START_TIME = "08:30:00";

// Get current date and time in Sri Lanka.
function getSriLankaDateTime() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(new Date());

    const values = {};

    for (const part of parts) {
        if (part.type !== "literal") {
            values[part.type] = part.value;
        }
    }

    return {
        date: `${values.year}-${values.month}-${values.day}`,
        time: `${values.hour}:${values.minute}:${values.second}`
    };
}

// Shared fields for attendance queries.
// is_late is calculated from check-in time, independently of status.
const attendanceSelect = `
    a.attendance_id,
    a.employee_id,
    e.employee_code,
    e.first_name,
    e.last_name,
    DATE_FORMAT(a.attendance_date, '%Y-%m-%d') AS attendance_date,
    TIME_FORMAT(a.check_in, '%H:%i:%s') AS check_in,
    TIME_FORMAT(a.check_out, '%H:%i:%s') AS check_out,
    a.status,
    CASE
        WHEN a.check_in IS NOT NULL
         AND a.check_in > '08:30:00'
        THEN 1
        ELSE 0
    END AS is_late
`;

// ADMIN: Get all attendance records.
const getAttendance = async (req, res) => {
    try {
        const { date, employee_id } = req.query;

        let sql = `
            SELECT ${attendanceSelect}
            FROM attendance a
            INNER JOIN employees e
                ON e.employee_id = a.employee_id
            WHERE 1 = 1
        `;

        const params = [];

        if (date) {
            sql += " AND a.attendance_date = ?";
            params.push(date);
        }

        if (employee_id) {
            sql += " AND a.employee_id = ?";
            params.push(employee_id);
        }

        sql += " ORDER BY a.attendance_date DESC, a.attendance_id DESC";

        const [records] = await pool.query(sql, params);
        return res.json(records);
    } catch (error) {
        console.error("Get attendance error:", error);
        return res.status(500).json({
            message: "Failed to retrieve attendance records"
        });
    }
};

// EMPLOYEE: Get only the logged-in employee's records.
const getMyAttendance = async (req, res) => {
    try {
        const employeeId = req.user?.employee_id;

        if (!employeeId) {
            return res.status(403).json({
                message: "This account is not linked to an employee"
            });
        }

        const [records] = await pool.query(
            `SELECT
                attendance_id,
                employee_id,
                DATE_FORMAT(attendance_date, '%Y-%m-%d') AS attendance_date,
                TIME_FORMAT(check_in, '%H:%i:%s') AS check_in,
                TIME_FORMAT(check_out, '%H:%i:%s') AS check_out,
                status,
                CASE
                    WHEN check_in IS NOT NULL
                     AND check_in > '08:30:00'
                    THEN 1
                    ELSE 0
                END AS is_late
             FROM attendance
             WHERE employee_id = ?
             ORDER BY attendance_date DESC, attendance_id DESC`,
            [employeeId]
        );

        return res.json(records);
    } catch (error) {
        console.error("Get my attendance error:", error);
        return res.status(500).json({
            message: "Failed to retrieve your attendance records"
        });
    }
};

// EMPLOYEE: Check in.
// Every valid check-in is Present; is_late is tracked separately.
const checkIn = async (req, res) => {
    try {
        const employeeId = req.user?.employee_id;

        if (!employeeId) {
            return res.status(403).json({
                message: "This account is not linked to an employee"
            });
        }

        const { date, time } = getSriLankaDateTime();
        const isLate = time > WORK_START_TIME;

        const [employees] = await pool.query(
            `SELECT employee_id
             FROM employees
             WHERE employee_id = ?
             LIMIT 1`,
            [employeeId]
        );

        if (!employees.length) {
            return res.status(404).json({
                message: "Employee record not found"
            });
        }

        const [existing] = await pool.query(
            `SELECT
                attendance_id,
                employee_id,
                DATE_FORMAT(attendance_date, '%Y-%m-%d') AS attendance_date,
                TIME_FORMAT(check_in, '%H:%i:%s') AS check_in,
                TIME_FORMAT(check_out, '%H:%i:%s') AS check_out,
                status,
                CASE
                    WHEN check_in IS NOT NULL
                     AND check_in > '08:30:00'
                    THEN 1
                    ELSE 0
                END AS is_late
             FROM attendance
             WHERE employee_id = ?
               AND attendance_date = ?
             LIMIT 1`,
            [employeeId, date]
        );

        if (existing.length) {
            return res.status(409).json({
                message: "You have already checked in today.",
                attendance: existing[0]
            });
        }

        // Keep the database status as Present, even for a late arrival.
        const [result] = await pool.query(
            `INSERT INTO attendance
                (employee_id, attendance_date, check_in, check_out, status)
             VALUES (?, ?, ?, NULL, 'Present')`,
            [employeeId, date, time]
        );

        return res.status(201).json({
            message: isLate
                ? "Check-in successful. You are present but arrived late."
                : "Check-in successful. You are present.",
            attendance: {
                attendance_id: result.insertId,
                employee_id: employeeId,
                attendance_date: date,
                check_in: time,
                check_out: null,
                status: "Present",
                is_late: isLate ? 1 : 0
            }
        });
    } catch (error) {
        console.error("Check-in error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "You have already checked in today."
            });
        }

        return res.status(500).json({
            message: "Check-in failed. Please try again."
        });
    }
};

// EMPLOYEE: Check out by updating today's existing record.
const checkOut = async (req, res) => {
    try {
        const employeeId = req.user?.employee_id;

        if (!employeeId) {
            return res.status(403).json({
                message: "This account is not linked to an employee"
            });
        }

        const { date, time } = getSriLankaDateTime();

        const [records] = await pool.query(
            `SELECT
                attendance_id,
                employee_id,
                DATE_FORMAT(attendance_date, '%Y-%m-%d') AS attendance_date,
                TIME_FORMAT(check_in, '%H:%i:%s') AS check_in,
                TIME_FORMAT(check_out, '%H:%i:%s') AS check_out,
                status,
                CASE
                    WHEN check_in IS NOT NULL
                     AND check_in > '08:30:00'
                    THEN 1
                    ELSE 0
                END AS is_late
             FROM attendance
             WHERE employee_id = ?
               AND attendance_date = ?
             LIMIT 1`,
            [employeeId, date]
        );

        if (!records.length) {
            return res.status(400).json({
                message: "No attendance record found for today. Please check in first."
            });
        }

        const record = records[0];

        if (!record.check_in) {
            return res.status(400).json({
                message: "Please check in before checking out."
            });
        }

        if (record.check_out) {
            return res.status(409).json({
                message: "You have already checked out today.",
                attendance: record
            });
        }

        const [result] = await pool.query(
            `UPDATE attendance
             SET check_out = ?
             WHERE attendance_id = ?
               AND employee_id = ?
               AND attendance_date = ?
               AND check_out IS NULL`,
            [time, record.attendance_id, employeeId, date]
        );

        if (result.affectedRows === 0) {
            return res.status(409).json({
                message: "Attendance has already been checked out."
            });
        }

        return res.json({
            message: `Check-out successful at ${time.slice(0, 5)}.`,
            attendance: {
                ...record,
                check_out: time
            }
        });
    } catch (error) {
        console.error("Check-out error:", error);
        return res.status(500).json({
            message: "Check-out failed. Please try again."
        });
    }
};

// Get one record. Admin can view any; employees only their own.
const getAttendanceById = async (req, res) => {
    try {
        const [records] = await pool.query(
            `SELECT ${attendanceSelect}
             FROM attendance a
             INNER JOIN employees e
                ON e.employee_id = a.employee_id
             WHERE a.attendance_id = ?
             LIMIT 1`,
            [req.params.id]
        );

        if (!records.length) {
            return res.status(404).json({
                message: "Attendance record not found"
            });
        }

        const record = records[0];

        if (
            req.user.role !== "Admin" &&
            Number(record.employee_id) !== Number(req.user.employee_id)
        ) {
            return res.status(403).json({
                message: "You are not allowed to view this attendance record"
            });
        }

        return res.json(record);
    } catch (error) {
        console.error("Get attendance by ID error:", error);
        return res.status(500).json({
            message: "Failed to retrieve attendance record"
        });
    }
};

// ADMIN: Create attendance manually.
const createAttendance = async (req, res) => {
    try {
        const {
            employee_id,
            attendance_date,
            check_in,
            check_out,
            status
        } = req.body;

        const allowedStatuses = ["Present", "Absent", "Late", "Leave"];

        if (
            employee_id == null ||
            !attendance_date ||
            !status
        ) {
            return res.status(400).json({
                message: "Employee, attendance date and status are required"
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid attendance status"
            });
        }

        if (check_in && check_out && check_out < check_in) {
            return res.status(400).json({
                message: "Check-out time cannot be earlier than check-in time"
            });
        }

        const [employees] = await pool.query(
            "SELECT employee_id FROM employees WHERE employee_id = ?",
            [employee_id]
        );

        if (!employees.length) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        const [existing] = await pool.query(
            `SELECT attendance_id
             FROM attendance
             WHERE employee_id = ? AND attendance_date = ?`,
            [employee_id, attendance_date]
        );

        if (existing.length) {
            return res.status(409).json({
                message: "Attendance already exists for this employee and date"
            });
        }

        const [result] = await pool.query(
            `INSERT INTO attendance
                (employee_id, attendance_date, check_in, check_out, status)
             VALUES (?, ?, ?, ?, ?)`,
            [
                employee_id,
                attendance_date,
                check_in || null,
                check_out || null,
                status
            ]
        );

        return res.status(201).json({
            message: "Attendance recorded successfully",
            attendance_id: result.insertId
        });
    } catch (error) {
        console.error("Create attendance error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Attendance already exists for this employee and date"
            });
        }

        return res.status(500).json({
            message: "Failed to record attendance"
        });
    }
};

// ADMIN: Update attendance manually.
const updateAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            employee_id,
            attendance_date,
            check_in,
            check_out,
            status
        } = req.body;

        const allowedStatuses = ["Present", "Absent", "Late", "Leave"];

        if (
            employee_id == null ||
            !attendance_date ||
            !status
        ) {
            return res.status(400).json({
                message: "Employee, attendance date and status are required"
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid attendance status"
            });
        }

        if (check_in && check_out && check_out < check_in) {
            return res.status(400).json({
                message: "Check-out time cannot be earlier than check-in time"
            });
        }

        const [existingRecord] = await pool.query(
            "SELECT attendance_id FROM attendance WHERE attendance_id = ?",
            [id]
        );

        if (!existingRecord.length) {
            return res.status(404).json({
                message: "Attendance record not found"
            });
        }

        const [employees] = await pool.query(
            "SELECT employee_id FROM employees WHERE employee_id = ?",
            [employee_id]
        );

        if (!employees.length) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        const [duplicates] = await pool.query(
            `SELECT attendance_id
             FROM attendance
             WHERE employee_id = ?
               AND attendance_date = ?
               AND attendance_id <> ?`,
            [employee_id, attendance_date, id]
        );

        if (duplicates.length) {
            return res.status(409).json({
                message: "Another attendance record exists for this employee and date"
            });
        }

        await pool.query(
            `UPDATE attendance
             SET employee_id = ?,
                 attendance_date = ?,
                 check_in = ?,
                 check_out = ?,
                 status = ?
             WHERE attendance_id = ?`,
            [
                employee_id,
                attendance_date,
                check_in || null,
                check_out || null,
                status,
                id
            ]
        );

        return res.json({
            message: "Attendance updated successfully"
        });
    } catch (error) {
        console.error("Update attendance error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Attendance already exists for this employee and date"
            });
        }

        return res.status(500).json({
            message: "Failed to update attendance"
        });
    }
};

// ADMIN: Delete attendance.
const deleteAttendance = async (req, res) => {
    try {
        const [result] = await pool.query(
            "DELETE FROM attendance WHERE attendance_id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Attendance record not found"
            });
        }

        return res.json({
            message: "Attendance deleted successfully"
        });
    } catch (error) {
        console.error("Delete attendance error:", error);
        return res.status(500).json({
            message: "Failed to delete attendance"
        });
    }
};

module.exports = {
    getAttendance,
    getMyAttendance,
    checkIn,
    checkOut,
    getAttendanceById,
    createAttendance,
    updateAttendance,
    deleteAttendance
};
