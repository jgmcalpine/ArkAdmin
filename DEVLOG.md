# Developer Log: Roadblocks & Solutions

This document tracks the technical challenges encountered during the development of ArkAdmin and the architectural decisions made to resolve them. It serves as a guide for others attempting to integrate Next.js with the Bark Bitcoin Daemon.

## 1. Private NPM Registry vs. Local Development
**The Problem:**
We needed to use the @second-tech/barkd-rest-client SDK. Attempting to install it via standard npm install commands failed with a "404 Not Found" error. This happened because the package is likely hosted on a private server (GitLab) or hasn't been published to the public internet yet.

**The First Attempt (Symlinking):**
We tried to download the code to a folder on our computer and "link" it to our project. This failed with "Module not found" errors.

**The Technical Explanation:**
When you link a folder, you are creating a shortcut. Next.js (our web framework) is very strict about security and structure; when it followed the shortcut, it realized the files were outside the project folder and refused to build them.

**The Solution:**
We used the "npm pack" command to turn the library into a .tgz file (a Tarball).

**Why this works:**
A "Tarball" is like a zipped folder. By packing the library into a single file, we can physically move it into our project and install it just like a regular file. This tricks npm into treating it like a normal download from the internet, removing the confusing shortcuts (symlinks) entirely.

## 2. Rust Toolchain (Bleeding Edge)
**The Problem:**
When trying to compile the Bark software, we received an error saying "feature edition2024 is required."

**The Technical Explanation:**
Software languages have versions, just like phones. Most of the time, developers use the "Stable" version. However, Bark is built using features from the "Future" (Rust 2024 Edition) that haven't been released to the general public yet.

**The Solution:**
We switched our compiler to the "Nightly" toolchain.

**Why this works:**
"Nightly" is the experimental version of the Rust compiler—it gets updated every night with the latest, unfinished features. By switching to Nightly, we told our computer it was okay to use these experimental features to build the code.

## 3. Missing System Dependencies (Protobuf)
**The Problem:**
The build failed again with "Could not find protoc."

**The Technical Explanation:**
Bark uses a communication style called gRPC to talk between the server and the wallet. To make this work, the code needs a translator to turn the definition files into actual code. That translator is a tool called "Protobuf Compiler" (protoc).

**The Solution:**
We installed the tool using Homebrew (brew install protobuf).

**Why this works:**
Installing the compiler gave the build system the "translator" it needed to understand the communication files and finish building the application.

## 4. Binary Identity Crisis (CLI vs. Daemon)
**The Problem:**
We tried to start the server using the "bark" command, but it rejected our settings with an "unexpected argument" error.

**The Technical Explanation:**
The project builds multiple programs. "bark" is the Remote Control (CLI) intended for humans to type commands into. "barkd" (Bark Daemon) is the Engine intended to run in the background and process transactions. We were trying to give engine instructions to the remote control.

**The Solution:**
We located the correct file named "barkd" in the target folder and ran that instead.

**Why this works:**
The "barkd" program is specifically designed to stay awake, listen for connections, and manage the wallet, which is exactly what our Admin Panel needs to talk to.

## 5. Port Conflict (The "Port 3000" Battle)
**The Problem:**
Our web app started, but it couldn't talk to the Bark Daemon. We kept getting "404" errors.

**The Technical Explanation:**
Computers use numbered "Ports" to organize network traffic. Think of them like parking spaces. By default, Next.js tries to park in Space 3000. It turned out that the Bark Daemon also likes to park in Space 3000. Since two cars can't park in the same spot, they were colliding.

**The Solution:**
We moved our Next.js application to Port 3001.

**Why this works:**
By assigning the web application to Port 3001, we left Port 3000 open for the Daemon. Now, the web app lives at 3001 and sends messages to the Daemon at 3000 without any conflicts.