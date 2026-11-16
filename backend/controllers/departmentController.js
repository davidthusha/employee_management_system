const pool = require("../config/db");

// GET all departments
const getDepartments = async (req, res) => {
    try {
        const [departments] = await pool.query(`
            SELECT
                department_id,
                department_name,
                description,
                created_at
            FROM departments
            ORDER BY department_id DESC
        `);

        res.json(departments);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to retrieve departments"
        });
    }
};


// GET department by ID
const getDepartmentById = async (req, res) => {
    try {
        const { id } = req.params;

        const [departments] = await pool.query(
            `
            SELECT
                department_id,
                department_name,
                description,
                created_at
            FROM departments
            WHERE department_id = ?
            `,
            [id]
        );

        if (departments.length === 0) {
            return res.status(404).json({
                message: "Department not found"
            });
        }

        res.json(departments[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to retrieve department"
        });
    }
};


// CREATE department
const createDepartment = async (req, res) => {
    try {
        const {
            department_name,
            description
        } = req.body;

        if (!department_name) {
            return res.status(400).json({
                message: "Department name is required"
            });
        }

        const [result] = await pool.query(
            `
            INSERT INTO departments
            (department_name, description)
            VALUES (?, ?)
            `,
            [
                department_name,
                description || null
            ]
        );

        res.status(201).json({
            message: "Department created successfully",
            department_id: result.insertId
        });

    } catch (error) {
        console.error(error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Department already exists"
            });
        }

        res.status(500).json({
            message: "Failed to create department",
            error: error.message
        });
    }
};


// UPDATE department
const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            department_name,
            description
        } = req.body;

        if (!department_name) {
            return res.status(400).json({
                message: "Department name is required"
            });
        }

        const [result] = await pool.query(
            `
            UPDATE departments
            SET
                department_name = ?,
                description = ?
            WHERE department_id = ?
            `,
            [
                department_name,
                description || null,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Department not found"
            });
        }

        res.json({
            message: "Department updated successfully"
        });

    } catch (error) {
        console.error(error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "Department already exists"
            });
        }

        res.status(500).json({
            message: "Failed to update department",
            error: error.message
        });
    }
};


// DELETE department
const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            "DELETE FROM departments WHERE department_id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Department not found"
            });
        }

        res.json({
            message: "Department deleted successfully"
        });

    } catch (error) {
        console.error(error);

        // Employee records may still reference this department
        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                message: "Cannot delete department because employees are assigned to it"
            });
        }

        res.status(500).json({
            message: "Failed to delete department",
            error: error.message
        });
    }
};


module.exports = {
    getDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment
};