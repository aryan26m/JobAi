const { GoogleGenAI } = require("@google/genai");
const {z} = require("zod");
const {zodToJsonSchema} = require("zod-to-json-schema");
const puppeteer = require("puppeteer");
const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

const nonEmptyText = z.string().trim().min(10);
const MIN_TEXT_LENGTH = 10;
const DEFAULT_PREPARATION_TASKS = ["Revise core concepts", "Solve focused practice problems", "Do one mock interview"];
const MIN_RESUME_HTML_LENGTH = 80;

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

const resumePdfSchema = z.object({
    html: z.string().trim().min(MIN_RESUME_HTML_LENGTH).describe("Well-formed HTML used for resume PDF rendering")
});

function getFallbackQuestion(kind, index) {
    const bank = kind === "behavioral" ? BEHAVIORAL_FALLBACK_QUESTIONS : TECHNICAL_FALLBACK_QUESTIONS;
    return bank[index % bank.length];
}

function parseJsonValueFromString(value) {
    if (typeof value !== "string") {
        return null;
    }

    const rawText = value.trim();
    if (!rawText) {
        return null;
    }

    const candidates = [rawText];
    const objectCandidate = extractJsonCandidate(rawText);
    if (objectCandidate && objectCandidate !== rawText) {
        candidates.push(objectCandidate);
    }

    const firstBracket = rawText.indexOf("[");
    const lastBracket = rawText.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        candidates.push(rawText.slice(firstBracket, lastBracket + 1));
    }

    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate);
        } catch (error) {
            // Ignore parse error and continue trying other candidates.
        }
    }

    return null;
}

function toArrayValue(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === "string") {
        const parsed = parseJsonValueFromString(value);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    }

    return [];
}

function extractQuestionFieldsFromText(value) {
    if (typeof value !== "string") {
        return null;
    }

    const lines = value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
        return null;
    }

    let question = "";
    let intention = "";
    let answer = "";

    for (const line of lines) {
        if (!question && /^question\s*[:\-]\s*/i.test(line)) {
            question = line.replace(/^question\s*[:\-]\s*/i, "").trim();
            continue;
        }

        if (!intention && /^(intention|intent|purpose)\s*[:\-]\s*/i.test(line)) {
            intention = line.replace(/^(intention|intent|purpose)\s*[:\-]\s*/i, "").trim();
            continue;
        }

        if (!answer && /^(answer|model\s*answer|sample\s*answer)\s*[:\-]\s*/i.test(line)) {
            answer = line.replace(/^(answer|model\s*answer|sample\s*answer)\s*[:\-]\s*/i, "").trim();
        }
    }

    if (!question) {
        question = lines[0] || "";
    }

    if (!question && !intention && !answer) {
        return null;
    }

    return { question, intention, answer };
}

function extractPreparationPlanFromText(value, fallbackDay) {
    if (typeof value !== "string") {
        return null;
    }

    const lines = value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (lines.length === 0) {
        return null;
    }

    const dayMatch = value.match(/\bday\s*[:#\-]?\s*(\d{1,2})\b/i);
    const focusLine = lines.find((line) => /^focus\s*[:\-]\s*/i.test(line));
    const focusCandidate = focusLine
        ? focusLine.replace(/^focus\s*[:\-]\s*/i, "").trim()
        : lines.find((line) => !/^day\b/i.test(line) && !/^tasks?\b/i.test(line) && !/^[-*\u2022]/.test(line) && !/^\d+[.)]/.test(line));

    const taskLines = lines
        .filter((line) => /^[-*\u2022]/.test(line) || /^\d+[.)]/.test(line))
        .map((line) => line.replace(/^([-*\u2022]|\d+[.)])\s*/, "").trim())
        .filter(Boolean);

    const labeledTasks = lines
        .filter((line) => /^tasks?\s*[:\-]\s*/i.test(line))
        .flatMap((line) => line.replace(/^tasks?\s*[:\-]\s*/i, "").split(/[;,|]/).map((task) => task.trim()))
        .filter(Boolean);

    const tasks = taskLines.length > 0 ? taskLines : labeledTasks;

    return {
        day: dayMatch ? Number(dayMatch[1]) : fallbackDay,
        focus: focusCandidate || "Interview preparation",
        tasks
    };
}

function normalizeQuestionItem(item = {}, kind = "technical", index = 0) {
    const fallbackQuestion = getFallbackQuestion(kind, index);

    if (typeof item === "string") {
        const parsed = parseJsonValueFromString(item);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return normalizeQuestionItem(parsed, kind, index);
        }

        const extracted = extractQuestionFieldsFromText(item);
        if (extracted) {
            return {
                question: normalizeText(extracted.question, fallbackQuestion.question),
                intention: normalizeText(extracted.intention, fallbackQuestion.intention),
                answer: normalizeText(extracted.answer, fallbackQuestion.answer)
            };
        }

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
        const parsed = parseJsonValueFromString(item);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return normalizeSkillGapItem(parsed);
        }

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
        const parsed = parseJsonValueFromString(item);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return normalizePreparationPlanItem(parsed, index);
        }

        const extracted = extractPreparationPlanFromText(item, index + 1);

        return {
            day: extracted?.day ?? index + 1,
            focus: normalizeText(extracted?.focus, "Interview preparation"),
            tasks: Array.isArray(extracted?.tasks) && extracted.tasks.length > 0 ? extracted.tasks : DEFAULT_PREPARATION_TASKS
        };
    }

    const tasks = Array.isArray(item?.tasks)
        ? item.tasks.filter((task) => typeof task === "string" && task.trim().length > 0).map((task) => task.trim())
        : [];

    return {
        day: typeof item?.day === "number" && Number.isFinite(item.day) ? item.day : index + 1,
        focus: normalizeText(item?.focus, "Interview preparation"),
        tasks: tasks.length > 0 ? tasks : DEFAULT_PREPARATION_TASKS
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

    const technicalQuestionList = toArrayValue(technicalQuestions);
    const behavioralQuestionList = toArrayValue(behavioralQuestions);
    const skillGapList = toArrayValue(skillGaps);
    const preparationPlanList = toArrayValue(preparationPlan);

    const normalizedTechnical = technicalQuestionList.map((item, index) => normalizeQuestionItem(item, "technical", index));

    const normalizedBehavioral = behavioralQuestionList.map((item, index) => normalizeQuestionItem(item, "behavioral", index));

    const uniqueTechnical = dedupeQuestions(normalizedTechnical, "technical");
    const uniqueBehavioral = dedupeQuestions(normalizedBehavioral, "behavioral");
    const finalTechnical = ensureMinimumQuestions(uniqueTechnical, "technical", 6);
    const finalBehavioral = ensureMinimumQuestions(uniqueBehavioral, "behavioral", 4);
    const finalSkillGaps = ensureMinimumSkillGaps(skillGapList, 3);
    const finalPreparationPlan = ensureMinimumPreparationPlan(preparationPlanList, 5);

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
    const resumeText = typeof resume === "string" ? resume.trim() : "";
    const selfDescriptionText = typeof selfDescription === "string" ? selfDescription.trim() : "";
    const jobDescriptionText = typeof jobDescription === "string" ? jobDescription.trim() : "";

    if (!jobDescriptionText) {
        throw new Error("jobDescription is required");
    }

    if (!resumeText && !selfDescriptionText) {
        throw new Error("Either resume or selfDescription is required");
    }

    const prompt = `Generate an interview report for a candidate with the following details:
Resume: ${resumeText || "Not provided"}
Self Description: ${selfDescriptionText || "Not provided"}
Job Description: ${jobDescriptionText}

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
                    const fallbackReport = buildFallbackInterviewReport({ selfDescription: selfDescriptionText, jobDescription: jobDescriptionText });
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

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function truncateText(value, maxLength = 1600) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) {
        return "";
    }

    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, maxLength)}...`;
}

function buildBulletList(text, maxItems = 8) {
    return String(text || "")
        .split(/\r?\n/)
        .map((line) => line.replace(/^[-*\u2022\d.)\s]+/, "").trim())
        .filter((line) => line.length >= 12)
        .slice(0, maxItems);
}

function buildFallbackResumeHtml({ resume, selfDescription, jobDescription }) {
    const summarySource = truncateText(selfDescription, 900) || "Motivated software engineer with practical problem-solving and delivery experience.";
    const roleSource = truncateText(jobDescription, 450) || "Software Engineer";
    const experienceBullets = buildBulletList(resume, 8);

    const bulletItems = experienceBullets.length > 0
        ? experienceBullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
        : `<li>Built and maintained production-ready web application features with clean, testable code.</li>
           <li>Collaborated with cross-functional teams to deliver improvements and fix customer-facing issues.</li>
           <li>Improved reliability through better logging, validation, and performance-focused code changes.</li>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Resume</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #111827; }
    .page { padding: 28px 34px; }
    h1 { margin: 0 0 6px; font-size: 26px; }
    h2 { margin: 20px 0 8px; font-size: 14px; letter-spacing: 0.8px; text-transform: uppercase; color: #0f766e; }
    p { margin: 0 0 10px; line-height: 1.5; font-size: 13px; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 0 0 8px; line-height: 1.4; font-size: 13px; }
    .subtle { color: #374151; }
    .card { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
  </style>
</head>
<body>
  <main class="page">
    <h1>Professional Resume</h1>
    <p class="subtle">Auto-generated fallback resume profile for PDF download.</p>

    <h2>Professional Summary</h2>
    <p>${escapeHtml(summarySource)}</p>

    <h2>Target Role Context</h2>
    <div class="card">
      <p>${escapeHtml(roleSource)}</p>
    </div>

    <h2>Key Experience Highlights</h2>
    <ul>${bulletItems}</ul>
  </main>
</body>
</html>`;
}

function parseResumeHtmlFromResponse(rawText) {
    if (typeof rawText !== "string" || !rawText.trim()) {
        return "";
    }

    const parsed = parseJsonValueFromString(rawText);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return typeof parsed.html === "string" ? parsed.html.trim() : "";
    }

    return "";
}

async function generatePdfFromHtml(htmlContent) {
    const launchOptions = {
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        timeout: 60000
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    let browser;
    try {
        browser = await puppeteer.launch(launchOptions);
    } catch (error) {
        browser = await puppeteer.launch();
    }

    try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "networkidle0", timeout: 60000 });
        await page.emulateMediaType("screen");
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" }
        });
        return Buffer.from(pdfBuffer);
    } finally {
        await browser.close();
    }
}

async function generateResumePdf({resume, selfDescription, jobDescription}){
    const resumeText = typeof resume === "string" ? resume.trim() : "";
    const selfDescriptionText = typeof selfDescription === "string" ? selfDescription.trim() : "";
    const jobDescriptionText = typeof jobDescription === "string" ? jobDescription.trim() : "";

    if (!jobDescriptionText) {
        throw new Error("Job description is required to generate resume PDF");
    }

    const prompt = `Generate a resume PDF in HTML format for a candidate with the following details:
Resume: ${resumeText || "Not provided"}
Self Description: ${selfDescriptionText || "Not provided"}
Job Description: ${jobDescriptionText}
Rules:
1. Return only valid JSON.
2. Response JSON must contain exactly one key: html.
3. html must be complete, valid, and printable resume-style HTML for A4 PDF.
4. Do not return markdown or code fences.
5. Keep content realistic and aligned with provided information only.
`;

    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-3-flash-preview"];
    let lastError;

    for (const modelName of models) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: zodToJsonSchema(resumePdfSchema),
                    }
                });

                const rawText = typeof response.text === "function" ? response.text() : response.text;
                const html = parseResumeHtmlFromResponse(rawText);
                const parsed = resumePdfSchema.safeParse({ html });

                if (!parsed.success) {
                    throw new Error("AI returned malformed resume HTML response");
                }

                return await generatePdfFromHtml(parsed.data.html);
            } catch (error) {
                lastError = error;
                const errorMessage = String(error?.message || "").toLowerCase();

                if (isRetryableApiError(error)) {
                    const backoffMs = 700 * Math.pow(2, attempt - 1);
                    await sleep(backoffMs);
                    continue;
                }

                if (isModelNotFoundError(error)) {
                    break;
                }

                if (isQuotaExceededError(error)) {
                    break;
                }

                if (errorMessage.includes("malformed resume html response")) {
                    break;
                }

                break;
            }
        }
    }

    const fallbackHtml = buildFallbackResumeHtml({
        resume: resumeText,
        selfDescription: selfDescriptionText,
        jobDescription: jobDescriptionText
    });

    try {
        return await generatePdfFromHtml(fallbackHtml);
    } catch (pdfError) {
        throw new Error(`Failed to generate resume PDF. Last AI error: ${lastError?.message || "Unknown error"}; PDF renderer error: ${pdfError?.message || "Unknown error"}`);
    }
}



module.exports={generateInterviewReport, generateResumePdf, normalizeReport};