//! One error type for the whole core: a message the UI can show, and a category it can
//! act on.

use std::fmt::Display;

/// Deliberately does not implement `Display`, so that the blanket
/// `From<E: Display>` below can convert any library error with `?`.
#[derive(Debug)]
pub struct Error(pub String);

/// The message used when a server stops answering in the middle of a command. The
/// session cannot be used again after that — what the server believes it was asked is
/// unknown — so callers that would otherwise carry on reconnect instead.
pub const LOST: &str = "The mail server stopped answering.";

/// What went wrong, as far as the words of the message tell. The interface uses it to
/// say what it means in the reader's language and to offer the right next step, which is
/// why every failure worth telling apart has its own wording below.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Kind {
    /// The password, authorisation code or sign-in was refused.
    Auth,
    /// The connection could not be encrypted the way the server expects.
    Tls,
    /// No answer, a timeout, or a connection that went away.
    Network,
    /// The message or folder is no longer there.
    NotFound,
    /// The mailbox is full, or the message is too large.
    Quota,
    Server,
    Other,
}

impl Error {
    pub fn lost(&self) -> bool {
        self.0.starts_with(LOST)
    }

    pub fn kind(&self) -> Kind {
        Kind::of(&self.0)
    }
}

impl Kind {
    /// Reads the category back from the message. The order matters: a message that says
    /// both "timed out" and "sign-in" is a network problem, because the answer may have
    /// been fine and only the wait expired.
    pub fn of(message: &str) -> Kind {
        let text = message.to_ascii_lowercase();
        let has = |needle: &str| text.contains(needle);
        if has("quota") || has("too large") || has("mailbox is full") || has("over the limit") || has("exceeded") {
            Kind::Quota
        } else if has("certificate") || has("tls") || has("handshake") || has("encrypt") || has("invalid peer") {
            Kind::Tls
        } else if has("stopped answering")
            || has("timed out")
            || has("timeout")
            || has("closed the connection")
            || has("did not respond")
            || has("connection refused")
            || has("connection reset")
            || has("network")
            || has("dns")
            || has("unreachable")
        {
            Kind::Network
        } else if has("no longer on the server") || has("not found") || has("does not exist") || has("no such mailbox") {
            Kind::NotFound
        } else if has("sign-in")
            || has("sign in")
            || has("password")
            || has("authentication")
            || has("authorisation")
            || has("authorization")
            || has("unauthorized")
            || has("refused the sign-in")
        {
            Kind::Auth
        } else {
            Kind::Other
        }
    }
}

impl<E: Display> From<E> for Error {
    fn from(e: E) -> Self {
        Error(e.to_string())
    }
}

/// Serialised as `{ "kind": "auth", "message": "…" }`: the interface shows the message
/// to whoever wants the detail, and chooses the words and the next step from the kind.
impl serde::Serialize for Error {
    fn serialize<S: serde::Serializer>(&self, s: S) -> std::result::Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut out = s.serialize_struct("Error", 2)?;
        out.serialize_field("kind", &self.kind())?;
        out.serialize_field("message", &self.0)?;
        out.end()
    }
}

pub type Result<T> = std::result::Result<T, Error>;

#[cfg(test)]
mod tests {
    use super::*;

    /// The messages the engine actually writes, and what each of them means.
    #[test]
    fn sorts_real_messages_into_categories() {
        let cases: &[(&str, Kind)] = &[
            ("The server did not accept the sign-in: LOGIN failed", Kind::Auth),
            ("The server did not accept the Google sign-in: invalid_grant", Kind::Auth),
            ("The outgoing server did not accept the sign-in: 535 rejected", Kind::Auth),
            ("Google refused the sign-in (400): invalid_grant", Kind::Auth),
            ("The password for this account is wrong.", Kind::Auth),
            ("Sign-in timed out. Try again.", Kind::Network),
            ("The mail server stopped answering.", Kind::Network),
            ("Connecting to imap.example.com timed out.", Kind::Network),
            ("The server closed the connection.", Kind::Network),
            ("The outgoing server smtp.example.com did not respond.", Kind::Network),
            ("connection reset by peer", Kind::Network),
            ("failed to read: invalid peer certificate: UnknownIssuer", Kind::Tls),
            ("The TLS handshake failed.", Kind::Tls),
            ("This message is no longer on the server.", Kind::NotFound),
            ("The folder was not found.", Kind::NotFound),
            ("The mailbox is full.", Kind::Quota),
            ("The message is too large for this server.", Kind::Quota),
            ("something nobody wrote on purpose", Kind::Other),
        ];
        for (message, kind) in cases {
            assert_eq!(Kind::of(message), *kind, "{message}");
        }
    }

    #[test]
    fn a_lost_connection_is_a_network_problem_and_stays_recognisable() {
        let error = Error(LOST.to_string());
        assert!(error.lost());
        assert_eq!(error.kind(), Kind::Network);
        assert!(!Error("The server did not accept the sign-in.".into()).lost());
    }

    #[test]
    fn an_error_is_sent_as_its_kind_and_its_message() {
        let sent = serde_json::to_string(&Error("Connecting to host timed out.".into())).unwrap();
        assert_eq!(sent, r#"{"kind":"network","message":"Connecting to host timed out."}"#);
    }
}
