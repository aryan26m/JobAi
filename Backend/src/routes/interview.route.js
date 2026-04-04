const express=require("express");

const interviewRouter=express.Router();
const authMiddlewares=require("../middlewares/auth.middleware");
const interviewController=require("../controllers/interview.controller");
const upload=require("../middlewares/file.middleware");

/**
 * @route POST /api/interview/generate-report
 * @desc Generate interview report based on resume or self-description
 * @access Private
 * @middleware authMiddleware, upload.single("resume")
 */
interviewRouter.post("/",authMiddlewares.authMiddleware,upload.single("resume"),interviewController.generateInterviewReportController);

/**
 * @route GET /api/interview/report/:interviewId
 * @desc Get interview report history for a specific interview ID
 * @access Private
 * @middleware authMiddleware
 */
interviewRouter.get("/report/:interviewId",authMiddlewares.authMiddleware,interviewController.getInterviewReportByIdController);

/**
 * get all interview reports for the authenticated user
 * @route GET /api/interview/reports
 * @desc Get all interview reports for the authenticated user
 */
interviewRouter.get("/",authMiddlewares.authMiddleware,interviewController.getAllInterviewReportsController);


/**
 * generate a PDF version of the resume content
 * @route POST /api/interview/generate-resume-pdf
 * @desc Generate a PDF version of the resume content
 */
interviewRouter.post("/resume/pdf/:interviewId",authMiddlewares.authMiddleware,interviewController.createInterviewReportPdfController);
module.exports=interviewRouter; 