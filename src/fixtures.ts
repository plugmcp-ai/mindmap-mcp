import type { Doc } from "./model/schema.js";

/** Sample diagrams, used by the tests, the gallery and the demo video. */

export const launchPlan: Doc = {
  title: "Product launch",
  structure: "mindmap",
  nodes: [
    { id: "root", label: "Product launch" },
    { id: "aud", label: "Audience", parent: "root" },
    { id: "aud1", label: "Indie developers", parent: "aud" },
    { id: "aud2", label: "Small teams", parent: "aud" },
    { id: "aud3", label: "Agencies", parent: "aud", note: "Later. They need invoices and seats first." },
    { id: "msg", label: "Message", parent: "root" },
    { id: "msg1", label: "See your ideas", parent: "msg" },
    { id: "msg2", label: "Edit in the chat", parent: "msg" },
    { id: "msg3", label: "Open source", parent: "msg" },
    { id: "chan", label: "Channels", parent: "root" },
    { id: "chan1", label: "Hacker News", parent: "chan", status: "todo" },
    { id: "chan2", label: "Product Hunt", parent: "chan", status: "todo" },
    { id: "chan3", label: "Demo video", parent: "chan", status: "doing" },
    { id: "chan4", label: "Newsletter", parent: "chan", status: "idea" },
    { id: "price", label: "Pricing", parent: "root" },
    { id: "price1", label: "Free forever", parent: "price", status: "done" },
    { id: "price2", label: "Hosted plan", parent: "price", status: "idea" },
    { id: "risk", label: "Risks", parent: "root" },
    { id: "risk1", label: "Host support varies", parent: "risk", status: "risk" },
    { id: "risk2", label: "Launch day bugs", parent: "risk", status: "risk" },
    { id: "time", label: "Timeline", parent: "root" },
    { id: "time1", label: "Private beta", parent: "time" },
    { id: "time2", label: "Public launch", parent: "time" },
    { id: "time3", label: "First retro", parent: "time" },
  ],
  edges: [{ from: "chan3", to: "msg1", label: "shows" }],
};

export const signupFlow: Doc = {
  title: "Sign-up flow",
  structure: "flowchart",
  nodes: [
    { id: "start", label: "Open sign-up", kind: "start" },
    { id: "form", label: "Enter email" },
    { id: "valid", label: "Email valid?", kind: "decision" },
    { id: "fix", label: "Show the error" },
    { id: "send", label: "Send the code" },
    { id: "code", label: "Code correct?", kind: "decision" },
    { id: "retry", label: "Ask again" },
    { id: "done", label: "Account ready", kind: "end" },
  ],
  edges: [
    { from: "start", to: "form" },
    { from: "form", to: "valid" },
    { from: "valid", to: "fix", label: "no" },
    { from: "fix", to: "form" },
    { from: "valid", to: "send", label: "yes" },
    { from: "send", to: "code" },
    { from: "code", to: "retry", label: "no" },
    { from: "retry", to: "code" },
    { from: "code", to: "done", label: "yes" },
  ],
};

export const releaseLanes: Doc = {
  title: "Release handoffs",
  structure: "swimlanes",
  lanes: [
    { id: "dev", label: "Developer" },
    { id: "qa", label: "Reviewer" },
    { id: "ops", label: "Release" },
  ],
  nodes: [
    { id: "pr", label: "Open pull request", lane: "dev", kind: "start" },
    { id: "review", label: "Review the change", lane: "qa" },
    { id: "ok", label: "Approved?", lane: "qa", kind: "decision" },
    { id: "fix", label: "Fix comments", lane: "dev" },
    { id: "merge", label: "Merge", lane: "dev" },
    { id: "tag", label: "Tag the version", lane: "ops" },
    { id: "ship", label: "Publish", lane: "ops", kind: "end" },
  ],
  edges: [
    { from: "pr", to: "review" },
    { from: "review", to: "ok" },
    { from: "ok", to: "fix", label: "no" },
    { from: "fix", to: "review" },
    { from: "ok", to: "merge", label: "yes" },
    { from: "merge", to: "tag" },
    { from: "tag", to: "ship" },
  ],
};

export const outage: Doc = {
  title: "Why did checkout fail?",
  structure: "fishbone",
  nodes: [
    { id: "root", label: "Checkout failed" },
    { id: "code", label: "Code", parent: "root" },
    { id: "code1", label: "Untested retry path", parent: "code" },
    { id: "code2", label: "Timeout too short", parent: "code" },
    { id: "infra", label: "Infrastructure", parent: "root" },
    { id: "infra1", label: "Database at its limit", parent: "infra" },
    { id: "infra2", label: "One region only", parent: "infra" },
    { id: "proc", label: "Process", parent: "root" },
    { id: "proc1", label: "Friday deploy", parent: "proc" },
    { id: "proc2", label: "No rollback plan", parent: "proc" },
    { id: "people", label: "People", parent: "root" },
    { id: "people1", label: "One person on call", parent: "people" },
    { id: "people2", label: "Alert went to email", parent: "people" },
  ],
};

export const history: Doc = {
  title: "Project history",
  structure: "timeline",
  nodes: [
    { id: "root", label: "Project history" },
    { id: "y1", label: "Idea", parent: "root" },
    { id: "y1a", label: "First sketch", parent: "y1" },
    { id: "y2", label: "Prototype", parent: "root" },
    { id: "y2a", label: "Three users", parent: "y2" },
    { id: "y2b", label: "Rewrite", parent: "y2" },
    { id: "y3", label: "Beta", parent: "root" },
    { id: "y3a", label: "Fifty users", parent: "y3" },
    { id: "y4", label: "Launch", parent: "root" },
    { id: "y4a", label: "Open source", parent: "y4" },
    { id: "y5", label: "Version 2", parent: "root" },
  ],
};

export const FIXTURES: Doc[] = [launchPlan, signupFlow, releaseLanes, outage, history];
