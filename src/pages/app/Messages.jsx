import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Ban, Check, CheckCheck, Flag, MessageCircle, Paperclip, Send, X } from "lucide-react";
import api, { asArray, apiError, mediaUrl } from "../../api/client";
import { subscribeRealtime } from "../../api/realtime";
import { useAuth } from "../../store/auth";
import OnlineRail from "../../components/OnlineRail";
import ProfilePhoto from "../../components/ProfilePhoto";
import { ChatSkeleton } from "../../components/Loading";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function when(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function attachmentIsImage(message) {
  if (!message?.attachment) return false;
  if (message.attachment_type === "image") return true;
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(message.attachment);
}

function MessageStatus({ read }) {
  return (
    <span className={`msg-status ${read ? "read" : ""}`} title={read ? "Seen" : "Sent"} aria-label={read ? "Seen" : "Sent"}>
      {read ? <CheckCheck size={14} strokeWidth={2.4} /> : <Check size={14} strokeWidth={2.4} />}
    </span>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(params.get("c"));
  const [messages, setMessages] = useState([]);
  const [presence, setPresence] = useState("offline");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [attach, setAttach] = useState(null);
  const [booting, setBooting] = useState(true);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);
  const [safety, setSafety] = useState(""); // "", "report"
  const [reason, setReason] = useState("fake_profile");
  const [details, setDetails] = useState("");
  const bottom = useRef(null);
  const lastId = useRef(null);
  const fileRef = useRef(null);

  const loadConvos = async () => {
    try {
      const { data } = await api.get("/conversations/");
      const list = asArray(data);
      setConvos(list);
      setActive((current) => current || params.get("c") || list[0]?.id || null);
    } catch {
      setConvos([]);
    } finally {
      setBooting(false);
    }
  };

  const loadMessages = async (id, mode = "full") => {
    if (!id) return;
    try {
      const params = mode === "incremental" && lastId.current ? { after: lastId.current } : {};
      const { data } = await api.get(`/conversations/${id}/messages/`, { params });
      const rows = asArray(data?.results ?? data);
      setPresence(data?.other_presence || "offline");
      if (mode === "incremental") {
        if (rows.length) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => String(m.id)));
            const extra = rows.filter((m) => !seen.has(String(m.id)));
            return extra.length ? [...prev, ...extra] : prev;
          });
          lastId.current = rows[rows.length - 1].id;
        }
      } else {
        setMessages(rows);
        lastId.current = rows.length ? rows[rows.length - 1].id : null;
      }
    } catch {
      if (mode !== "incremental") setMessages([]);
    }
  };

  useEffect(() => {
    loadConvos();
    // WebSocket pushes new-message events instantly; this is just a safety
    // net in case a frame gets dropped (network blip, tab was asleep).
    const tick = () => {
      if (!document.hidden) loadConvos();
    };
    const id = setInterval(tick, 60000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  useEffect(() => {
    if (params.get("c")) setActive(params.get("c"));
  }, [params]);

  useEffect(() => {
    if (!active) return undefined;
    lastId.current = null;
    loadMessages(active);
    // Same safety-net idea as above - the open thread is otherwise kept
    // current purely by the WebSocket subscription below.
    const tick = () => {
      if (!document.hidden) loadMessages(active, "incremental");
    };
    const id = setInterval(tick, 45000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [active]);

  // Live delivery over the shared WebSocket: append messages for the open
  // thread instantly, and bump the conversation list for any conversation.
  useEffect(() => {
    const unsubscribe = subscribeRealtime((type, data) => {
      const here = String(data?.conversation_id) === String(active);
      if (type === "typing" && here) {
        setTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 4000);
        return;
      }
      if (type === "read" && here) {
        setMessages((prev) => prev.map((m) => (m.mine || m.sender_id === user?.id ? { ...m, is_read: true } : m)));
        return;
      }
      if (type !== "message") return;
      loadConvos();
      if (here) {
        setTyping(false);
        setMessages((prev) => {
          if (prev.some((m) => String(m.id) === String(data.id))) return prev;
          lastId.current = data.id;
          return [...prev, data];
        });
        // We're looking at it: tell the sender it was seen.
        if (!document.hidden) api.post(`/conversations/${active}/read/`).catch(() => {});
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (attach?.preview) URL.revokeObjectURL(attach.preview);
    };
  }, [attach]);

  const clearAttach = () => {
    setAttach((current) => {
      if (current?.preview) URL.revokeObjectURL(current.preview);
      return null;
    });
  };

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("File must be under 8 MB.");
      return;
    }
    setError("");
    setAttach((current) => {
      if (current?.preview) URL.revokeObjectURL(current.preview);
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      return {
        file,
        preview,
        name: file.name,
        isImage: file.type.startsWith("image/"),
      };
    });
  };

  const send = async (e) => {
    e.preventDefault();
    if (!active || sending) return;
    const text = body.trim();
    const file = attach?.file;
    if (!text && !file) return;
    setBody("");
    const pending = attach;
    setAttach(null);
    setError("");
    setSending(true);
    try {
      let data;
      if (file) {
        const form = new FormData();
        if (text) form.append("body", text);
        form.append("file", file);
        ({ data } = await api.post(`/conversations/${active}/messages/`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        }));
      } else {
        ({ data } = await api.post(`/conversations/${active}/messages/`, { body: text }));
      }
      if (pending?.preview) URL.revokeObjectURL(pending.preview);
      setMessages((m) => [...m, data]);
      lastId.current = data.id;
      loadConvos();
    } catch (err) {
      setBody(text);
      if (pending) setAttach(pending);
      setError(apiError(err, "Message could not be sent."));
    } finally {
      setSending(false);
    }
  };

  const current = convos.find((c) => String(c.id) === String(active));

  if (booting) return <ChatSkeleton />;

  const reportOther = async (e) => {
    e.preventDefault();
    try {
      await api.post("/reports/", { public_id: current.other.public_id, reason, details });
      setSafety("");
      setDetails("");
      setError("Thanks — our team will review this report.");
    } catch (err) {
      setError(apiError(err, "Could not send report."));
    }
  };
  const blockOther = async () => {
    if (!window.confirm(`Block ${current.other?.name || "this member"}? They won't be able to message you.`)) return;
    try {
      await api.post("/blocks/", { public_id: current.other.public_id });
      setActive(null);
      setMessages([]);
      loadConvos();
    } catch (err) {
      setError(apiError(err, "Could not block."));
    }
  };

  return (
    <div className="discover search-wide">
      <div className="discover-main">
      <div className={`chat-shell ${active ? "room" : "list"}`}>
        <div className="chat-list glass">
          <div className="chat-list-head">
            <strong>Chats</strong>
          </div>
          <div className="chat-list-scroll">
            {convos.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(c.id)}
                className={`chat-row ${String(c.id) === String(active) ? "on" : ""}`}
              >
                <span className="chat-avatar">
                  <ProfilePhoto photo={c.other?.photo} name={c.other?.name} />
                  <i className={c.other?.presence === "online" ? "on" : ""} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{c.other?.name}</strong>
                  <p className="muted" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.last_message || "Say hello"}
                  </p>
                </div>
                {c.unread > 0 && <span className="nav-badge">{c.unread}</span>}
              </button>
            ))}
            {!convos.length && (
              <p className="muted" style={{ padding: 12 }}>
                No chats yet. Send an interest — when it's accepted, your chat opens here.
              </p>
            )}
          </div>
        </div>
        <div className="chat-room glass">
          {current ? (
            <>
              <div className="chat-room-head">
                <button type="button" className="icon-btn chat-back" onClick={() => setActive(null)} aria-label="Back">
                  <ArrowLeft size={16} />
                </button>
                <span className="chat-avatar">
                  <ProfilePhoto photo={current.other?.photo} name={current.other?.name} />
                  <i className={presence === "online" ? "on" : ""} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{current.other?.name}</strong>
                  <p className="muted" style={{ fontSize: 12 }}>{typing ? <span className="typing-note">typing…</span> : presence === "online" ? "Online now" : "Offline"}</p>
                </div>
                {current.other?.public_id && (
                  <>
                    <Link className="btn btn-ghost btn-sm" to={`/app/profile/${current.other.public_id}`}>
                      Profile
                    </Link>
                    <button type="button" className="icon-btn" title="Report" aria-label="Report member" onClick={() => setSafety(safety ? "" : "report")}>
                      <Flag size={15} />
                    </button>
                    <button type="button" className="icon-btn" title="Block" aria-label="Block member" onClick={blockOther}>
                      <Ban size={15} />
                    </button>
                  </>
                )}
              </div>
              {safety === "report" && (
                <form className="chat-report" onSubmit={reportOther}>
                  <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
                    <option value="fake_profile">Fake profile</option>
                    <option value="harassment">Harassment or abuse</option>
                    <option value="fraud">Asking for money / fraud</option>
                    <option value="inappropriate">Inappropriate content</option>
                    <option value="other">Other</option>
                  </select>
                  <input className="input" placeholder="What happened? (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
                  <button className="btn btn-primary btn-sm">Send report</button>
                </form>
              )}
              <div className="chat-thread">
                {messages.map((m) => {
                  const mine = m.mine || m.sender_id === user?.id;
                  return (
                  <div key={m.id} className={`bubble ${mine ? "mine" : "theirs"}`}>
                    {m.attachment && attachmentIsImage(m) ? (
                      <a className="chat-attach-img-wrap" href={mediaUrl(m.attachment)} target="_blank" rel="noreferrer">
                        <img src={mediaUrl(m.attachment)} alt={m.attachment_name || "Shared photo"} className="chat-attach-img" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      </a>
                    ) : null}
                    {m.attachment && !attachmentIsImage(m) ? (
                      <a className="chat-attach-file" href={mediaUrl(m.attachment)} target="_blank" rel="noreferrer">
                        📎 {m.attachment_name || "Download file"}
                      </a>
                    ) : null}
                    {m.body ? <p className="chat-text">{m.body}</p> : null}
                    <div className="bubble-meta">
                      <time>{when(m.created_at)}</time>
                      {mine ? <MessageStatus read={Boolean(m.is_read)} /> : null}
                    </div>
                  </div>
                  );
                })}
                <div ref={bottom} />
              </div>
              {error && <p className="notice" style={{ margin: "0 14px 8px" }}>{error}</p>}
              {attach && (
                <div className="chat-attach-preview">
                  {attach.isImage ? (
                    <img src={attach.preview} alt="" />
                  ) : (
                    <span className="chat-attach-file">📎 {attach.name}</span>
                  )}
                  <button type="button" className="icon-btn" onClick={clearAttach} aria-label="Remove attachment">
                    <X size={14} />
                  </button>
                </div>
              )}
              <form className="chat-composer" onSubmit={send}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  hidden
                  onChange={pickFile}
                />
                <button
                  type="button"
                  className="icon-btn chat-attach-btn"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Attach image or file"
                  disabled={sending}
                >
                  <Paperclip size={18} />
                </button>
                <input
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    const now = Date.now();
                    if (active && e.target.value && now - lastTypingSent.current > 3000) {
                      lastTypingSent.current = now;
                      api.post(`/conversations/${active}/typing/`).catch(() => {});
                    }
                  }}
                  placeholder={`Message ${current.other?.name?.split(" ")[0] || ""}`}
                  autoComplete="off"
                />
                <button type="submit" className="btn btn-primary" disabled={(!body.trim() && !attach) || sending} aria-label="Send">
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div className="chat-empty">
              <span className="chat-empty-icon">
                <MessageCircle size={26} />
              </span>
              <h3>{convos.length ? "Pick a conversation" : "Your chats live here"}</h3>
              <p className="muted">
                {convos.length
                  ? "Choose someone on the left to continue the conversation."
                  : "Chat opens once a member accepts your interest. Gold members and above can message directly."}
              </p>
              {!convos.length && (
                <Link className="btn btn-primary" to="/app/matches">
                  Find matches
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
      <OnlineRail />
    </div>
  );
}
