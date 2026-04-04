const resume=`Name: Aryan Sharma
Experience: 3.5 years as a Full Stack Engineer

Core Skills:
- JavaScript, TypeScript, Node.js, Express.js, React.js
- PostgreSQL, MongoDB, Redis
- REST APIs, JWT auth, Docker, GitHub Actions, AWS EC2/S3

Projects:
1) JobTrack Pro (MERN)
- Built a role-based hiring dashboard used by 40+ recruiters.
- Implemented server-side pagination and query optimization, reducing API response time from 900ms to 240ms.
- Added JWT auth with refresh token rotation and blacklist strategy.

2) Commerce API Platform (Node + PostgreSQL)
- Designed modular service architecture and wrote 70+ unit/integration tests.
- Implemented Redis caching for product catalog endpoints, reducing DB load by 45%.
- Added background jobs for email notifications using BullMQ.

3) Real-time Support Chat
- Built WebSocket based chat with typing indicators and reconnect logic.
- Added monitoring with Winston logs and error alerts.

Strengths:
- Debugging production issues quickly
- Clear communication with product and design teams
- Writing maintainable backend APIs

Gaps:
- Limited hands-on system design for very high scale systems
- Beginner-level Kubernetes knowledge
- Needs stronger DSA speed under timed interview conditions`;

const selfDescription=`I am applying for backend-heavy full stack roles where I can build reliable APIs and scalable services. 
I am strongest in Node.js, Express, MongoDB/PostgreSQL, and React.

I prepare before shipping features by writing API contracts, edge cases, and test scenarios. I also focus on clean error handling and logging so issues can be diagnosed quickly.

In interviews, I am confident explaining real project trade-offs such as choosing Redis caching, index strategy in MongoDB, and token invalidation approach. I want to improve in large-scale architecture interviews, especially topics like partitioning, event-driven systems, and resilience patterns.

My goal is to join a product team where performance, correctness, and user impact are all important.`;

const jobDescription=`Role: Software Engineer II (Backend / Full Stack)
Company Domain: Hiring-tech SaaS platform

Must Have:
- 3+ years experience in Node.js and TypeScript
- Strong understanding of REST API design, authentication, and authorization
- Experience with MongoDB or PostgreSQL and query optimization
- Ability to write tests and maintain CI pipelines
- Good debugging and communication skills

Good To Have:
- Redis caching, message queues, background workers
- Docker and AWS deployment experience
- Exposure to system design and distributed systems concepts

Interview Focus Areas:
1) Backend fundamentals: API design, middleware, validation, error handling
2) Database design: schema decisions, indexes, performance bottlenecks
3) Security: JWT flow, refresh strategy, token revocation
4) Practical coding: build/extend an endpoint with clean architecture
5) Behavioral: ownership, conflict resolution, handling production incidents

Expected Candidate Traits:
- Can explain decisions with trade-offs
- Writes readable and testable code
- Thinks from reliability and performance perspective`;

module.exports={resume,selfDescription,jobDescription};