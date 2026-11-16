
const express = require("express");
const router = express.Router();

const {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getMyEmployee
} = require("../controllers/employeeController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

// Employee: retrieve only their own employee record
router.get(
    "/me",
    authenticateToken,
    authorizeRoles("Employee"),
    getMyEmployee
);

// Admin: retrieve all employees
router.get(
    "/",
    authenticateToken,
    authorizeRoles("Admin"),
    getEmployees
);

// Existing employee management routes
router.get(
    "/:id",
    authenticateToken,
    getEmployeeById
);

router.post(
    "/",
    authenticateToken,
    authorizeRoles("Admin"),
    createEmployee
);

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("Admin"),
    updateEmployee
);

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("Admin"),
    deleteEmployee
);

module.exports = router;
