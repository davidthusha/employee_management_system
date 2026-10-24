
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// LOGIN — Admin and Employee
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const [users] = await pool.query(
            `
            SELECT
                user_id,
                employee_id,
                username,
                password_hash,
                role
            FROM users
            WHERE username = ?
            `,
            [String(username).trim()]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        const user = users[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured");

            return res.status(500).json({
                message: "Authentication is not configured correctly"
            });
        }

        const token = jwt.sign(
            {
                user_id: user.user_id,
                employee_id: user.employee_id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        return res.json({
            message: "Login successful",
            token,
            user: {
                user_id: user.user_id,
                employee_id: user.employee_id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Login failed"
        });
    }
};


// CREATE LOGIN ACCOUNT FOR AN EXISTING EMPLOYEE
const createEmployeeAccount = async (req, res) => {
    try {
        const { employee_id, username, password } = req.body;

        if (
            employee_id === undefined ||
            employee_id === null ||
            !username ||
            !password
        ) {
            return res.status(400).json({
                message: "Employee, username and password are required"
            });
        }

        const cleanUsername = String(username).trim();

        if (cleanUsername.length < 3 || cleanUsername.length > 50) {
            return res.status(400).json({
                message: "Username must contain 3 to 50 characters"
            });
        }

        if (typeof password !== "string" || password.length < 8) {
            return res.status(400).json({
                message: "Password must contain at least 8 characters"
            });
        }

        const employeeId = Number(employee_id);

        if (!Number.isInteger(employeeId) || employeeId <= 0) {
            return res.status(400).json({
                message: "Invalid employee ID"
            });
        }

        // Verify employee exists
        const [employees] = await pool.query(
            `
            SELECT employee_id
            FROM employees
            WHERE employee_id = ?
            LIMIT 1
            `,
            [employeeId]
        );

        if (employees.length === 0) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        // Prevent multiple accounts for the same employee
        const [existingAccounts] = await pool.query(
            `
            SELECT user_id
            FROM users
            WHERE employee_id = ?
            LIMIT 1
            `,
            [employeeId]
        );

        if (existingAccounts.length > 0) {
            return res.status(409).json({
                message: "This employee already has a login account"
            });
        }

        // Hash the password before storing it
        const passwordHash = await bcrypt.hash(password, 10);

        // Create an Employee account
        const [result] = await pool.query(
            `
            INSERT INTO users (
                employee_id,
                username,
                password_hash,
                role
            )
            VALUES (?, ?, ?, 'Employee')
            `,
            [
                employeeId,
                cleanUsername,
                passwordHash
            ]
        );

        return res.status(201).json({
            message: "Employee login account created successfully",
            user_id: result.insertId,
            employee_id: employeeId,
            username: cleanUsername,
            role: "Employee"
        });

    } catch (error) {
        console.error("Create employee account error:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Username or employee account already exists"
            });
        }

        return res.status(500).json({
            message: "Failed to create employee login account"
        });
    }
};


// GET CURRENT LOGGED-IN USER
const getCurrentUser = async (req, res) => {
    try {
        // req.user is populated by authenticateToken middleware.
        const userId = req.user?.user_id;

        if (!userId) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const [users] = await pool.query(
            `
            SELECT
                user_id,
                employee_id,
                username,
                role
            FROM users
            WHERE user_id = ?
            LIMIT 1
            `,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "User account not found"
            });
        }

        return res.json({
            user: users[0]
        });

    } catch (error) {
        console.error("Get current user error:", error);

        return res.status(500).json({
            message: "Failed to retrieve current user"
        });
    }
};


module.exports = {
    login,
    createEmployeeAccount,
    getCurrentUser
};
