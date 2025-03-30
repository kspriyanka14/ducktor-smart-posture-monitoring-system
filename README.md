# 🦆 Ducktor - Your Feathered Posture Pro

## Our Story

It all started when Priyanka from our team came across an Instagram post about the shocking effects of prolonged sitting and poor posture. The post was filled with intimidating medical jargon and scary statistics, but the message was clear - many of us are unknowingly damaging our bodies as we work.

Instead of adding to the fear, we thought: "Why not create something friendly that helps people fix this problem?" That's how Ducktor was born - a desktop companion that watches over you while you work, minus the medical scaremongering and plus a cute duck!

We chose to make it a desktop app rather than a web app because we wanted something that could run in the background without adding another browser tab to your already cluttered workspace. Plus, desktop apps can access camera feeds more reliably for posture detection.

## Team Ducktor

- Vishnu Vardhan Putta (Electron Research, App Setup & Backend Programming)
- Priyanka Kavali Subramanyam  (UI Design & Duck Graphics)
- Sairithik Komuravelly (TensorFlow.js Research & Project Documentation)
- Shreyas Kumar Bhakta (MVP Front-end Development)

## What Does Ducktor Do?

Ducktor uses your webcam to monitor your posture while you work. When it notices you slouching or leaning awkwardly for too long, it sends a friendly "quack" notification to remind you to straighten up. It also reminds you to take breaks at intervals you set.

**Key Features:**
- Real-time posture monitoring with TensorFlow.js
- Customizable break reminders
- Carousel of simple posture-improving exercises
- Fun duck-themed notifications
- Light/dark mode for different preferences

## Tech Behind the Quack

None of us had worked with Electron before Quack Hacks, so the first few hours were a steep learning curve! But we dove in and built Ducktor using:

- **Electron** for the desktop application framework
- **TensorFlow.js** with MoveNet for real-time posture detection
- **HTML/CSS/JavaScript** for the interface
- Clean, descriptive variable names and function documentation to make our code accessible to other developers

## Why Your Back Will Thank You

According to a 2023 study by the American Posture Institute, over 80% of desk workers experience back pain, costing companies an estimated $87 billion annually in healthcare costs and lost productivity.

Ducktor helps address this by:
- Detecting early signs of poor posture before pain develops
- Encouraging regular movement throughout the day
- Teaching simple exercises like chest release, standing forward bend, shoulder rolls, and spine stretches

## Accessibility Matters

We believe good posture tools should be accessible to everyone, so we:
- Designed with high-contrast color options
- Ensured screen reader compatibility throughout the app
- Included light/dark themes for different visual preferences and reduced eye strain

## Try It Yourself

1. Clone the repo:
   ```bash
   git clone https://github.com/421pvv/ducktor.git
   cd ducktor
   ```

2. Install dependencies and run:
   ```bash
   npm install
   npm start
   ```

3. To build for macOS:
   ```bash
   npm install --save-dev electron-builder
   npm run build
   ```

## Business Potential

**Target:** Anyone who spends hours at a computer daily - remote workers, students, office employees.

**Possible Expansions:**
- Enterprise version with team analytics for corporate wellness programs
- Integration with smart watches for improved monitoring
- Partnerships with ergonomic furniture companies

---

*Straighten up and quack on!* 🦆