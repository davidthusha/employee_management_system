
const pool = require("../config/db");

// GET attendance records, optionally filtered by date or employee
const getAttendance = async (req, res) => {
    try {
        const { date, employee_id } = req.query;

        let sql = `
            SELECT
                a.attendance_id,
                a.employee_id,
                e.employee_code,
                e.first_name,
                e.last_name,
                a.attendance_date,
                a.check_in,
                a.check_out,
                a.status
            FROM attendance a
            INNER JOIN employees e
                ON a.employee_id = e.employee_id
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

        res.json(records);
    } catch (error) {
        console.error("Get attendance error:", error);

        res.status(500).json({
            message: "Failed to retrieve attendance records"
        });
    }
};


// GET attendance record by ID
const getAttendanceById = async (req, res) => {
    try {
        const { id } = req.params;

        const [records] = await pool.query(
            `SELECT
                a.attendance_id,
                a.employee_id,
                e.employee_code,
                e.first_name,
                e.last_name,
                a.attendance_date,
                a.check_in,
                a.check_out,
                a.status
             FROM attendance a
             INNER JOIN employees e
                ON a.employee_id = e.employee_id
             WHERE a.attendance_id = ?`,
            [id]
        );

        if (records.length === 0) {
            return res.status(404).json({
                message: "Attendance record not found"
            });
        }

        res.json(records[0]);
    } catch (error) {
        console.error("Get attendance record error:", error);

        res.status(500).json({
            message: "Failed to retrieve attendance record"
        });
    }
};


// CREATE attendance record
const createAttendance = async (req, res) => {
    try {
        const {
            employee_id,
            attendance_date,
            check_in,
            check_out,
            status
        } = req.body;

        const allowedStatuses = [
            "Present",
            "Absent",
            "Late",
            "Leave"
        ];

        if (!employee_id || !attendance_date || !status) {
            return res.status(400).json({
                message: "Employee, attendance date and status are required"
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid attendance status"
            });
        }

        if (
            check_in &&
            check_out &&
            check_out < check_in
        ) {
            return res.status(400).json({
                message: "Check-out time cannot be earlier than check-in time"
            });
        }

        // Verify employee exists
        const [employees] = await pool.query(
            "SELECT employee_id FROM employees WHERE employee_id = ?",
            [employee_id]
        );

        if (employees.length === 0) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        // Prevent duplicate records for the same employee and date
        const [existing] = await pool.query(
            `SELECT attendance_id
             FROM attendance
             WHERE employee_id = ?
               AND attendance_date = ?`,
            [employee_id, attendance_date]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: "Attendance has already been recorded for this employee on this date"
            });
        }

        const [result] = await pool.query(
            `INSERT INTO attendance (
                employee_id,
                attendance_date,
                check_in,
                check_out,
                status
            )
            VALUES (?, ?, ?, ?, ?)`,
            [
                employee_id,
                attendance_date,
                check_in || null,
                check_out || null,
                status
            ]
        );

        res.status(201).json({
            message: "Attendance recorded successfully",
            attendance_id: result.insertId
        });
    } catch (error) {
        console.error("Create attendance error:", error);

        res.status(500).json({
            message: "Failed to record attendance"
        });
    }
};


// UPDATE attendance record
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

        const allowedStatuses = [
            "Present",
            "Absent",
            "Late",
            "Leave"
        ];

        if (
            !employee_id ||
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

        if (
            check_in &&
            check_out &&
            check_out < check_in
        ) {
            return res.status(400).json({
                message: "Check-out time cannot be earlier than check-in time"
            });
        }

        const [existingRecord] = await pool.query(
            "SELECT attendance_id FROM attendance WHERE attendance_id = ?",
            [id]
        );

        if (existingRecord.length === 0) {
            return res.status(404).json({
                message: "Attendance record not found"
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

        if (duplicates.length > 0) {
            return res.status(409).json({
                message: "Another attendance record already exists for this employee on this date"
            });
        }

        const [result] = await pool.query(
            `UPDATE attendance
             SET
                employee_id = ?,
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

        res.json({
            message: "Attendance updated successfully"
        });
    } catch (error) {
        console.error("Update attendance error:", error);

        res.status(500).json({
            message: "Failed to update attendance"
        });
    }
};


// DELETE attendance record
const deleteAttendance = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            "DELETE FROM attendance WHERE attendance_id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Attendance record not found"
            });
        }

        res.json({
            message: "Attendance deleted successfully"
        });
    } catch (error) {
        console.error("Delete attendance error:", error);

        res.status(500).json({
            message: "Failed to delete attendance"
        });
    }
};


module.exports = {
    getAttendance,
    getAttendanceById,
    createAttendance,
    updateAttendance,
    deleteAttendance
};
