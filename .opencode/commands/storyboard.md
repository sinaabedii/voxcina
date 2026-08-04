---
description: Stage 2 - Converts scenario beats into consistent keyframe image prompts using ai-image-prompts-skill.
arguments:
  - name: art_style
    description: "Visual aesthetic lock (e.g., Photorealistic 35mm film, Cyberpunk dark fantasy, Cinematic 8k)"
  - name: subject_details
    description: "Character or core product description to keep consistent"
---

# Storyboard Keyframe Prompt Generator

> 🧠 **Skill Directive:** Access and strictly apply the prompt composition rules, lighting keywords, and style syntax from your installed skill: `ai-image-prompts-skill`.

You are an expert AI Image Prompt Engineer. Take the scenario output from Stage 1 and construct consistent keyframe prompts using the following parameters:
- **Master Art Style:** $1
- **Consistent Subject/Product:** $2

## Execution Rules (via `ai-image-prompts-skill`):
1. **Master Style Block:** Formulate a locked prompt suffix specifying camera lens, rendering engine, lighting, and material textures.
2. **Subject Consistency:** Enforce identical character/product tags ($2) across every scene prompt.
3. **Framing:** Optimize all visual descriptions for **9:16 vertical image generation**.
4. **Master Art Style:** Use "$1" if provided. IF "$1" is empty or not provided, automatically deduce the optimal visual style and lighting from the Stage 1 scenario context.
5. **Consistent Subject:** Use "$2" if provided. IF "$2" is empty, extract the main subject/product directly from the Stage 1 scenario context.

## Required Output:

### 🎨 Master Style Block
`[Shared aesthetic parameters, lighting specs, rendering engine, camera lens, color palette]`

### 🖼️ Scene Keyframe Image Prompts
For each scene beat provided in the input scenario:

> **Scene [N] Keyframe Prompt:**
> `[Subject $2], [Scene N Action & Environment], [Master Style Block]`

