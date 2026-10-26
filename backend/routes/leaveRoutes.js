
const express = require("express");
const router = express.Router();

const {
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
} = require("../controllers/leaveController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

// Leave types: authenticated users
router.get(
    "/types",
    authenticateToken,
    getLeaveTypes
);

// Employee leave routes
router.get(
    "/me/balances",
    authenticateToken,
    authorizeRoles("Employee"),
    getMyBalances
);

router.get(
    "/me/requests",
    authenticateToken,
    authorizeRoles("Employee"),
    getMyLeaveRequests
);

router.post(
    "/me/requests",
    authenticateToken,
    authorizeRoles("Employee"),
    applyForLeave
);

router.put(
    "/me/requests/:id/cancel",
    authenticateToken,
    authorizeRoles("Employee"),
    cancelMyLeaveRequest
);

// Admin: view and decide applications
router.get(
    "/requests",
    authenticateToken,
    authorizeRoles("Admin"),
    getAllLeaveRequests
);

router.put(
    "/requests/:id/decision",
    authenticateToken,
    authorizeRoles("Admin"),
    reviewLeaveRequest
);

// Admin: manage default leave type allowances
router.put(
    "/types/:id",
    authenticateToken,
    authorizeRoles("Admin"),
    updateLeaveType
);

// Admin: manage individual employee balances
router.get(
    "/employees/:employeeId/balances",
    authenticateToken,
    authorizeRoles("Admin"),
    getEmployeeBalances
);

router.put(
    "/employees/:employeeId/balances/:leaveTypeId",
    authenticateToken,
    authorizeRoles("Admin"),
    updateEmployeeBalance
);

module.exports = router;
