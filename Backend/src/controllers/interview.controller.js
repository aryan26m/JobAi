
const pdfParse = require("pdf-parse");
const {generateInterviewReport,generateResumePdf} = require("../services/ai.service");
const interviewReportModel=require("../models/interviewReport.model");

function getAuthenticatedUserId(req) {
    return req?.user?.userId || req?.user?.id || req?.user?._id || null;
}
/**
 * @desc Generate interview report based on resume or self-description
 * @route POST /api/interview/generate-report
 * @access Private
 * @middleware authMiddleware, upload.single("resume")
 */
async function generateInterviewReportController(req,res) {
try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "Resume PDF file is required"
        });
    }

    const resume=req.file;
    const resumeContent=await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText();
    const { selfDescription, jobDescription } = req.body;
    // console.log("Resume content:", resumeContent.text);
    // console.log("Self Description:", selfDescription);
    // console.log("Job Description:", jobDescription);    
    const interviewReportByAi=await generateInterviewReport({
        resume: resumeContent.text,
        selfDescription,    
        jobDescription
    });
         const interviewReport = await interviewReportModel.create({
        user: userId,
        resume: resumeContent.text,
        selfDescription,
        jobDescription,
        ...interviewReportByAi
    })

    res.status(201).json({
        success:true,
        message:"Interview report generated successfully",
        data:interviewReport
    })
} catch (error) {
    return res.status(500).json({
        success: false,
        message: error?.message || "Failed to generate interview report"
    });
}
}

/**
 * @desc Get interview report history for a specific interview ID
 * @route GET /api/interview/report/:interviewId
 * @access Private
 * @middleware authMiddleware
 */
async function getInterviewReportByIdController(req,res){
    const {interviewId}=req.params;
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const interviewReport=await interviewReportModel.findOne({_id:interviewId,user:userId});
    if(!interviewReport){
        return res.status(404).json({
            success:false,
            message:"Interview report not found"
        })
    }   
    res.status(200).json({
        success:true,
        data:interviewReport
    })
}

/**
 * @desc Get all interview reports for the authenticated user   
 * @route GET /api/interview/reports
 * @access Private
 * @middleware authMiddleware 
 */
async function getAllInterviewReportsController(req,res){
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    const interviewReports=await interviewReportModel.find({user:userId}).sort({createdAt:-1}).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan");
    res.status(200).json({
        success:true,
        data:interviewReports
    })
}

/**
 * @desc Create a resume PDF file of the interview report
 * @route POST /api/interview/report/:interviewId/pdf
 * @access Private
 */
async function createInterviewReportPdfController(req,res){
    const {interviewId}=req.params;
    const interviwewReport=await interviewReportModel.findById(interviewId);
    if(!interviwewReport){
        return res.status(404).json({
            success:false,
            message:"Interview report not found"
        })
    }
    const {resume,selfDescription,jobDescription}=interviwewReport;
    const pdfBuffer=await generateResumePdf({resume,selfDescription,jobDescription});
    res.set({
        "Content-Type":"application/pdf",
        "Content-Disposition":`attachment; filename=interview_report_${interviewId}.pdf`
    });
    res.send(pdfBuffer);
}

module.exports={generateInterviewReportController,getInterviewReportByIdController,getAllInterviewReportsController,createInterviewReportPdfController};