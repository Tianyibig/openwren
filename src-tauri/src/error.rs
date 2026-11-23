//! One error type for the whole core: a message the UI can show.

use std::fmt::Display;

/// Deliberately does not implement `Display`, so that the blanket
/// `From<E: Display>` below can convert any library error with `?`.
#[derive(Debug)]
pub struct Error(pub String);

/// The message used when a server stops answering in the middle of a command. The
/// session cannot be used again after that — what the server believes it was asked is
/// unknown — so callers that would otherwise carry on reconnect instead.
pub const LOST: &str = "The mail server stopped answering.";

impl Error {
    pub fn lost(&self) -> bool {
        self.0.starts_with(LOST)
    }
}

impl<E: Display> From<E> for Error {
    fn from(e: E) -> Self {
        Error(e.to_string())
    }
}

impl serde::Serialize for Error {
    fn serialize<S: serde::Serializer>(&self, s: S) -> std::result::Result<S::Ok, S::Error> {
        s.serialize_str(&self.0)
    }
}

pub type Result<T> = std::result::Result<T, Error>;
