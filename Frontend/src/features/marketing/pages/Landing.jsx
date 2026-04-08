import React from "react";
import { Link } from "react-router";
import "../styles/landing.scss";

const highlights = [
    {
        title: "Role-fit interview plan",
        text: "Paste a JD and get a role-specific prep roadmap with topics, likely rounds, and high-value talking points."
    },
    {
        title: "Resume-powered personalization",
        text: "Upload your resume or write a short profile. The system adapts your strategy around your strengths and gaps."
    },
    {
        title: "Fast, practical output",
        text: "Get an actionable strategy in seconds, then jump into a detailed interview report to prepare with confidence."
    }
];

const steps = [
    "Create account or sign in",
    "Paste job description and add resume/profile",
    "Generate your interview strategy and report"
];

const Landing = () => {
    return (
        <div className="landing-page">
            <header className="landing-nav">
                <p className="brand">JobAI</p>
                <div className="nav-actions">
                    <Link className="nav-link" to="/login">Login</Link>
                    <Link className="nav-link nav-link--solid" to="/register">Register</Link>
                </div>
            </header>

            <main>
                <section className="hero">
                    <p className="hero-kicker">Interview prep, engineered for outcomes</p>
                    <h1>
                        Start with <span>Login or Register</span>, then build your smartest interview game plan.
                    </h1>
                    <p className="hero-copy">
                        A polished workflow for serious candidates. Land on this page, access your account, and unlock tailored preparation built from your profile and target role.
                    </p>

                    <div className="hero-cta">
                        <Link className="cta cta--primary" to="/register">Get Started</Link>
                        <Link className="cta cta--ghost" to="/login">I already have an account</Link>
                    </div>

                    <div className="hero-stats" role="list" aria-label="Product highlights">
                        <article role="listitem">
                            <h3>Structured Prep</h3>
                            <p>Role, skills, and experience aligned strategy</p>
                        </article>
                        <article role="listitem">
                            <h3>Resume Context</h3>
                            <p>Personalized recommendations from your profile</p>
                        </article>
                        <article role="listitem">
                            <h3>Quick Delivery</h3>
                            <p>Action-ready reports without complexity</p>
                        </article>
                    </div>
                </section>

                <section className="feature-grid" aria-label="Core features">
                    {highlights.map((item) => (
                        <article key={item.title} className="feature-card">
                            <h2>{item.title}</h2>
                            <p>{item.text}</p>
                        </article>
                    ))}
                </section>

                <section className="how-it-works" aria-label="How JobAI works">
                    <h2>Simple flow, professional experience</h2>
                    <ol>
                        {steps.map((step) => (
                            <li key={step}>{step}</li>
                        ))}
                    </ol>
                    <Link className="cta cta--primary" to="/register">Create account now</Link>
                </section>
            </main>
        </div>
    );
};

export default Landing;
