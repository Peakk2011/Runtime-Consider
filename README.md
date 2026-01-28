<img src="./assets/Runtime Consider.png" alt="Runtime Consider Logo" width="125"/>

# Runtime Consider
## Recording what actually happened

<br>
<img src="./assets/mockup-of-runtime-consider.svg" alt="Runtime Consider Hero" width="600"/>

### What is this application for

Runtime Consider is a desktop application built to record reality, not to plan your daily life when creating things.

The core idea is simple yet profound: each day of a human's life is a real-time operation, and what happens in the course of that operation can only be recorded once. This app doesn't attempt to improve, motivate, or optimize user behavior; it exists solely to reflect what is actually happening.

Most productivity tools work in the future. They ask you what you want to do, what you should do, or what you hope to accomplish. But

Runtime Consider intentionally rejects that mindset. This app works entirely in the past. It only wants to focus on what has already happened. Anything that didn't happen isn't considered a failure or a gap; it's simply a lack of data.

The conceptual model for this application isn't a to-do list, a journal, or a habit tracker. A more accurate conceptual model is closer to a system log or a change history in a version control system (GIT). Each day is an addable entry; once written, it cannot be changed. There's no concept of editing, improving, or optimizing the past. The past is immutable by design.

This immutability isn't a technical limitation; it's a crucial UX decision. Allowing editing would transform the app into a storytelling tool. 1. Users can manipulate memories to feel better, but this isn't the reality our app, like Runtime Consider, adheres to, and it's not our stance. What we can do is refuse to do so. We value truth more than convenience.

### What inside

Upon launching, the first thing it does is check one condition: Has today's entry been saved?

If the answer is no, the application immediately displays the writing area. Once focused on the writing area, no navigation is necessary; the interface makes it clear that today's entry hasn't been edited.

If the answer is yes, the writing area is locked both visually and functionally, and the application switches to focusing on usage history instead.

The writing area is designed to be as simple as possible. It's just a plain multi-line text input field. There's no formatting, no Markdown, no toolbar, and no fancy UI. Instead, it uses a fixed, appropriately sized font—not too pretty, not too ugly, but perfectly placed. This UI isn't for a retro aesthetic, but to enhance the feeling of recording a story rather than writing an article. Each line represents a fact; pressing Enter creates a new line. A single action saves the entry for that day.

Saving an entry for a specific day is irreversible. Once save is pressed, the input field becomes read-only and remains so permanently. There is no undo, no edit mode, and no emergency exit. This mimics the behavior of low-level systems where disk writing is a one-way operation. The severity of this action is intentional; the app is supposed to feel slightly awkward at this moment.

Below the writing area is the usage history view. The history is linear, scrollable, and read-only. Dates are sorted from newest to oldest. There is no calendar, no monthly overview, and no abstract time display. Time flows only in one direction. Clicking on a past date does not open the editor; it only displays that date for reading.

If a date is missing, the app will clearly indicate this. Empty dates are not auto-filled, hidden, or manipulated. Empty data is considered valid; it doesn't attempt to guess the mood, efficiency, or intent behind the missing data.

In terms of design, the app is modern and simple. The design language borrows concepts from the terminal and code editor but avoids visual imitation. There are no neon colors or gimmicks. Typography and spacing serve most of the purpose. The interface should feel calm, precise, and serious; it shouldn't feel fun or stimulating.

"Record the Truth" - This is not fantasy.<br>
"บันทึกความจริง" - นี่ไม่ใช่เรื่องเพ้อฝัน

### License

MIT License<br>
Peakk2011 - Mint teams<br>
Copyright (c) 2026<br>
