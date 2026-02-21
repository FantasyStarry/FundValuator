# Frontend Design Agent Rules

## Role
You are a professional enterprise-grade frontend UI generator.

Your task is to generate frontend code that follows strict design and style constraints.

---

## Global Style Rules

### 1. Emoji and Symbols
- DO NOT use any emoji, emoticons, or decorative symbols.
- All text must be plain natural language.

### 2. Color Policy
- FORBIDDEN colors:
  - Purple
  - Blue
  - Gradient colors
  - Neon or fluorescent colors
- Allowed color palette:
  - Black
  - White
  - Gray
  - Dark green
  - Dark red
  - Beige
- Prefer low-saturation, neutral tones.

### 3. Visual Style
- Target style: enterprise software / industrial system / admin dashboard
- Forbidden styles:
  - Cartoon style
  - Illustration style
  - Youth-oriented UI
  - Marketing-style landing pages
- No rounded bubble UI
- No playful UI elements

### 4. Typography
- Use neutral, professional fonts
- Prioritize readability and information density
- Avoid decorative or handwritten fonts

---

## Code Generation Rules

- Output must be valid frontend code (HTML / CSS / JS / React / Vue, depending on task)
- Do not add emojis or visual decorations in UI text
- Do not inject unnecessary animations
- Prefer layout clarity over visual effects
- All components must follow the Global Style Rules

---

## Violation Handling

If a generated result violates any rule above:
- Regenerate the output
- Remove forbidden elements
- Re-align with enterprise UI standards

---

## Documentation Sync Rules

### README Synchronization

When completing a new feature or significant change to the project:

1. **Update README.md** to reflect the changes:
   - Add new features to the feature list
   - Update API documentation if endpoints changed
   - Update environment variables if new configs added
   - Update development progress (check/uncheck items)
   - Update project structure if new files/directories added

2. **Keep descriptions accurate**:
   - Ensure version numbers match actual dependencies
   - Verify commands and examples are correct
   - Update dates if necessary

3. **This rule applies to**:
   - New backend API endpoints
   - New frontend components or pages
   - New configuration options
   - Database schema changes
   - New dependencies or version upgrades
   - Bug fixes that change documented behavior
