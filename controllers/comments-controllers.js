const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");

const User = require("../models/user");
const Comment = require("../models/comment");

const getCommentById = async (req, res, next) => {
  const commentId = req.params.cid;

  let comment;
  try {
    comment = await Comment.findById(commentId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a comment.",
      500
    );
    return next(error);
  }

  if (!comment) {
    const error = new HttpError(
      "Could not find comment for the provided id.",
      404
    );
    return next(error);
  }

  res.json({ comment: comment.toObject({ getters: true }) });
};

const getCommentsByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  // let comments;
  let userWithComments;
  try {
    userWithComments = await User.findById(userId).populate("comments");
  } catch (err) {
    const error = new HttpError(
      "Fetching comments failed, please try again later.",
      500
    );
    return next(error);
  }

  // if (!comments || comments.length === 0) {
  if (!userWithComments || userWithComments.comments.length === 0) {
    return next(
      new HttpError("Could not find comments for the provided user id.", 404)
    );
  }

  res.json({
    comments: userWithComments.comments.map((comment) =>
      comment.toObject({ getters: true })
    ),
  });
};

const createComment = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { content } = req.body;

  const createdComment = new Comment({
    content,

    creator: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError(
      "Creating comment failed, please try again.",
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find user for provided id.", 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdComment.save({ session: sess });
    user.comments.push(createdComment);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Creating comment failed, please try again.",
      500
    );
    return next(error);
  }

  res.status(201).json({ comment: createdComment });
};

const updateComment = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { content } = req.body;
  const commentId = req.params.cid;

  let comment;
  try {
    comment = await Comment.findById(commentId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update comment.",
      500
    );
    return next(error);
  }

  if (comment.creator.toString() !== req.userData.userId) {
    const error = new HttpError(
      "You are not allowed to edit this comment.",
      401
    );
    return next(error);
  }

  comment.content = content;

  try {
    await comment.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update comment.",
      500
    );
    return next(error);
  }

  res.status(200).json({ comment: comment.toObject({ getters: true }) });
};

const deleteComment = async (req, res, next) => {
  const commentId = req.params.cid;

  let comment;
  try {
    comment = await Comment.findById(commentId).populate("creator");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete comment.",
      500
    );
    return next(error);
  }

  if (!comment) {
    const error = new HttpError("Could not find comment for this id.", 404);
    return next(error);
  }

  if (comment.creator.id !== req.userData.userId) {
    const error = new HttpError(
      "You are not allowed to delete this comment.",
      401
    );
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await comment.remove({ session: sess });
    comment.creator.comments.pull(comment);
    await comment.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete comment.",
      500
    );
    return next(error);
  }

  res.status(200).json({ message: "Deleted comment." });
};

exports.getCommentById = getCommentById;
exports.getCommentsByUserId = getCommentsByUserId;
exports.createComment = createComment;
exports.updateComment = updateComment;
exports.deleteComment = deleteComment;
