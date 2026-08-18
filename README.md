# Nyla's Workout Tracker — Version 2

This version adds planning and reusable workout templates while keeping the original local-first workout log.

## New in Version 2

- Plan a workout for any future date
- Create reusable workout templates
- Load a template into a future date
- Start a planned workout on its scheduled day
- Start a future plan early
- Set target sets, weight, reps, RPE, cardio duration/distance, and notes
- Reorder exercises in plans/templates
- Edit or delete plans
- Edit or delete templates
- Planned workout automatically creates the correct number of logging rows
- History shows **Planned vs Actual** for workouts started from a plan
- Completed plans are marked completed
- Backups include workouts, exercises, plans, and templates

## Existing data

This build intentionally uses the same workout/exercise storage keys as Version 1 for this app. If you replace the files at the same hosted URL and use the same browser/device, existing workout history should remain.

Still, export a backup before replacing files.

## Recommended update process

1. Open the existing app.
2. Go to **Progress → Export backup**.
3. Replace the old GitHub repository files with the files in this Version 2 folder.
4. Wait for GitHub Pages to redeploy.
5. Refresh the app.
6. If needed, use **Import backup**.

## Planning tomorrow's workout

1. Open **Plans**.
2. Tap **+ Plan workout**.
3. Pick tomorrow's date.
4. Name the workout.
5. Add exercises.
6. Set targets.
7. Save.

The next day, the Today tab shows the planned workout with **Start workout**.

## Templates

1. Open **Plans**.
2. Tap **+ New template**.
3. Name the routine.
4. Add exercises and targets.
5. Save.
6. Later choose **Plan from template** and select a date.

## Run locally

```bash
cd /path/to/nylas-workout-tracker
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```
