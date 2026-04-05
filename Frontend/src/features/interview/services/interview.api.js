import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://jobai-0z3h.onrender.com";

const api=axios.create({
    baseURL: API_BASE_URL,
    withCredentials:true
});

/**
 * Generates an interview report based on the user's self-description, uploaded resume, and job description.
 */
export const generateInterviewReport=async({selfDescription,resume,jobDescription})=>{
    try{
        const formData=new FormData();
        formData.append("selfDescription",selfDescription);
        formData.append("jobDescription",jobDescription);
        if(resume){
            formData.append("resume",resume);
        }
        const response=await api.post("/api/interview/",formData,{
            headers:{
                "Content-Type":"multipart/form-data"
            }
        });
        return response.data?.data ?? response.data;
    }
    catch(err){
        console.error("Error generating interview report:", err);
        throw err;
    }
}
/**
    * Fetches a previously generated interview report by its ID.
 */

export const fetchInterviewReport=async(interviewId)=>{

    const response=await api.get(`/api/interview/report/${interviewId}`);
    return response.data?.data ?? response.data;
}

/**
    * Fetches all interview reports for the logged-in user.
*/

export const fetchAllInterviews=async()=>{
    const response=await api.get("/api/interview/");
    return response.data?.data ?? response.data;
}

/**
 * Generates a PDF version of the resume content for a specific interview report.
 * @param {string} interviewId - The ID of the interview report for which to generate the resume PDF.
 * @returns {Promise<Blob>} - A promise that resolves to a Blob containing the PDF data.
 */
export const generateResumePdf=async(interviewId)=>{
    const response=await api.post(`/api/interview/resume/pdf/${interviewId}`,null,{
        responseType:"blob"
    });
     
    return response.data;

}
