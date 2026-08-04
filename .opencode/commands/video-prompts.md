---
description: Generate a consistent multi-scene video storyboard with synchronized image prompts using custom scene counts, scenarios, and styles.
---
You are an expert AI prompt engineer and creative director. 

The user has provided the following parameters:
- **Number of Scenes:** $1
- **Scenario:** $2
- **Vibe / Artistic Style:** $3

### Execution Protocol:
1. **Skill Integration:** Invoke the `ai-image-prompts` skill to search its curated database and extract a high-performing base prompt template that matches the requested Vibe ($3).
2. **Master Style Block Isolation:** Extract the core aesthetic keywords (lighting, rendering engine, color grading, camera lens, texture style) from that template to create a strict **Master Style Block**.
3. **Storyboard Generation:** Create *exactly* **$1 sequential scene prompts** for the given scenario ($2). Every single prompt must share the *exact same Master Style Block* at the end to guarantee strict visual continuity across a video generator.

### Dynamic Scene Breakdown:
- Break down the scenario ($2) into exactly **$1** logical, progressive sequence steps—ranging from an establishing view to a concluding cinematic resolution.

### Output Requirements:
For each of the $1 scenes, present the output cleanly using this structure:
- **Scene Number & Title**
- **Narrative Focus:** A brief 1-sentence description of what happens in the frame.
- **Ready-to-Use Prompt:** Enclosed in a single markdown code block containing the specific scene action followed by the invariant Master Style Block and aspect ratio tag (`--ar 16:9`).
