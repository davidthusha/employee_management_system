
const pool = require("../config/db");

// GET all employees
const getEmployees = async (req, res) => {
    try {
        const [employees] = await pool.query(`
            SELECT 
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
                e.created_at,
                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM users u
                        WHERE u.employee_id = e.employee_id
                    )
                    THEN 1
                    ELSE 0
                END AS has_login_account
            FROM employees e
            LEFT JOIN departments d
                ON e.department_id = d.department_id
            ORDER BY e.employee_id DESC
        `);

        res.json(employees);

    } catch (error) {
        console.error("Error retrieving employees:", error);

        res.status(500).json({
            message: "Failed to retrieve employees"
        });
    }
};


// GET employee by ID
const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;

        const [employees] = await pool.query(
            `
            SELECT 
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
                e.status
            FROM employees e
            LEFT JOIN departments d
                ON e.department_id = d.department_id
            WHERE e.employee_id = ?
            `,
            [id]
        );

        if (employees.length === 0) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        res.json(employees[0]);

    } catch (error) {
        console.error("Error retrieving employee:", error);

        res.status(500).json({
            message: "Failed to retrieve employee"
        });
    }
};


// CREATE employee
const createEmployee = async (req, res) => {
    try {
        const {
            employee_code,
            first_name,
            last_name,
            email,
            phone,
            address,
            date_of_birth,
            hire_date,
            department_id,
            job_title
        } = req.body;

        const [result] = await pool.query(
            `
            INSERT INTO employees
            (
                employee_code,
                first_name,
                last_name,
                email,
                phone,
                address,
                date_of_birth,
                hire_date,
                department_id,
                job_title
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                employee_code,
                first_name,
                last_name,
                email,
                phone,
                address,
                date_of_birth,
                hire_date,
                department_id,
                job_title
            ]
        );

        res.status(201).json({
            message: "Employee created successfully",
            employee_id: result.insertId
        });

    } catch (error) {
        console.error("Error creating employee:", error);

        res.status(500).json({
            message: "Failed to create employee",
            error: error.message
        });
    }
};


// UPDATE employee
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            employee_code,
            first_name,
            last_name,
            email,
            phone,
            address,
            date_of_birth,
            hire_date,
            department_id,
            job_title,
            status
        } = req.body;

        const [result] = await pool.query(
            `
            UPDATE employees
            SET
                employee_code = ?,
                first_name = ?,
                last_name = ?,
                email = ?,
                phone = ?,
                address = ?,
                date_of_birth = ?,
                hire_date = ?,
                department_id = ?,
                job_title = ?,
                status = ?
            WHERE employee_id = ?
            `,
            [
                employee_code,
                first_name,
                last_name,
                email,
                phone,
                address,
                date_of_birth,
                hire_date,
                department_id,
                job_title,
                status,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        res.json({
            message: "Employee updated successfully"
        });

    } catch (error) {
        console.error("Error updating employee:", error);

        res.status(500).json({
            message: "Failed to update employee",
            error: error.message
        });
    }
};


// DELETE employee
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            "DELETE FROM employees WHERE employee_id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        res.json({
            message: "Employee deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting employee:", error);

        res.status(500).json({
            message: "Failed to delete employee",
            error: error.message
        });
    }
};


const getMyEmployee = async (req, res) => {
    try {
        const employeeId = req.user?.employee_id;

        if (!employeeId) {
            return res.status(403).json({
                message: "This account is not linked to an employee"
            });
        }

        const [employees] = await pool.query(
            `SELECT
                e.employee_id,
                e.employee_code,
                e.first_name,
                e.last_name,
                e.department_id,
                d.department_name,
                e.job_title,
                e.status
             FROM employees e
             LEFT JOIN departments d
                ON e.department_id = d.department_id
             WHERE e.employee_id = ?
             LIMIT 1`,
            [employeeId]
        );

        if (employees.length === 0) {
            return res.status(404).json({
                message: "Employee record not found"
            });
        }

        return res.json(employees[0]);
    } catch (error) {
        console.error("Get my employee error:", error);

        return res.status(500).json({
            message: "Failed to retrieve employee details"
        });
    }
};

module.exports = {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getMyEmployee
};
