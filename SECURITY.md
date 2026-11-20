# Security

## Reporting a problem

Please do not open a public issue for a security problem. Use GitHub's private reporting on this repository (Security, then Report a vulnerability). You will get a reply within a few working days.

## What Mind Map does to protect you

- **Your diagrams stay on your computer.** Each one is a JSON file in `~/.plugmcp/mindmap/`, or in the folder you set with `MINDMAP_DIR`. The server makes no network calls and sends no telemetry.
- **The view loads nothing from outside.** It is one HTML file with its code and styles inline. It asks for no exceptions to the content security policy a chat client applies, so it cannot fetch from or send to any address.
- **Ids cannot become paths.** A diagram id goes into a file name, so only ids of the form the server makes (6 to 16 lowercase letters and digits) are accepted. Export file names are checked the same way and are written only to the `exports` folder inside the diagrams folder.
- **Input is checked and bounded.** Tool input is validated against a schema: at most 300 nodes and 400 edges per diagram, and length limits on every text field. Text from the model is drawn as text, never as HTML.
- **Local by default over HTTP.** `mindmap-mcp --http` listens on `127.0.0.1` and refuses requests whose `Host` or `Origin` is not this machine.

## When you put the server online

There is **no sign-in**. If you set `MINDMAP_ALLOWED_HOSTS` to serve other computers, anyone who can reach the address can read and change every diagram, and the server keeps all diagrams in one folder with no separation between people. Put it behind your own authentication, and give each user their own store, before exposing it. See "Storage" in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## What the AI sees

What you write in a diagram is sent to the AI by your chat client as part of the conversation: node labels, notes, comments, and a list of your recent edits. Treat it like anything else you type into the chat.
