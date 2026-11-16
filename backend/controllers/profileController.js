
const bcrypt = require("bcrypt");
const pool = require("../config/db");

// GET /api/profile
// Retrieve the authenticated employee's own profile.
const getMyProfile = async (req, res) => {
    try {
        if (req.user?.role !== "Employee" || !req.user.employee_id) {
            return res.status(403).json({
                message: "This endpoint is available to employee accounts only."
            });
        }

        const employeeId = req.user.employee_id;

        const [rows] = await pool.query(
            `SELECT
                e.employee_id,
                e.employee_code,
                e.first_name,
                e.last_name,
                e.email,
                e.phone,
                e.address,
                e.date_of_birth,
                e.hire_date,
                e.department_id,
                d.department_name,
                e.job_title,
                e.status,
                u.user_id,
                u.username
             FROM employees e
             INNER JOIN users u
                ON u.employee_id = e.employee_id
             LEFT JOIN departments d
                ON d.department_id = e.department_id
             WHERE e.employee_id = ?
               AND u.user_id = ?
             LIMIT 1`,
            [employeeId, req.user.user_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Employee profile not found."
            });
        }

        return res.json({ profile: rows[0] });
    } catch (error) {
        console.error("Get employee profile error:", error);

        return res.status(500).json({
            message: "Failed to retrieve your profile."
        });
    }
};


// PUT /api/profile
// Employees can update only their own permitted personal details.
const updateMyProfile = async (req, res) => {
    try {
        if (req.user?.role !== "Employee" || !req.user.employee_id) {
            return res.status(403).json({
                message: "This endpoint is available to employee accounts only."
            });
        }

        const employeeId = req.user.employee_id;
        const userId = req.user.user_id;

        const allowedFields = {
            email: "email",
            phone: "phone",
            address: "address",
            date_of_birth: "date_of_birth"
        };

        const updates = [];
        const values = [];

        for (const [requestField, databaseField] of Object.entries(allowedFields)) {
            if (Object.prototype.hasOwnProperty.call(req.body, requestField)) {
                let value = req.body[requestField];

                if (typeof value === "string") {
                    value = value.trim();
                }

                if (value === "") {
                    value = null;
                }

                if (requestField === "email") {
                    if (typeof value !== "string" || !value) {
                        return res.status(400).json({
                            message: "Email address is required."
                        });
                    }

                    if (
                        value.length > 100 ||
                        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                    ) {
                        return res.status(400).json({
                            message: "Please provide a valid email address."
                        });
                    }
                }

                if (requestField === "phone" && value !== null) {
                    if (
                        typeof value !== "string" ||
                        value.length > 20
                    ) {
                        return res.status(400).json({
                            message: "Phone number must not exceed 20 characters."
                        });
                    }
                }

                if (requestField === "address" && value !== null) {
                    if (
                        typeof value !== "string" ||
                        value.length > 255
                    ) {
                        return res.status(400).json({
                            message: "Address must not exceed 255 characters."
                        });
                    }
                }

                if (requestField === "date_of_birth" && value !== null) {
                    if (
                        typeof value !== "string" ||
                        !/^\d{4}-\d{2}-\d{2}$/.test(value)
                    ) {
                        return res.status(400).json({
                            message: "Date of birth must use YYYY-MM-DD format."
                        });
                    }

                    const parsedDate = new Date(`${value}T00:00:00Z`);

                    if (
                        Number.isNaN(parsedDate.getTime()) ||
                        parsedDate.toISOString().slice(0, 10) !== value
                    ) {
                        return res.status(400).json({
                            message: "Please provide a valid date of birth."
                        });
                    }

                    if (parsedDate > new Date()) {
                        return res.status(400).json({
                            message: "Date of birth cannot be in the future."
                        });
                    }
                }

                updates.push(`${databaseField} = ?`);
                values.push(value);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                message: "No permitted profile fields were provided."
            });
        }

        // Confirm the account is still linked to this employee.
        const [accounts] = await pool.query(
            `SELECT user_id
             FROM users
             WHERE user_id = ?
               AND employee_id = ?
               AND role = 'Employee'
             LIMIT 1`,
            [userId, employeeId]
        );

        if (accounts.length === 0) {
            return res.status(403).json({
                message: "Your employee account could not be verified."
            });
        }

        values.push(employeeId);

        await pool.query(
            `UPDATE employees
             SET ${updates.join(", ")}
             WHERE employee_id = ?`,
            values
        );

        return res.json({
            message: "Your profile was updated successfully."
        });
    } catch (error) {
        console.error("Update employee profile error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "This email address is already being used."
            });
        }

        if (error.code === "ER_DATA_TOO_LONG") {
            return res.status(400).json({
                message: "One or more fields exceed the allowed length."
            });
        }

        return res.status(500).json({
            message: "Failed to update your profile."
        });
    }
};


// PUT /api/profile/password
// Change the authenticated employee's password.
const changeMyPassword = async (req, res) => {
    try {
        if (req.user?.role !== "Employee" || !req.user.employee_id) {
            return res.status(403).json({
                message: "This endpoint is available to employee accounts only."
            });
        }

        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                message: "Current password, new password and confirmation are required."
            });
        }

        if (
            typeof newPassword !== "string" ||
            newPassword.length < 8 ||
            newPassword.length > 72
        ) {
            return res.status(400).json({
                message: "New password must contain between 8 and 72 characters."
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "New password and confirmation do not match."
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({
                message: "Your new password must be different from your current password."
            });
        }

        const [users] = await pool.query(
            `SELECT user_id, password_hash
             FROM users
             WHERE user_id = ?
               AND employee_id = ?
               AND role = 'Employee'
             LIMIT 1`,
            [req.user.user_id, req.user.employee_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "Employee account not found."
            });
        }

        const user = users[0];

        const passwordMatches = await bcrypt.compare(
            currentPassword,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(400).json({
                message: "Your current password is incorrect."
            });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        await pool.query(
            `UPDATE users
             SET password_hash = ?
             WHERE user_id = ?
               AND employee_id = ?
               AND role = 'Employee'`,
            [passwordHash, req.user.user_id, req.user.employee_id]
        );

        return res.json({
            message: "Password changed successfully. Please sign in again."
        });
    } catch (error) {
        console.error("Change employee password error:", error);

        return res.status(500).json({
            message: "Failed to change your password."
        });
    }
};

module.exports = {
    getMyProfile,
    updateMyProfile,
    changeMyPassword
};
