const express = require("express");
const { check } = require("express-validator");

const checkAuth = require("../middleware/auth-token");
const commentsControllers = require("../controllers/comments-controllers");

const router = express.Router();

router.get("/:cid", commentsControllers.getCommentById);

router.get("/user/:uid", commentsControllers.getCommentsByUserId);

router.use(checkAuth);

router.post(
  "/",
  check("content").not().isEmpty(),
  commentsControllers.createComment
);

router.patch(
  "/:cid",
  [check("content").not().isEmpty()],
  commentsControllers.updateComment
);

router.delete("/:cid", commentsControllers.deleteComment);

module.exports = router;
