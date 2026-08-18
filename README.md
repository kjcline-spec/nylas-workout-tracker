# Nyla's Workout Tracker

A free, local-first workout tracker that runs in a normal web browser and can be installed to your phone as a PWA.

## Features

- Log workouts by date and name
- Add unlimited exercises and sets
- Weight + reps, reps-only, and cardio tracking modes
- Optional RPE
- Body-weight field
- Workout notes
- View, edit, and delete workout history
- Shows your previous logged performance when you add an exercise
- Editable exercise library
- Search exercises and history
- Progress summaries and exercise history
- Export/import backups
- Dark mode
- Offline-capable after the first load

## Easiest way to run it on your Mac

### Option A — Python (already installed on many Macs)

1. Unzip the `nylas-workout-tracker.zip` folder.
2. Open Terminal.
3. Type `cd ` (include the space), then drag the unzipped `nylas-workout-tracker` folder into Terminal and press Return.
4. Run:

   python3 -m http.server 8080

5. Open Safari or Chrome and go to:

   http://localhost:8080

Keep that Terminal window open while using the app locally.

### Option B — VS Code

If you already use VS Code, install the "Live Server" extension, open the folder, and click "Go Live".

## How to change which exercises you need

You do NOT need to edit the code.

1. Open the app.
2. Tap **Exercises**.
3. Use **+ New exercise** to add anything you want.
4. Tap **Edit** next to any exercise to rename it or change its muscle group/tracking type.
5. Tap **Delete** to remove an exercise from the library.

Deleting an exercise from the library does not erase it from old workouts. Past workouts retain a saved copy of the exercise name/type.

## How to log a workout

1. Open **Today**.
2. Enter a workout name if you want (Push, Pull, Legs, etc.).
3. Tap **+ Add exercise**.
4. Choose an exercise from your library.
5. Enter your sets.
6. Tap **+ Set** for more sets.
7. Repeat for more exercises.
8. Tap **Save workout**.

The next time you add the same exercise, the app shows the previous logged numbers.

## How to keep your data safe

The app stores workout data in your browser on that device.

Go to **Progress → Backup & restore → Export backup** periodically. This downloads a JSON file containing your exercise library and workout history.

Use **Import backup** to restore it.

## Put it online for free with GitHub Pages

1. Create a free GitHub account if you don't already have one.
2. Create a new public repository, for example `nylas-workout-tracker`.
3. Upload all files from this folder to the repository.
4. In the repository, open **Settings → Pages**.
5. Under "Build and deployment", choose **Deploy from a branch**.
6. Select the `main` branch and `/ (root)` folder, then Save.
7. GitHub will give you a URL for the app.

Once hosted over HTTPS, you can open that URL on your phone and add it to your home screen.

## iPhone home screen

1. Open the hosted app URL in Safari.
2. Tap the Share button.
3. Choose **Add to Home Screen**.
4. Name it "Nyla's Workout Tracker" and tap Add.

## Important note about data

Version 1 is intentionally local-first: no account, no subscription, no remote database. That keeps it free and private, but data does not automatically sync between devices. Use Export/Import for backups or moving your history.

A later version could add optional cloud sync without changing the logging experience.
