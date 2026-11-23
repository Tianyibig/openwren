//! Rules run over the mail that was already there:
//! `OPENWREN_TEST_IMAP=127.0.0.1:3143 cargo test --test rules_sweep`

use std::sync::{Arc, Mutex};

use openwren_lib::db::{self, Db};
use openwren_lib::model::{AccountSettings, ImapSettings, Security};
use openwren_lib::rules::{self, Rule};
use openwren_lib::sync::{self, Silent};
use openwren_lib::{imap, store};

/// A rule as the Rules page saves it.
fn rule(name: &str, from: &str, action: &str, target: &str) -> Rule {
    Rule { id: 0, name: name.into(), enabled: true, from_contains: from.into(), subject_contains: String::new(), action: action.into(), target: target.into() }
}

/// `sweep` takes the database lock and, through a rule's action, takes it again. Written
/// wrongly that is a deadlock, which on CI means a job that hangs rather than a test that
/// fails — so every call here has a deadline and reports the hang as a failure.
async fn sweep_with_deadline(db: &Db, account_id: Option<i64>, now: i64) -> rules::Sweep {
    let db = db.clone();
    let work = tokio::task::spawn_blocking(move || rules::sweep(&db, account_id, now));
    tokio::time::timeout(std::time::Duration::from_secs(30), work)
        .await
        .expect("rules::sweep must not deadlock on the database lock")
        .expect("the sweep task must not panic")
        .expect("the sweep must not fail")
}

#[tokio::test]
async fn a_rule_written_later_still_files_the_mail_already_here() {
    let Ok(target) = std::env::var("OPENWREN_TEST_IMAP") else {
        eprintln!("OPENWREN_TEST_IMAP not set; skipping");
        return;
    };
    let (host, port) = target.split_once(':').unwrap();
    let user = format!("sweeper-{}@work.test", std::process::id());
    let settings = ImapSettings { host: host.into(), port: port.parse().unwrap(), security: Security::None, username: user.clone() };
    let db: Db = Arc::new(Mutex::new(store::open_in_memory().unwrap()));
    let account = db::insert_account(&db::lock(&db), &user, "Sweeper", "imap", &AccountSettings { imap: Some(settings.clone()), ..Default::default() }).unwrap();
    let mut session = imap::connect(&settings, "pass").await.unwrap();
    let mail = |from: &str, subject: &str| format!("From: {from}\r\nTo: {user}\r\nSubject: {subject}\r\nMessage-ID: <{subject}@openwren.test>\r\n\r\nHello\r\n");

    // Three messages arrive before any rule exists, so all of them stay in the inbox.
    session.append("INBOX", None, None, mail("Friend <friend@contoso.example>", "first")).await.unwrap();
    session.append("INBOX", None, None, mail("Shop <deals@shop.example>", "offer one")).await.unwrap();
    session.append("INBOX", None, None, mail("Shop <deals@shop.example>", "offer two")).await.unwrap();
    sync::sync_headers(&db, &mut session, account, &Silent).await.unwrap();
    let inbox = db::folder_by_role(&db::lock(&db), account, "inbox").unwrap().unwrap().0;
    let subjects = |folder: i64| -> Vec<String> {
        let mut list: Vec<String> = db::list_messages(&db::lock(&db), folder, None, 50, 0, i64::MAX).unwrap().into_iter().map(|m| m.subject).collect();
        list.sort();
        list
    };
    assert_eq!(subjects(inbox), ["first", "offer one", "offer two"]);

    // Now the rule is written, and run over what is already here.
    db::save_rule(&db::lock(&db), &rule("shop", "deals@shop.example", "category", "Blue")).unwrap();
    let swept = sweep_with_deadline(&db, Some(account), 1_700_000_000).await;
    assert_eq!(swept, rules::Sweep { checked: 3, matched: 2 });

    // The category is on the two shop messages and none of the others.
    let with_category = |subject: &str| -> Vec<String> {
        db::list_messages(&db::lock(&db), inbox, None, 50, 0, i64::MAX)
            .unwrap()
            .into_iter()
            .find(|m| m.subject == subject)
            .map(|m| m.categories)
            .unwrap_or_default()
    };
    assert_eq!(with_category("offer two"), ["Blue"]);
    assert!(with_category("first").is_empty());

    // Running it again changes nothing: the same two messages still match.
    assert_eq!(sweep_with_deadline(&db, Some(account), 1_700_000_001).await, rules::Sweep { checked: 3, matched: 2 });
}

#[tokio::test]
async fn a_moving_rule_takes_the_mail_out_of_the_inbox() {
    let Ok(target) = std::env::var("OPENWREN_TEST_IMAP") else {
        eprintln!("OPENWREN_TEST_IMAP not set; skipping");
        return;
    };
    let (host, port) = target.split_once(':').unwrap();
    let user = format!("mover-{}@work.test", std::process::id());
    let settings = ImapSettings { host: host.into(), port: port.parse().unwrap(), security: Security::None, username: user.clone() };
    let db: Db = Arc::new(Mutex::new(store::open_in_memory().unwrap()));
    let account = db::insert_account(&db::lock(&db), &user, "Mover", "imap", &AccountSettings { imap: Some(settings.clone()), ..Default::default() }).unwrap();
    let mut session = imap::connect(&settings, "pass").await.unwrap();
    let mail = |from: &str, subject: &str| format!("From: {from}\r\nTo: {user}\r\nSubject: {subject}\r\nMessage-ID: <{subject}@openwren.test>\r\n\r\nHello\r\n");
    session.append("INBOX", None, None, mail("Friend <friend@contoso.example>", "keep me")).await.unwrap();
    session.append("INBOX", None, None, mail("News <news@letters.example>", "read me later")).await.unwrap();
    sync::sync_headers(&db, &mut session, account, &Silent).await.unwrap();

    // A move rule needs a folder to move to; every account has Junk after its first sync.
    let junk = db::folder_by_role(&db::lock(&db), account, "junk").unwrap().map(|f| f.0);
    assert!(junk.is_some(), "the account has a junk folder to move into");
    db::save_rule(&db::lock(&db), &rule("letters", "news@letters.example", "move", "Junk")).unwrap();
    assert_eq!(sweep_with_deadline(&db, None, 1_700_000_000).await, rules::Sweep { checked: 2, matched: 1 });

    let inbox = db::folder_by_role(&db::lock(&db), account, "inbox").unwrap().unwrap().0;
    let subjects = |folder: i64| -> Vec<String> { db::list_messages(&db::lock(&db), folder, None, 50, 0, i64::MAX).unwrap().into_iter().map(|m| m.subject).collect() };
    assert_eq!(subjects(inbox), ["keep me"]);
    assert_eq!(subjects(junk.unwrap()), ["read me later"]);

    // Second run finds nothing left to do, because the inbox is what rules look at.
    assert_eq!(sweep_with_deadline(&db, None, 1_700_000_001).await, rules::Sweep { checked: 1, matched: 0 });
}
