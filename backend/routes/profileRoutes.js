
const express = require("express");
const router = express.Router();

const {
    getMyProfile,
    updateMyProfile,
    changeMyPassword
} = require("../controllers/profileController");

const {
    authenticateToken
} = require("../middleware/authMiddleware");

router.get(
    "/",
    authenticateToken,
    getMyProfile
);

router.put(
    "/",
    authenticateToken,
    updateMyProfile
);

router.put(
    "/password",
    authenticateToken,
    changeMyPassword
);

module.exports = router;
