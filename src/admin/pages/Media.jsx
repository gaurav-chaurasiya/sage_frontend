import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Image, Trash2 } from "lucide-react";
import api, { apiError, mediaUrl } from "../../api/client";
import { Badge, Card, Empty, ErrorNote, PageHead, Pager, Skeleton, Tabs, timeAgo, useAdmin, useFetch } from "../ui";

export function Verification() {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const { toast } = useAdmin();
  const { data, loading, error, reload } = useFetch("/admin/verifications/", { status, page, page_size: 12 });

  const toggle = async (row) => {
    try {
      await api.patch(`/admin/users/${row.member.id}/`, { action: row.blue_tick ? "unverify" : "verify" });
      toast(row.blue_tick ? "Blue tick removed" : "Blue tick granted");
      reload(true);
    } catch (e) {
      toast(apiError(e, "Action failed"), "danger");
    }
  };

  return (
    <>
      <PageHead title="Verification" sub="Compare each live selfie with the member's main photo. Remove the blue tick if they don't match." />
      <Tabs
        items={[
          { key: "all", label: "All selfies" },
          { key: "verified", label: "Blue tick" },
          { key: "pending", label: "No blue tick" },
        ]}
        value={status}
        onChange={(k) => {
          setStatus(k);
          setPage(1);
        }}
      />
      <ErrorNote text={error} onRetry={reload} />
      {loading && !data ? (
        <Skeleton rows={6} />
      ) : data?.results?.length ? (
        <div className="adm-verify-grid">
          {data.results.map((r) => (
            <article key={r.profile_id} className="adm-card adm-verify">
              <div className="adm-verify-pair">
                <figure>
                  <img src={mediaUrl(r.selfie)} alt="Live selfie" referrerPolicy="no-referrer" />
                  <figcaption>Live selfie</figcaption>
                </figure>
                <figure>
                  {r.photo ? <img src={mediaUrl(r.photo)} alt="Main photo" referrerPolicy="no-referrer" /> : <div className="adm-noimg">No photo</div>}
                  <figcaption>Main photo</figcaption>
                </figure>
              </div>
              <div className="adm-verify-foot">
                <div>
                  <Link to={`/admin/members/${r.member.id}`}>
                    <strong>{r.member.full_name}</strong>
                  </Link>
                  <span className="adm-mono adm-muted">{r.profile_id}</span>
                </div>
                {r.blue_tick ? <Badge tone="info">Blue tick</Badge> : <Badge tone="neutral">Not verified</Badge>}
              </div>
              <button className={`adm-btn block ${r.blue_tick ? "danger-outline" : "primary"}`} onClick={() => toggle(r)}>
                <BadgeCheck size={15} /> {r.blue_tick ? "Remove blue tick" : "Give blue tick"}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <Card>
          <Empty icon={BadgeCheck} title="No selfies yet" text="When members complete the live-selfie check, they appear here." />
        </Card>
      )}
      <Pager page={data?.page || 1} pages={data?.pages || 1} count={data?.count || 0} size={12} label="selfies" onPage={setPage} />
    </>
  );
}

export function Photos() {
  const [page, setPage] = useState(1);
  const { toast, confirm } = useAdmin();
  const { data, loading, error, reload } = useFetch("/admin/photos/", { page, page_size: 24 });

  const remove = async (p) => {
    const ok = await confirm({
      title: "Remove this photo?",
      text: `${p.member?.full_name} will be told a photo didn't meet the community guidelines.`,
      confirmLabel: "Remove photo",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/photos/${p.id}/`);
      toast("Photo removed · member notified");
      reload(true);
    } catch (e) {
      toast(apiError(e, "Could not remove"), "danger");
    }
  };

  return (
    <>
      <PageHead title="Photos" sub="Newest uploads first. Remove anything fake, explicit or not a real person." />
      <ErrorNote text={error} onRetry={reload} />
      {loading && !data ? (
        <Skeleton rows={6} />
      ) : data?.results?.length ? (
        <div className="adm-photo-grid">
          {data.results.map((p) => (
            <figure key={p.id} className="adm-photo">
              <a href={mediaUrl(p.url)} target="_blank" rel="noreferrer">
                <img src={mediaUrl(p.url)} alt={p.member?.full_name} loading="lazy" referrerPolicy="no-referrer" />
              </a>
              {p.is_primary && <span className="adm-photo-tag">Main</span>}
              <figcaption>
                <div>
                  <Link to={`/admin/members/${p.member?.id}`}>{p.member?.full_name}</Link>
                  <small>{timeAgo(p.created_at)}</small>
                </div>
                <button className="adm-icon-btn danger" aria-label="Remove photo" onClick={() => remove(p)}>
                  <Trash2 size={15} />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <Card>
          <Empty icon={Image} title="No photos uploaded yet" />
        </Card>
      )}
      <Pager page={data?.page || 1} pages={data?.pages || 1} count={data?.count || 0} size={24} label="photos" onPage={setPage} />
    </>
  );
}
