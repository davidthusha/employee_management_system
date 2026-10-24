
const express = require("express");
const router = express.Router();

const {
    login,
    createEmployeeAccount,
    getCurrentUser
} = require("../controllers/authController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

router.post("/login", login);

router.get("/me", authenticateToken, getCurrentUser);

router.post(
    "/create-employee-account",
    authenticateToken,
    authorizeRoles("Admin"),
    createEmployeeAccount
);

module.exports = router;
