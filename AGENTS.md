<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- App data (tasks, meetings, emails, schedule, settings) lives in one shared browser store (`src/lib/store.ts`) so all modules share one data model without accounts.
- AI calls run only in server functions (`src/lib/ai.functions.ts` → `ai.server.ts`); the scheduler is deterministic code (`src/lib/scheduler.ts`, tested) so plans never overlap or silently drop tasks.
