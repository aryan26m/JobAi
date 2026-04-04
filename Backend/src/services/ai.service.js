const { GoogleGenAI } = require("@google/genai");
const {z} = require("zod");
const {zodToJsonSchema} = require("zod-to-json-schema");
const puppeteer = require("puppeteer");
const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

const nonEmptyText = z.string().trim().min(10);
const MIN_TEXT_LENGTH = 10;

const TECHNICAL_FALLBACK_QUESTIONS = [
    {
        question: "Explain the Node.js event loop and how microtasks differ from macrotasks in API-heavy systems.",
        intention: "Assess understanding of runtime internals and asynchronous behavior under load.",
        answer: "Explain event loop phases, Promise queue priority, and how non-blocking I/O improves throughput while CPU work should be moved off the main thread."
    },
    {
        question: "How would you design JWT access and refresh token rotation with secure logout across multiple devices?",
        intention: "Evaluate authentication and authorization design depth.",
        answer: "Describe short-lived access tokens, rotated refresh tokens, secure cookies, token family revocation, and a blacklist or version strategy for compromise response."
    },
    {
        question: "How do you debug and optimize a slow MongoDB endpoint with filtering, sorting, and pagination?",
        intention: "Check practical database performance troubleshooting skills.",
        answer: "Use explain plans, create proper compound indexes, project only needed fields, and compare p95 latency before and after optimization."
    },
    {
        question: "When should Redis caching be introduced for backend APIs and how do you avoid stale data problems?",
        intention: "Measure caching strategy and consistency trade-off awareness.",
        answer: "Apply cache to read-heavy endpoints, set sensible TTL, invalidate on writes, namespace keys, and track hit-rate plus stale-read incidents."
    },
    {
        question: "How would you structure Express middleware for validation, auth checks, and centralized error handling?",
        intention: "Assess backend maintainability and code organization practices.",
        answer: "Place validation first, authentication and RBAC next, business logic in controllers/services, and a global error handler for uniform responses and logs."
    },
    {
        question: "How do you approach diagnosing intermittent production failures in distributed services?",
        intention: "Evaluate reliability mindset and incident response quality.",
        answer: "Use correlation IDs, logs/metrics/traces, isolate failing dependency edges, reproduce with targeted load, and add regression checks after the fix."
    }
];

const BEHAVIORAL_FALLBACK_QUESTIONS = [
    {
        question: "Tell me about a high-severity production issue you owned from detection to resolution.",
        intention: "Assess ownership, communication, and calm execution under pressure.",
        answer: "Use STAR format and highlight impact, triage decisions, stakeholder updates, remediation, and long-term prevention actions."
    },
    {
        question: "Describe a disagreement with a teammate on architecture and how you resolved it.",
        intention: "Evaluate collaboration, conflict handling, and decision-making maturity.",
        answer: "Explain competing options, trade-off analysis, data used to decide, and how you aligned the team without harming trust."
    },
    {
        question: "Give an example of improving quality while still delivering quickly.",
        intention: "Measure balance between speed and engineering standards.",
        answer: "Discuss introducing tests, incremental refactoring, clear acceptance criteria, and tracking defect reduction over releases."
    },
    {
        question: "How do you prioritize conflicting urgent requests from product, QA, and operations?",
        intention: "Assess prioritization framework and reliability-focused execution.",
        answer: "Prioritize by user impact and risk, communicate trade-offs early, and break work into short checkpoints with visible progress."
    }
];

const FALLBACK_SKILL_GAPS = [
    { skill: "System design", severity: "high" },
    { skill: "Testing strategy", severity: "medium" },
    { skill: "CI/CD fundamentals", severity: "medium" }
];

const FALLBACK_PREPARATION_PLAN = [
    { day: 1, focus: "Backend fundamentals refresh", tasks: ["Revise API design basics", "Practice middleware patterns", "Review structured error handling"] },
    { day: 2, focus: "Database optimization", tasks: ["Revise index design", "Practice query tuning", "Analyze one explain plan"] },
    { day: 3, focus: "Security and auth", tasks: ["Review JWT flow", "Design refresh token rotation", "Implement token revocation strategy"] },
    { day: 4, focus: "System design", tasks: ["Design one scalable service", "Discuss trade-offs", "Add observability considerations"] },
    { day: 5, focus: "Mock interview", tasks: ["Run one technical mock", "Run one behavioral mock", "Write improvement notes"] }
];

const interviewReportSchema = z.object({
    matchScore: z.number().min(0).max(100).describe("A score between 0 and 100 indicating how well the candidate profile matches the job description"),
    technicalQuestions: z.array(z.object({
        question: nonEmptyText.describe("The technical interview question"),
        intention: nonEmptyText.describe("Why this technical question is asked"),
        answer: nonEmptyText.describe("A strong ideal answer for this technical question")
    })).min(6).describe("Technical questions that can be asked in the interview along with intention and strong answer"),
    behavioralQuestions: z.array(z.object({
        question: nonEmptyText.describe("The behavioral interview question"),
        intention: nonEmptyText.describe("Why this behavioral question is asked"),
        answer: nonEmptyText.describe("A strong STAR-style ideal answer")
    })).min(4).describe("Behavioral questions that can be asked in the interview along with intention and strong answer"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).min(3).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).min(5).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

function getFallbackQuestion(kind, index) {
    const bank = kind === "behavioral" ? BEHAVIORAL_FALLBACK_QUESTIONS : TECHNICAL_FALLBACK_QUESTIONS;
    return bank[index % bank.length];
}

function normalizeQuestionItem(item = {}, kind = "technical", index = 0) {
    const fallbackQuestion = getFallbackQuestion(kind, index);

    if (typeof item === "string") {
        const base = normalizeText(item, fallbackQuestion.question);
        return {
            question: base,
            intention: fallbackQuestion.intention,
            answer: fallbackQuestion.answer
        };
    }

    const intentionRaw = typeof item.intention === "string"
        ? item.intention
        : (typeof item.intension === "string" ? item.intension : "");

    return {
        question: normalizeText(item.question, fallbackQuestion.question),
        intention: normalizeText(intentionRaw, fallbackQuestion.intention),
        answer: normalizeText(item.answer, fallbackQuestion.answer)
    };
}

function normalizeText(value, fallback) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text || text === "..." || text.length < MIN_TEXT_LENGTH) {
        return fallback;
    }
    return text;
}

function normalizeSkillGapItem(item) {
    if (typeof item === "string") {
        return {
            skill: normalizeText(item, "System design"),
            severity: "medium"
        };
    }
    const severity = item?.severity;
    return {
        skill: normalizeText(item?.skill, "System design"),
        severity: severity === "low" || severity === "medium" || severity === "high" ? severity : "medium"
    };
}

function normalizePreparationPlanItem(item, index) {
    if (typeof item === "string") {
        return {
            day: index + 1,
            focus: normalizeText(item, "Interview preparation"),
            tasks: ["Revise core concepts", "Solve focused practice problems", "Do one mock interview"]
        };
    }

    const tasks = Array.isArray(item?.tasks)
        ? item.tasks.filter((task) => typeof task === "string" && task.trim().length > 0).map((task) => task.trim())
        : [];

    return {
        day: typeof item?.day === "number" && Number.isFinite(item.day) ? item.day : index + 1,
        focus: normalizeText(item?.focus, "Interview preparation"),
        tasks: tasks.length > 0 ? tasks : ["Revise core concepts", "Solve focused practice problems", "Do one mock interview"]
    };
}

function ensureMinimumSkillGaps(items, minCount = 3) {
    const normalized = Array.isArray(items) ? items.map(normalizeSkillGapItem) : [];
    const output = [];
    const seen = new Set();

    for (const item of normalized) {
        const key = String(item?.skill || "").trim().toLowerCase();
        if (!key || seen.has(key)) {
            continue;
        }
        seen.add(key);
        output.push(item);
    }

    let offset = 0;
    while (output.length < minCount) {
        const fallback = FALLBACK_SKILL_GAPS[offset % FALLBACK_SKILL_GAPS.length];
        const key = String(fallback.skill || "").trim().toLowerCase();

        if (!seen.has(key)) {
            output.push(fallback);
            seen.add(key);
        }

        offset += 1;
        if (offset > 50) {
            break;
        }
    }

    return output;
}

function ensureMinimumPreparationPlan(items, minCount = 5) {
    const normalized = Array.isArray(items)
        ? items.map((item, index) => normalizePreparationPlanItem(item, index)).filter((item) => Array.isArray(item.tasks) && item.tasks.length > 0)
        : [];

    const output = [ ...normalized ];
    let offset = 0;

    while (output.length < minCount) {
        const fallback = FALLBACK_PREPARATION_PLAN[offset % FALLBACK_PREPARATION_PLAN.length];
        output.push(normalizePreparationPlanItem(fallback, output.length));

        offset += 1;
        if (offset > 50) {
            break;
        }
    }

    return output.map((item, index) => ({
        ...item,
        day: index + 1
    }));
}

function extractJsonCandidate(rawText) {
    const firstBrace = rawText.indexOf("{");
    const lastBrace = rawText.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        return null;
    }
    return rawText.slice(firstBrace, lastBrace + 1);
}

async function parseOrRepairReport(rawText) {
    try {
        return JSON.parse(rawText);
    } catch (error) {
        const candidate = extractJsonCandidate(rawText);
        if (candidate) {
            try {
                return JSON.parse(candidate);
            } catch (innerError) {
                // fall through to model-assisted repair
            }
        }

        const repairPrompt = `Repair the following malformed text into valid JSON.
Return only JSON and follow this schema exactly.

Malformed content:
${rawText}`;

        const repairResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: repairPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(interviewReportSchema),
            }
        });

        const repairedText = typeof repairResponse.text === "function" ? repairResponse.text() : repairResponse.text;
        if (!repairedText) {
            throw new Error("Failed to repair malformed JSON response");
        }
        return JSON.parse(repairedText);
    }
}

function normalizeReport(report = {}) {
    const technicalQuestions = report.technicalQuestions ?? report.technical_questions;
    const behavioralQuestions = report.behavioralQuestions ?? report.behaviouralQuestions ?? report.behavioral_questions;
    const skillGaps = report.skillGaps ?? report.skill_gaps;
    const preparationPlan = report.preparationPlan ?? report.preparation_plan;

    const normalizedTechnical = Array.isArray(technicalQuestions)
        ? technicalQuestions.map((item, index) => normalizeQuestionItem(item, "technical", index))
        : [];

    const normalizedBehavioral = Array.isArray(behavioralQuestions)
        ? behavioralQuestions.map((item, index) => normalizeQuestionItem(item, "behavioral", index))
        : [];

    const uniqueTechnical = dedupeQuestions(normalizedTechnical, "technical");
    const uniqueBehavioral = dedupeQuestions(normalizedBehavioral, "behavioral");
    const finalTechnical = ensureMinimumQuestions(uniqueTechnical, "technical", 6);
    const finalBehavioral = ensureMinimumQuestions(uniqueBehavioral, "behavioral", 4);
    const finalSkillGaps = ensureMinimumSkillGaps(skillGaps, 3);
    const finalPreparationPlan = ensureMinimumPreparationPlan(preparationPlan, 5);

    return {
        ...report,
        matchScore: typeof report.matchScore === "number" && Number.isFinite(report.matchScore) ? report.matchScore : 65,
        title: normalizeText(report.title, "Software Engineer Interview Report"),
        technicalQuestions: finalTechnical,
        behavioralQuestions: finalBehavioral,
        skillGaps: finalSkillGaps,
        preparationPlan: finalPreparationPlan
    };
}

function dedupeQuestions(items, kind) {
    const seen = new Set();
    return items.map((item, index) => {
        const key = item.question.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            return item;
        }

        const fallback = getFallbackQuestion(kind, index + 2);
        const replacement = {
            question: fallback.question,
            intention: fallback.intention,
            answer: fallback.answer
        };
        seen.add(replacement.question.toLowerCase());
        return replacement;
    });
}

function ensureMinimumQuestions(items, kind, minCount) {
    const output = [ ...items ];
    const seen = new Set(output.map((item) => String(item.question || "").toLowerCase()));
    let offset = 0;

    while (output.length < minCount) {
        const fallback = getFallbackQuestion(kind, output.length + offset);
        const key = fallback.question.toLowerCase();

        if (!seen.has(key)) {
            output.push({
                question: fallback.question,
                intention: fallback.intention,
                answer: fallback.answer
            });
            seen.add(key);
        }

        offset += 1;
        if (offset > 50) {
            break;
        }
    }

    return output;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableApiError(error) {
    const code = error?.status ?? error?.code ?? error?.error?.code;
    const message = String(error?.message || "").toLowerCase();
    return code === 429 || code === 500 || code === 503 || message.includes("unavailable") || message.includes("high demand");
}

function isModelNotFoundError(error) {
    const code = error?.status ?? error?.code ?? error?.error?.code;
    const message = String(error?.message || "").toLowerCase();
    return code === 404 && (message.includes("model") || message.includes("not found"));
}

function isQuotaExceededError(error) {
    const code = error?.status ?? error?.code ?? error?.error?.code;
    const message = String(error?.message || "").toLowerCase();
    return code === 429 || message.includes("resource_exhausted") || message.includes("quota exceeded") || message.includes("billing");
}

function buildFallbackInterviewReport({ selfDescription, jobDescription }) {
    const titleSource = (jobDescription || "").split("\n")[0]?.trim();
    const title = titleSource && titleSource.length >= 10 ? `${titleSource} Interview Report` : "Software Engineer Interview Report";

    return {
        title,
        matchScore: 72,
        technicalQuestions: [
            {
                question: "Explain the Node.js event loop and how microtasks differ from macrotasks in real API workloads.",
                intention: "Evaluate runtime fundamentals and ability to reason about asynchronous behavior under production traffic.",
                answer: "Cover event loop phases, Promise callbacks vs setTimeout/setImmediate, and describe how non-blocking I/O improves throughput while CPU-heavy work must be offloaded."
            },
            {
                question: "How would you design JWT access and refresh token flow with token revocation support in a multi-device scenario?",
                intention: "Assess security design depth for authentication and session lifecycle management.",
                answer: "Use short-lived access tokens, rotating refresh tokens, secure cookie flags, token family invalidation, and a blacklist or token version strategy for logout and compromise handling."
            },
            {
                question: "Describe how you would optimize a slow MongoDB endpoint that performs filtering, sorting, and pagination.",
                intention: "Check practical database performance tuning skills.",
                answer: "Profile query with explain, add compound indexes matching filter/sort order, project only required fields, avoid unbounded scans, and validate improvements with latency and index usage metrics."
            },
            {
                question: "When would you introduce Redis caching for API responses, and what invalidation strategy would you use?",
                intention: "Measure understanding of caching trade-offs and consistency concerns.",
                answer: "Use caching for read-heavy, expensive endpoints, apply key namespacing and TTL, invalidate on writes, and monitor cache hit ratio plus stale data risk."
            },
            {
                question: "How do you structure Express middleware for validation, authorization, and centralized error handling?",
                intention: "Assess backend architecture and maintainability practices.",
                answer: "Create layered middleware chain with schema validation first, auth and RBAC checks next, route logic last, and a global error handler producing consistent status codes and logs."
            },
            {
                question: "How would you debug intermittent production failures in a distributed API setup?",
                intention: "Evaluate reliability mindset and incident response process.",
                answer: "Start with correlation IDs, inspect logs/metrics/traces, identify failing dependency boundaries, reproduce with controlled load, implement guardrails, and verify via post-incident regression tests."
            }
        ],
        behavioralQuestions: [
            {
                question: "Tell me about a time you handled a critical production incident with limited information.",
                intention: "Understand ownership, calm decision-making, and communication under pressure.",
                answer: "Use STAR: describe incident context, triage steps, stakeholder communication, rollback or hotfix decision, and the prevention actions added afterward."
            },
            {
                question: "Describe a technical disagreement with a teammate and how you resolved it.",
                intention: "Assess collaboration and conflict resolution maturity.",
                answer: "Explain problem framing, trade-off analysis, data-backed decision process, and how alignment was achieved without harming team trust."
            },
            {
                question: "Give an example of improving code quality in a fast-moving project.",
                intention: "Evaluate balance between delivery speed and maintainability.",
                answer: "Share how you introduced tests, refactoring boundaries, coding standards, and incremental quality improvements while meeting deadlines."
            },
            {
                question: "How do you prioritize tasks when multiple urgent requests arrive at once?",
                intention: "Measure prioritization and reliability in execution.",
                answer: "Discuss impact-based prioritization, clear communication of trade-offs, risk management, and frequent status updates to stakeholders."
            }
        ],
        skillGaps: [
            { skill: "Large-scale distributed systems design", severity: "medium" },
            { skill: "Advanced Kubernetes operations", severity: "medium" },
            { skill: "Timed DSA problem solving speed", severity: "high" }
        ],
        preparationPlan: [
            { day: 1, focus: "Node.js runtime and async internals", tasks: ["Revise event loop phases", "Practice Promise and timer ordering", "Explain one real API async bottleneck"] },
            { day: 2, focus: "Auth and security patterns", tasks: ["Design JWT and refresh rotation", "Review token revocation patterns", "Implement auth threat checklist"] },
            { day: 3, focus: "Database performance", tasks: ["Run explain plans", "Tune indexes for one endpoint", "Benchmark before and after latency"] },
            { day: 4, focus: "Caching and resilience", tasks: ["Add Redis cache to one route", "Define invalidation rules", "Document failure fallback behavior"] },
            { day: 5, focus: "System design practice", tasks: ["Design one scalable API system", "Discuss trade-offs", "Present reliability and observability plan"] },
            { day: 6, focus: "Behavioral preparation", tasks: ["Write STAR stories", "Practice incident communication", "Prepare ownership and conflict examples"] },
            { day: 7, focus: "Mock interview day", tasks: ["Conduct one technical mock", "Conduct one behavioral mock", "Review improvement notes and action plan"] }
        ],
        candidateSummary: normalizeText(selfDescription, "Candidate demonstrates strong backend fundamentals with growth opportunities in scale design."),
        reportSource: "fallback-local"
    };
}

async function generateInterviewReport({resume, selfDescription, jobDescription }) {

    if (!resume || !selfDescription || !jobDescription) {
        throw new Error("resume, selfDescription and jobDescription are required");
    }

    const prompt = `Generate an interview report for a candidate with the following details:
Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}

Rules:
1. Return only valid JSON.
2. Include exactly these required keys with correct spelling and casing: matchScore, technicalQuestions, behavioralQuestions, skillGaps, preparationPlan, title.
3. technicalQuestions must have at least 6 items.
4. behavioralQuestions must have at least 4 items.
5. Every technicalQuestions and behavioralQuestions item must include non-empty: question, intention, answer.
6. Do not leave intention or answer blank.
7. Keep matchScore between 0 and 100.
8. technicalQuestions and behavioralQuestions must be arrays of OBJECTS, not strings.
9. Do not add markdown, code fences, comments, or trailing text.
10. Never use placeholder text like "..." in any field.
11. Ensure all technicalQuestions and behavioralQuestions are unique.
12. skillGaps must contain at least 3 items.
13. preparationPlan must contain at least 5 day entries with non-empty tasks.

JSON shape example:
{
    "matchScore": 85,
    "technicalQuestions": [
        {"question": "Explain the Node.js event loop with practical API examples.", "intention": "Check runtime fundamentals.", "answer": "Describe phases, microtasks, and performance implications."}
    ],
    "behavioralQuestions": [
        {"question": "Tell me about a production incident you owned.", "intention": "Assess ownership and communication.", "answer": "Provide STAR response with impact and prevention steps."}
    ],
    "skillGaps": [{"skill": "System design", "severity": "medium"}],
    "preparationPlan": [{"day": 1, "focus": "Node.js internals", "tasks": ["Revise event loop", "Practice async debugging"]}],
    "title": "Software Engineer II Interview Report"
}
`;

    const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
    let lastError;

    for (const modelName of models) {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: zodToJsonSchema(interviewReportSchema),
                    }
                });

                const rawText = typeof response.text === "function" ? response.text() : response.text;
                if (!rawText) {
                    throw new Error("Empty response from AI model");
                }

                const parsed = await parseOrRepairReport(rawText);
                const normalized = normalizeReport(parsed);
                return interviewReportSchema.parse(normalized);
            } catch (error) {
                lastError = error;

                if (isQuotaExceededError(error)) {
                    const fallbackReport = buildFallbackInterviewReport({ selfDescription, jobDescription });
                    const normalizedFallback = normalizeReport(fallbackReport);
                    return interviewReportSchema.parse(normalizedFallback);
                }

                if (isModelNotFoundError(error)) {
                    break;
                }

                if (!isRetryableApiError(error)) {
                    throw error;
                }

                const backoffMs = 700 * Math.pow(2, attempt - 1);
                await sleep(backoffMs);
            }
        }
    }

    throw new Error(`Gemini API request failed. Last error: ${lastError?.message || "Unknown error"}`);
}

async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4" , margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" }});
    await browser.close();
    return pdfBuffer;
}

async function generateResumePdf({resume, selfDescription, jobDescription}){
const resumePdfSchema=z.object({
    html:z.string().describe("The html content of the resume PDF generated based on the resume text, self-description and job description which can be rendered in the frontend and converted to PDF using puppeteer")
})
const prompt = `Generate a resume PDF in HTML format for a candidate with the following details:
Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}
Rules:the response must be a JSON object with a single key "html" containing the HTML content of the resume PDF which can be rendered in the frontend and converted to PDF using puppeteer. Do not return any text outside of the JSON object. Do not include markdown or code fences. Ensure the HTML is well-formed and can be rendered without errors.
the resume should be tailored to the given job description and self-description, highlighting relevant skills and experience. The design should be clean and professional, suitable for a software engineering role.
The content of the resume should not sound like it was generated by an AI, but rather like a genuine resume created by a candidate. Avoid using generic phrases and ensure the resume has a natural flow.
You can highlight the content that matches the job description and self-description, but do not exaggerate or fabricate information. The resume should be an honest representation of the candidate's profile, optimized for the given job description.
The content of the resume should be concise and impactful, focusing on key achievements and skills that are relevant to the job description. Use bullet points for clarity and keep the overall length to a maximum of 2 pages when rendered as PDF.
ATS score should be considered in the resume generation, ensuring that the resume is optimized for applicant tracking systems while still being visually appealing and easy to read for human recruiters.
Highlight the most relevant skills and experiences based on the job description and self-description, but do not include irrelevant information. The resume should be tailored to the specific job description provided, showcasing the candidate's strengths in relation to the requirements of the role.
`;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumePdfSchema),
        }
    });

    const jsonContent=JSON.parse(response.text);
    const pdfBuffer=await generatePdfFromHtml(jsonContent.html);
    return pdfBuffer;
}



module.exports={generateInterviewReport, generateResumePdf}; 