import {generateInterviewReport,fetchInterviewReport,fetchAllInterviews,generateResumePdf} from "../services/interview.api"
import { useParams} from 'react-router'
import { useContext } from "react"
import {InterviewContext} from "../interview.context"
import { useEffect } from "react"
export const useInterview = ()=>{
    const context = useContext(InterviewContext);
     const {interviewId}=useParams();
    if(!context){
        throw new Error("useInterview must be used within an InterviewProvider");
    }
    const {report,setReport,loading,setLoading,reports,setReports} = context;

    const generateReport = async ({selfDescription,resume,jobDescription})=>{
        setLoading(true);
        try{
            const data = await generateInterviewReport({selfDescription,resume,jobDescription});
            setReport(data);
            return data;
        }catch(error){
            console.error("Error generating report:",error);
            return null;
        }
        finally{
            setLoading(false);
        }
    }

    const getReportById = async (id)=>{
        setLoading(true);
        try{
            const data = await fetchInterviewReport(id);
            setReport(data);
            return data;
        }
        catch(error){
            console.error("Error fetching report:",error);
            return null;
        }
        finally{
            setLoading(false);
        }
    }

    const getReports = async ()=>{
        setLoading(true);
        try{
            const data = await fetchAllInterviews();
            const reportList = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
            setReports(reportList);
            return reportList;
        }
        catch(error){
            console.error("Error fetching reports:",error);
            return [];
        }
        finally{
            setLoading(false);
        }
    }

    const getResumePdf = async (interviewId)=>{
        setLoading(true);
        try{
            const pdfBlob = await generateResumePdf(interviewId);
            const downloadBlob = pdfBlob instanceof Blob ? pdfBlob : new Blob([pdfBlob], { type: "application/pdf" });
            if (downloadBlob.size === 0) {
                throw new Error("Received empty PDF file");
            }

            const url = window.URL.createObjectURL(downloadBlob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `resume_${interviewId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

             }
        catch(error){
            console.error("Error generating resume PDF:",error?.message || error);
            return null;
        }
        finally{
            setLoading(false);
        }
    }
    useEffect(()=>{
        if(interviewId){
            getReportById(interviewId);
        }
        else{
            getReports();
        }
    },[interviewId])

    return {
        report,
        loading,
        generateReport,
        getReportById,
        getReports,
        reports,
        getResumePdf
    }
}