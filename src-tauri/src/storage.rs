//! Where the mail database is kept.
//!
//! It sits in the app's data folder unless the user has chosen another one. That choice
//! cannot live in the database, because it has to be known before the database is
//! opened, so it is a small file beside the app's configuration.
//!
//! A move never happens while the app is running: closing the database under the
//! commands that use it is not something this app can do safely. Choosing a folder
//! records where the database should go, and the move is carried out at the next start,
//! before anything is opened — by then no write can be missed.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::{Error, Result};

/// The database file inside the chosen folder.
pub const DATABASE: &str = "openwren.db";
/// The file holding the choice, beside the app's configuration.
const POINTER: &str = "storage.json";

/// What the choice file holds.
#[derive(Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Choice {
    /// Where the database is kept, once it has been moved there.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data_dir: Option<String>,
    /// Where it is to be moved at the next start.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub move_to: Option<String>,
}

/// The choice file, and the folder used while no choice has been made.
pub struct Layout {
    pub pointer: PathBuf,
    pub default_dir: PathBuf,
}

impl Layout {
    pub fn new(pointer: PathBuf, default_dir: PathBuf) -> Self {
        Self { pointer, default_dir }
    }

    /// The choice as it is on disk. Missing or unreadable leaves the default in place;
    /// a broken file must not keep the app from opening its mail.
    pub fn choice(&self) -> Choice {
        match std::fs::read(&self.pointer) {
            Ok(bytes) => serde_json::from_slice(&bytes).unwrap_or_default(),
            Err(_) => Choice::default(),
        }
    }

    fn write(&self, choice: &Choice) -> Result<()> {
        let folder = self.pointer.parent().ok_or(Error("The storage setting has no folder to be written in.".into()))?;
        std::fs::create_dir_all(folder).map_err(|e| Error(format!("Could not create {}: {e}", folder.display())))?;
        // Written next door and renamed, so a half-written file is never read back.
        let temporary = self.pointer.with_extension("json.tmp");
        let bytes = serde_json::to_vec_pretty(choice).map_err(|e| Error(format!("The storage setting could not be written: {e}")))?;
        std::fs::write(&temporary, bytes)
            .and_then(|()| std::fs::rename(&temporary, &self.pointer))
            .map_err(|e| Error(format!("Could not write {}: {e}", self.pointer.display())))
    }

    /// The folder the database lives in right now.
    pub fn data_dir(&self) -> PathBuf {
        self.choice().data_dir.map(PathBuf::from).unwrap_or_else(|| self.default_dir.clone())
    }

    /// Carry out a move planned by an earlier run. Called before the database is opened,
    /// so the files can simply be moved.
    pub fn finish_pending(&self) -> Result<()> {
        let mut choice = self.choice();
        let Some(target) = choice.move_to.take() else { return Ok(()) };
        let target = PathBuf::from(target);
        let from = choice.data_dir.as_ref().map(PathBuf::from).unwrap_or_else(|| self.default_dir.clone());
        if from != target {
            move_database(&from, &target)?;
        }
        choice.data_dir = Some(target.to_string_lossy().into_owned());
        self.write(&choice)
    }

    /// Plan a move to `target` for the next start. The database keeps being written where
    /// it is until then, so nothing that arrives in between is lost.
    pub fn plan_move(&self, target: &Path) -> Result<PathBuf> {
        if !target.is_absolute() {
            return Err(Error("Choose a folder by its full path.".into()));
        }
        if target.join(DATABASE).exists() {
            return Err(Error("That folder already holds a mail database. Choose an empty folder.".into()));
        }
        std::fs::create_dir_all(target).map_err(|e| Error(format!("Could not create {}: {e}", target.display())))?;
        let mut choice = self.choice();
        choice.move_to = Some(target.to_string_lossy().into_owned());
        self.write(&choice)?;
        Ok(target.to_path_buf())
    }
}

/// Move the database and its write-ahead files. Files that are not there are skipped.
fn move_database(from: &Path, to: &Path) -> Result<()> {
    std::fs::create_dir_all(to).map_err(|e| Error(format!("Could not create {}: {e}", to.display())))?;
    for suffix in ["", "-wal", "-shm"] {
        let source = from.join(format!("{DATABASE}{suffix}"));
        if !source.exists() {
            continue;
        }
        let destination = to.join(format!("{DATABASE}{suffix}"));
        // A rename is both a move and an atomic one, but it cannot cross file systems
        // (a network drive, a second disk). There a copy is made first, and the original
        // is removed only once the copy is complete.
        match std::fs::rename(&source, &destination) {
            Ok(()) => {}
            Err(_) => {
                std::fs::copy(&source, &destination).and_then(|_| std::fs::remove_file(&source)).map_err(|e| {
                    Error(format!("Could not move {} to {}: {e}", source.display(), to.display()))
                })?;
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A folder of its own per test, removed when the test ends.
    fn folder(name: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!("openwren-storage-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&path);
        std::fs::create_dir_all(&path).unwrap();
        path
    }

    fn layout(name: &str) -> (Layout, PathBuf, PathBuf) {
        let root = folder(name);
        let pointer = root.join("config").join("storage.json");
        let default_dir = root.join("data");
        std::fs::create_dir_all(&default_dir).unwrap();
        (Layout::new(pointer, default_dir.clone()), root, default_dir)
    }

    #[test]
    fn the_default_folder_is_used_until_another_one_is_chosen() {
        let (layout, _root, default_dir) = layout("default");
        assert_eq!(layout.data_dir(), default_dir);
        assert_eq!(layout.choice(), Choice::default());
    }

    #[test]
    fn a_planned_move_carries_the_database_and_its_write_ahead_files() {
        let (layout, _root, default_dir) = layout("move");
        std::fs::write(default_dir.join(DATABASE), b"mail").unwrap();
        std::fs::write(default_dir.join(format!("{DATABASE}-wal")), b"log").unwrap();
        let target = default_dir.parent().unwrap().join("elsewhere");

        let planned = layout.plan_move(&target).unwrap();
        assert_eq!(planned, target);
        assert_eq!(layout.choice().move_to.as_deref(), Some(target.to_string_lossy().as_ref()));
        // Nothing moved yet: the app is still writing where it was.
        assert!(default_dir.join(DATABASE).exists());

        layout.finish_pending().unwrap();
        assert_eq!(std::fs::read(target.join(DATABASE)).unwrap(), b"mail");
        assert_eq!(std::fs::read(target.join(format!("{DATABASE}-wal"))).unwrap(), b"log");
        assert!(!default_dir.join(DATABASE).exists(), "the old copy is left behind");
        assert_eq!(layout.data_dir(), target);
        assert!(layout.choice().move_to.is_none(), "the move is not carried out twice");
    }

    #[test]
    fn a_folder_that_already_holds_a_database_is_refused() {
        let (layout, _root, default_dir) = layout("refuse");
        let target = default_dir.parent().unwrap().join("taken");
        std::fs::create_dir_all(&target).unwrap();
        std::fs::write(target.join(DATABASE), b"someone else's mail").unwrap();

        let refused = layout.plan_move(&target).unwrap_err();
        assert!(refused.0.contains("already holds"), "{}", refused.0);
        assert!(layout.choice().move_to.is_none(), "a refused move must not be recorded");
    }

    #[test]
    fn a_broken_choice_file_leaves_the_mail_where_it_is() {
        let (layout, _root, default_dir) = layout("broken");
        std::fs::create_dir_all(layout.pointer.parent().unwrap()).unwrap();
        std::fs::write(&layout.pointer, b"{ not json").unwrap();
        assert_eq!(layout.data_dir(), default_dir);
    }

    #[test]
    fn moving_back_to_the_default_folder_is_possible() {
        let (layout, _root, default_dir) = layout("back");
        std::fs::write(default_dir.join(DATABASE), b"mail").unwrap();
        let target = default_dir.parent().unwrap().join("elsewhere");
        layout.plan_move(&target).unwrap();
        layout.finish_pending().unwrap();

        // Choosing the default folder again, which is now empty, moves the mail back.
        layout.plan_move(&default_dir).unwrap();
        layout.finish_pending().unwrap();
        assert_eq!(std::fs::read(default_dir.join(DATABASE)).unwrap(), b"mail");
        assert_eq!(layout.data_dir(), default_dir);
    }
}
