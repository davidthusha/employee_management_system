const express = require("express");


const {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee
} = require("../controllers/employeeController");

const router = express.Router();

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.get(
    "/",
    authenticateToken,
    authorizeRoles("Admin"),
    getEmployees
);

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