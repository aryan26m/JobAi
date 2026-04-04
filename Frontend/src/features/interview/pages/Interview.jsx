import React, { useState } from 'react'
import '../styles/interview.scss'
import { useInterview } from '../hooks/useInterview'
import { useNavigate, useParams } from 'react-router'
const NAV_ITEMS = [
    {
        id: 'technical',
        label: 'Technical Questions',
        icon: (
            <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <polyline points='16 18 22 12 16 6' />
                <polyline points='8 6 2 12 8 18' />
            </svg>
        ),
    },
    {
        id: 'behavioral',
        label: 'Behavioral Questions',
        icon: (
            <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
            </svg>
        ),
    },
    {
        id: 'roadmap',
        label: 'Road Map',
        icon: (
            <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <polygon points='3 11 22 2 13 21 11 13 3 11' />
            </svg>
        ),
    },
]

const QuestionCard = ({ item, index }) => {
    const [open, setOpen] = useState(false)

    return (
        <div className='q-card'>
            <button type='button' className='q-card__header' onClick={() => setOpen((value) => !value)}>
                <span className='q-card__index'>Q{index + 1}</span>
                <p className='q-card__question'>{item.question}</p>
                <span className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`}>
                    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                        <polyline points='6 9 12 15 18 9' />
                    </svg>
                </span>
            </button>
            {open && (
                <div className='q-card__body'>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--intention'>Intention</span>
                        <p>{item.intention}</p>
                    </div>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--answer'>Model Answer</span>
                        <p>{item.answer}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

const RoadMapDay = ({ day }) => (
    <div className='roadmap-day'>
        <div className='roadmap-day__header'>
            <span className='roadmap-day__badge'>Day {day.day}</span>
            <h3 className='roadmap-day__focus'>{day.focus}</h3>
        </div>
        <ul className='roadmap-day__tasks'>
            {day.tasks.map((task, index) => (
                <li key={index}>
                    <span className='roadmap-day__bullet' />
                    {task}
                </li>
            ))}
        </ul>
    </div>
)

const Interview = () => {
    const [activeNav, setActiveNav] = useState('technical')
    const navigate = useNavigate()
    const { interviewId } = useParams()
    const { report: contextReport ,getResumePdf,loading} = useInterview()
   
    const report = {
        matchScore: typeof contextReport?.matchScore === 'number' ? contextReport.matchScore : null,
        technicalQuestions: Array.isArray(contextReport?.technicalQuestions) ? contextReport.technicalQuestions : [],
        behavioralQuestions: Array.isArray(contextReport?.behavioralQuestions) ? contextReport.behavioralQuestions : [],
        preparationPlan: Array.isArray(contextReport?.preparationPlan) ? contextReport.preparationPlan : [],
        skillGaps: Array.isArray(contextReport?.skillGaps) ? contextReport.skillGaps : [],
    }

    const hasMatchScore = typeof report.matchScore === 'number'
    const currentInterviewId = interviewId || contextReport?._id || contextReport?.id

    const handleDownloadResume = () => {
        if (!currentInterviewId) {
            return
        }
        getResumePdf(currentInterviewId)
    }

    const handleCreateNewReport = () => {
        navigate('/')
    }

    const scoreColor = !hasMatchScore ? 'score--mid' : report.matchScore >= 80 ? 'score--high' : report.matchScore >= 60 ? 'score--mid' : 'score--low'
    if(!contextReport && loading){
        return (
            <div className='interview-page'>
                <div className='loading-state'>
                    <p>Generating your interview report...</p>
                    <div className='loading-spinner'>
                        <svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                            <line x1='12' y1='2' x2='12' y2='6' />
                            <line x1='12' y1='18' x2='12' y2='22' />
                            <line x1='4.93' y1='4.93' x2='7.76' y2='7.76' />
                            <line x1='16.24' y1='16.24' x2='19
.07' y2='19.07' />
                            <line x1='2' y1='12' x2='6' y2='12' />
                            <line x1='18' y1='12' x2='22' y2='12' />
                            <line x1='4.93' y1='19.07' x2='7.76' y2='16.24' />
                            <line x1='16.24' y1='7.76' x2='19.07' y2='4.93' />
                        </svg>
                    </div>
                </div>
            </div>
        )    
    }
        return (
        <div className='interview-page'>
            <div className='interview-layout'>
                <nav className='interview-nav'>
                    <div className='nav-content'>
                        <p className='interview-nav__label'>Sections</p>
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                type='button'
                                className={`interview-nav__item ${activeNav === item.id ? 'interview-nav__item--active' : ''}`}
                                onClick={() => setActiveNav(item.id)}
                            >
                                <span className='interview-nav__icon'>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <div className='interview-nav__actions'>
                        <button type='button' className='button primary-button' onClick={handleDownloadResume} disabled={!currentInterviewId || loading}>
                            <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                                <path d='M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3z' />
                                <path d='M19 13l.9 2.1L22 16l-2.1.9L19 19l-.9-2.1L16 16l2.1-.9L19 13z' />
                                <path d='M5 13l.9 2.1L8 16l-2.1.9L5 19l-.9-2.1L2 16l2.1-.9L5 13z' />
                            </svg>
                            Download Resume
                        </button>

                        <button type='button' className='button interview-nav__home-button' onClick={handleCreateNewReport}>
                            <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                                <path d='M3 12h18' />
                                <path d='M3 12l6-6' />
                                <path d='M3 12l6 6' />
                            </svg>
                            Generate New Report
                        </button>
                    </div>
                </nav>

                <div className='interview-divider' />

                <main className='interview-content'>
                    {activeNav === 'technical' && (
                        <section>
                            <div className='content-header'>
                                <h2>Technical Questions</h2>
                                <span className='content-header__count'>{report.technicalQuestions.length} questions</span>
                            </div>
                            <div className='q-list'>
                                {report.technicalQuestions.map((question, index) => (
                                    <QuestionCard key={index} item={question} index={index} />
                                ))}
                            </div>
                        </section>
                    )}

                    {activeNav === 'behavioral' && (
                        <section>
                            <div className='content-header'>
                                <h2>Behavioral Questions</h2>
                                <span className='content-header__count'>{report.behavioralQuestions.length} questions</span>
                            </div>
                            <div className='q-list'>
                                {report.behavioralQuestions.map((question, index) => (
                                    <QuestionCard key={index} item={question} index={index} />
                                ))}
                            </div>
                        </section>
                    )}

                    {activeNav === 'roadmap' && (
                        <section>
                            <div className='content-header'>
                                <h2>Preparation Road Map</h2>
                                <span className='content-header__count'>{report.preparationPlan.length}-day plan</span>
                            </div>
                            <div className='roadmap-list'>
                                {report.preparationPlan.map((day) => (
                                    <RoadMapDay key={day.day} day={day} />
                                ))}
                            </div>
                        </section>
                    )}
                </main>

                <div className='interview-divider' />

                <aside className='interview-sidebar'>
                    <div className='match-score'>
                        <p className='match-score__label'>Match Score</p>
                        <div className={`match-score__ring ${scoreColor}`}>
                            <span className='match-score__value'>{hasMatchScore ? report.matchScore : '--'}</span>
                            {hasMatchScore && <span className='match-score__pct'>%</span>}
                        </div>
                    </div>

                    <div className='sidebar-divider' />

                    <div className='skill-gaps'>
                        <p className='skill-gaps__label'>Skill Gaps</p>
                        <div className='skill-gaps__list'>
                            {report.skillGaps.map((gap, index) => (
                                <span key={index} className={`skill-tag skill-tag--${gap.severity}`}>
                                    {gap.skill}
                                </span>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    )
}

export default Interview